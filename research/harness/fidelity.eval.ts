/**
 * Grading Fidelity Score (GFS) evaluation.
 *
 * For a seeded corpus of generated problems across every generatable topic,
 * this measures:
 *   - accept-rate: fraction of correct, keyboard-typeable answer variants
 *     that validateAnswer() accepts
 *   - reject-rate: fraction of clearly-wrong probe answers it rejects
 *   GFS = 100 * (0.7 * acceptRate + 0.3 * rejectRate)
 *
 * The reject component exists so an experiment cannot raise GFS by making
 * the grader more permissive across the board. Every problem gets at least
 * one reject probe (a zero-probe topic used to score a perfect 100% reject
 * rate), and the run fails if any topic ends up without accept AND reject
 * probes.
 *
 * Caveat that the score cannot remove: most accept probes are derived from
 * the generator's own answer key, so GFS measures grading FIDELITY (does the
 * grader accept what the generator meant?), not mathematical CORRECTNESS of
 * the key. Correctness is covered by the independent recomputation tests in
 * services/mathService.test.ts.
 *
 * Determinism: generators are seeded (generateProblem(topic, {}, seed)) with
 * seed = `${SEED}:${index}`, so two runs against identical generator code
 * produce an identical corpus. Latency stats are also collected as a
 * guardrail metric.
 *
 * Probes are derived from the typed answer contract (AnswerSpec): the
 * canonical input and wrongInputs() from services/grading/canonical.ts, plus
 * kind-specific variants a student would plausibly type.
 *
 * Output: atomic JSON write to $RESEARCH_OUT (default research/out/metrics.json).
 * Run via:  npx vitest run --config research/harness/vitest.config.mts
 */
import { describe, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { generateProblem, validateAnswer } from '../../services/mathService';
import { GENERATORS } from '../../services/generators';
import { canonicalInput, wrongInputs } from '../../services/grading';
import type { AnswerSpec, Interval, Problem, TopicId } from '../../types';

const SEED = Number(process.env.RESEARCH_SEED ?? 20260716);
const N_PER_TOPIC = Number(process.env.RESEARCH_N ?? 40);
const OUT_FILE = process.env.RESEARCH_OUT ?? 'research/out/metrics.json';
const LABEL = process.env.RESEARCH_LABEL ?? 'adhoc';

const TOPICS: TopicId[] = [...GENERATORS.keys()];

// --- probe construction -------------------------------------------------
interface Probe {
  input: string | string[]; // string[] for multipart answers (one entry per part)
  kind: 'accept' | 'reject';
  label: string; // stable identifier for aggregation, e.g. "expr-ascii-ineq"
}

const endpoint = (v: number) => (v === Infinity ? 'inf' : v === -Infinity ? '-inf' : String(v));
const intervalNotation = (set: Interval[]) =>
  set.map(iv => `${iv.loClosed ? '[' : '('}${endpoint(iv.lo)}, ${endpoint(iv.hi)}${iv.hiClosed ? ']' : ')'}`).join(' U ');
const FLIP: Record<string, string> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };

/** Kind-specific probes for one (non-multipart) spec; `accept` is its canonical input. */
function specProbes(spec: AnswerSpec, problem: Problem, accept: string): Probe[] {
  const probes: Probe[] = [];
  switch (spec.kind) {
    case 'number': {
      if (spec.tolerance.kind === 'decimalPlaces') {
        const places = spec.tolerance.places;
        const unit = Math.pow(10, -places);
        probes.push({ input: String(spec.value), kind: 'accept', label: 'dec-unrounded' });
        const rounded = Number(spec.value.toFixed(places));
        probes.push({ input: (rounded + 2 * unit).toFixed(places), kind: 'reject', label: 'dec-misrounded' });
        if (problem.problemText.includes('\\pi \\approx 3.14')) {
          // told to use 3.14: the true-π value is a different answer
          const truePi = spec.value * (Math.PI / 3.14);
          if (Math.abs(truePi - spec.value) > unit) {
            probes.push({ input: truePi.toFixed(places), kind: 'reject', label: 'dec-true-pi' });
          }
        }
      } else if (spec.unit === 'degree') {
        probes.push({ input: `${spec.value}°`, kind: 'accept', label: 'num-degree-sign' });
      }
      break;
    }
    case 'fraction': {
      const doubled = `${spec.numerator * 2}/${spec.denominator * 2}`;
      probes.push(spec.lowestTerms
        ? { input: doubled, kind: 'reject', label: 'frac-not-lowest-terms' }
        : { input: doubled, kind: 'accept', label: 'frac-unsimplified' });
      break;
    }
    case 'interval': {
      probes.push({ input: intervalNotation(spec.set), kind: 'accept', label: 'set-interval-notation' });
      const m = accept.match(/^(\w+) (<=|>=|<|>) (.+)$/);
      if (m) {
        const [, v, op, c] = m;
        probes.push({ input: `${c} ${FLIP[op]} ${v}`, kind: 'accept', label: 'set-flipped-sides' });
        probes.push({ input: `${v} ${FLIP[op]} ${c}`, kind: 'reject', label: 'set-wrong-direction' });
        probes.push({ input: `${v} ${op.includes('=') ? op[0] : `${op}=`} ${c}`, kind: 'reject', label: 'set-wrong-closedness' });
      }
      break;
    }
    case 'finiteSet':
      if (spec.elements.length > 1) {
        probes.push({ input: [...spec.elements].reverse().join(', '), kind: 'accept', label: 'roots-reordered' });
        probes.push({ input: String(spec.elements[0]), kind: 'reject', label: 'roots-incomplete' });
      }
      break;
    case 'expression':
      for (const name of spec.assignable ?? []) {
        probes.push({ input: `${name} = ${spec.reference}`, kind: 'accept', label: 'expr-assigned' });
      }
      break;
    case 'antiderivative':
      probes.push({ input: `${accept} + C`, kind: 'accept', label: 'anti-plus-c' });
      probes.push({ input: `${accept} + 7`, kind: 'accept', label: 'anti-shifted' });
      break;
    case 'choice':
      probes.push({ input: spec.answer.toUpperCase(), kind: 'accept', label: 'choice-case-insensitive' });
      break;
    default:
      break;
  }
  return probes;
}

function buildProbes(p: Problem): Probe[] {
  const canonical = canonicalInput(p.answer);
  const probes: Probe[] = [{ input: canonical, kind: 'accept', label: `${p.answer.kind}-canonical` }];
  for (const wrong of wrongInputs(p.answer)) probes.push({ input: wrong, kind: 'reject', label: `${p.answer.kind}-wrong` });
  const spec = p.answer.kind === 'anyOf' ? p.answer.options[0] : p.answer;
  if (spec.kind === 'multipart') {
    // a single string is never a multipart answer
    probes.push({ input: (canonical as string[]).join(' '), kind: 'reject', label: 'multipart-flattened' });
  } else if (typeof canonical === 'string') {
    probes.push(...specProbes(spec, p, canonical));
    probes.push({ input: '0/0', kind: 'reject', label: 'undefined-input' });
  }
  return probes;
}

// --- aggregation ---------------------------------------------------------
interface Tally { pass: number; total: number; }
const rate = (t: Tally) => (t.total === 0 ? 1 : t.pass / t.total);
const pct = (n: number) => Math.round(n * 10000) / 100;
const p95 = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
};
const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const round2 = (n: number) => Math.round(n * 100) / 100;

describe('grading fidelity evaluation', () => {
  it('measures GFS across the seeded corpus and writes metrics JSON', () => {
    const t0 = performance.now();
    const genTimes: number[] = [];
    const valTimes: number[] = [];
    let genErrors = 0;

    const perTopic: Record<string, {
      accept: Tally; reject: Tally;
      failByLabel: Record<string, number>;
    }> = {};
    const failures: Array<{
      topic: string; kind: string; label: string; input: string | string[];
      problemText: string; answer: unknown; seed: string;
    }> = [];
    const totals = { accept: { pass: 0, total: 0 }, reject: { pass: 0, total: 0 } };

    {
      for (const topic of TOPICS) {
        const t = { accept: { pass: 0, total: 0 }, reject: { pass: 0, total: 0 }, failByLabel: {} as Record<string, number> };
        perTopic[topic] = t;
        for (let i = 0; i < N_PER_TOPIC; i++) {
          let problem: Problem;
          try {
            const g0 = performance.now();
            problem = generateProblem(topic, {}, `${SEED}:${i}`);
            genTimes.push(performance.now() - g0);
          } catch {
            genErrors++;
            continue;
          }
          for (const probe of buildProbes(problem)) {
            let accepted = false;
            try {
              const v0 = performance.now();
              accepted = validateAnswer(problem, probe.input);
              valTimes.push(performance.now() - v0);
            } catch {
              accepted = false; // a throwing grader rejects, effectively
            }
            const ok = probe.kind === 'accept' ? accepted : !accepted;
            const tally = probe.kind === 'accept' ? t.accept : t.reject;
            tally.total++;
            const globalTally = probe.kind === 'accept' ? totals.accept : totals.reject;
            globalTally.total++;
            if (ok) {
              tally.pass++;
              globalTally.pass++;
            } else {
              t.failByLabel[probe.label] = (t.failByLabel[probe.label] ?? 0) + 1;
              if (failures.length < 120) {
                failures.push({
                  topic, kind: probe.kind, label: probe.label, input: probe.input,
                  problemText: problem.problemText, answer: problem.answer, seed: problem.seed,
                });
              }
            }
          }
        }
      }
    }

    // Coverage guard: a topic with no reject (or no accept) probes would score
    // a vacuous 100% on that component. Fail loudly instead.
    const uncovered = Object.entries(perTopic)
      .filter(([, t]) => t.accept.total === 0 || t.reject.total === 0)
      .map(([topic]) => topic);
    if (uncovered.length > 0) {
      throw new Error(`topics without both accept and reject probes: ${uncovered.join(', ')}`);
    }

    const acceptRate = rate(totals.accept);
    const rejectRate = rate(totals.reject);
    const gfs = round2(100 * (0.7 * acceptRate + 0.3 * rejectRate));

    let gitHead = 'unknown';
    try { gitHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { /* detached env */ }

    const report = {
      schema: 1,
      label: LABEL,
      generated_at: new Date().toISOString(),
      git_head: gitHead,
      seed: SEED,
      n_per_topic: N_PER_TOPIC,
      totals: {
        gfs,
        accept_rate_pct: pct(acceptRate),
        reject_rate_pct: pct(rejectRate),
        accept: totals.accept,
        reject: totals.reject,
        gen_errors: genErrors,
      },
      latency: {
        gen_ms_mean: round2(mean(genTimes)),
        gen_ms_p95: round2(p95(genTimes)),
        val_ms_mean: round2(mean(valTimes)),
        val_ms_p95: round2(p95(valTimes)),
        wall_ms: Math.round(performance.now() - t0),
      },
      per_topic: Object.fromEntries(
        Object.entries(perTopic).map(([topic, t]) => [topic, {
          gfs: round2(100 * (0.7 * rate(t.accept) + 0.3 * rate(t.reject))),
          accept: t.accept,
          reject: t.reject,
          fail_by_label: t.failByLabel,
        }]),
      ),
      failures_sample: failures,
    };

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    const tmp = `${OUT_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(report, null, 2));
    fs.renameSync(tmp, OUT_FILE); // atomic: a killed run never leaves a torn file

    // eslint-disable-next-line no-console
    console.log(`GFS=${gfs} accept=${pct(acceptRate)}% reject=${pct(rejectRate)}% genErrors=${genErrors} -> ${OUT_FILE}`);
  }, 300_000);
});
