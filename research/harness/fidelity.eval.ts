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
 * the grader more permissive across the board.
 *
 * Determinism: Math.random is replaced with a mulberry32 PRNG re-seeded per
 * (topic, index), so two runs against identical generator code produce an
 * identical corpus. Latency stats are also collected as a guardrail metric.
 *
 * Output: atomic JSON write to $RESEARCH_OUT (default research/out/metrics.json).
 * Run via:  npx vitest run --config research/harness/vitest.config.mts
 */
import { describe, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { generateProblem, validateAnswer, simplifyFraction } from '../../services/mathService';
import type { Problem, FractionAnswer, TopicId } from '../../types';

const SEED = Number(process.env.RESEARCH_SEED ?? 20260716);
const N_PER_TOPIC = Number(process.env.RESEARCH_N ?? 40);
const OUT_FILE = process.env.RESEARCH_OUT ?? 'research/out/metrics.json';
const LABEL = process.env.RESEARCH_LABEL ?? 'adhoc';

const TOPICS: TopicId[] = [
  'addition', 'subtraction', 'multiplication', 'division',
  'simple-linear-equations', 'fractions-basic', 'decimals', 'order-of-operations', 'integers',
  'multi-step-equations', 'inequalities', 'systems-of-equations', 'exponents',
  'polynomials', 'factoring', 'quadratic-equations',
  'angles', 'triangles', 'pythagorean-theorem', 'area-perimeter', 'circles', 'volume-surface-area',
  'complex-numbers', 'rational-expressions', 'radicals', 'logarithms', 'sequences-series',
  'trig-ratios', 'trig-special-angles', 'trig-identities', 'trig-equations', 'inverse-trig',
  'functions', 'polynomial-functions', 'rational-functions', 'exponential-functions', 'conic-sections',
  'limits', 'derivatives-basic', 'derivatives-product-quotient', 'chain-rule',
  'integrals-basic', 'integration-substitution',
  'integration-by-parts', 'trig-integrals', 'partial-fractions', 'improper-integrals',
  'sequences', 'series-convergence', 'power-series', 'taylor-maclaurin',
  'parametric-equations', 'polar-coordinates', 'integration-applications', 'trig-substitution',
];

// --- deterministic RNG -------------------------------------------------
const mulberry32 = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// --- probe construction -------------------------------------------------
interface Probe {
  input: string;
  kind: 'accept' | 'reject';
  label: string; // stable identifier for aggregation, e.g. "expr-ascii-ineq"
}

const INEQ_RE = /^(.+?)(<=|>=|≤|≥|<|>)(.+)$/;
const OPPOSITE: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '<=': '>=', '>=': '<=' };

function buildProbes(p: Problem): Probe[] {
  const probes: Probe[] = [];
  switch (p.answerType) {
    case 'numeric': {
      const ans = p.correctAnswer as number;
      probes.push({ input: String(ans), kind: 'accept', label: 'num-canonical' });
      // a "wrong" probe must not collide with a legitimately acceptable
      // alternate (e.g. the other root of a quadratic)
      const acceptable = new Set<number>([ans, ...(p.acceptableAnswers ?? []).filter((a): a is number => typeof a === 'number')]);
      const wrong = [ans + 1, ans - 1, ans + 2, ans + 3].find((w) => !acceptable.has(w));
      if (wrong !== undefined) {
        probes.push({ input: String(wrong), kind: 'reject', label: 'num-off-by-one' });
      }
      break;
    }
    case 'decimal-tolerance': {
      const ans = p.correctAnswer as number;
      probes.push({ input: String(ans), kind: 'accept', label: 'dec-canonical' });
      const usesPi = p.problemText.includes('\\pi');
      const delta = usesPi ? 2.0 : 0.4;
      probes.push({
        input: String(Math.round((ans + delta) * 1000) / 1000),
        kind: 'reject',
        label: usesPi ? 'dec-wrong-pi' : 'dec-wrong-nearmiss',
      });
      break;
    }
    case 'fraction': {
      const f = p.correctAnswer as FractionAnswer;
      probes.push({ input: `${f.numerator}/${f.denominator}`, kind: 'accept', label: 'frac-as-stored' });
      probes.push({ input: `${f.numerator * 2}/${f.denominator * 2}`, kind: 'accept', label: 'frac-unsimplified' });
      const s = simplifyFraction(f.numerator, f.denominator);
      if (s.numerator !== f.numerator || s.denominator !== f.denominator) {
        probes.push({ input: `${s.numerator}/${s.denominator}`, kind: 'accept', label: 'frac-simplified' });
      }
      // same denominator, numerator shifted by denominator => value off by exactly 1
      probes.push({ input: `${f.numerator + f.denominator}/${f.denominator}`, kind: 'reject', label: 'frac-off-by-one' });
      break;
    }
    case 'expression': {
      const stored = String(p.correctAnswer);
      probes.push({ input: stored, kind: 'accept', label: 'expr-as-stored' });
      const ascii = stored.replace(/≤/g, '<=').replace(/≥/g, '>=');
      const m = stored.replace(/\s/g, '').match(INEQ_RE);
      if (ascii !== stored) {
        // H1 territory: the only keyboard-typeable form of a ≤/≥ answer
        probes.push({ input: ascii, kind: 'accept', label: 'expr-ascii-ineq' });
      }
      if (m) {
        const [, lhs, op, rhs] = m;
        probes.push({ input: `${rhs} ${OPPOSITE[op] ?? op} ${lhs}`, kind: 'accept', label: 'expr-flipped-sides' });
        probes.push({ input: `${lhs} ${OPPOSITE[op] ?? op} ${rhs}`, kind: 'reject', label: 'expr-wrong-direction' });
      } else {
        if (p.topicId === 'integration-substitution') {
          probes.push({ input: `u = ${stored}`, kind: 'accept', label: 'expr-u-equals-prefix' });
        }
        const bumped = stored.replace(/\d+/, (n) => String(Number(n) + 1));
        if (bumped !== stored) {
          probes.push({ input: bumped, kind: 'reject', label: 'expr-bumped-constant' });
        }
      }
      break;
    }
    case 'coordinate': {
      const c = p.correctAnswer as { x: number; y: number };
      probes.push({ input: `(${c.x}, ${c.y})`, kind: 'accept', label: 'coord-parens' });
      probes.push({ input: `${c.x},${c.y}`, kind: 'accept', label: 'coord-bare' });
      probes.push(
        c.x !== c.y
          ? { input: `(${c.y}, ${c.x})`, kind: 'reject', label: 'coord-swapped' }
          : { input: `(${c.x + 1}, ${c.y})`, kind: 'reject', label: 'coord-shifted' },
      );
      break;
    }
    case 'multiple-choice': {
      const ans = String(p.correctAnswer);
      probes.push({ input: ans, kind: 'accept', label: 'mc-correct' });
      probes.push({ input: ans === 'A' ? 'B' : 'A', kind: 'reject', label: 'mc-wrong' });
      break;
    }
    default:
      break;
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
    const realRandom = Math.random;
    const genTimes: number[] = [];
    const valTimes: number[] = [];
    let genErrors = 0;

    const perTopic: Record<string, {
      accept: Tally; reject: Tally;
      failByLabel: Record<string, number>;
    }> = {};
    const failures: Array<{
      topic: string; kind: string; label: string; input: string;
      problemText: string; correctAnswer: unknown;
    }> = [];
    const totals = { accept: { pass: 0, total: 0 }, reject: { pass: 0, total: 0 } };

    try {
      for (const topic of TOPICS) {
        const t = { accept: { pass: 0, total: 0 }, reject: { pass: 0, total: 0 }, failByLabel: {} as Record<string, number> };
        perTopic[topic] = t;
        for (let i = 0; i < N_PER_TOPIC; i++) {
          Math.random = mulberry32(hashStr(topic) ^ (SEED + i * 7919));
          let problem: Problem;
          try {
            const g0 = performance.now();
            problem = generateProblem(topic);
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
                  problemText: problem.problemText, correctAnswer: problem.correctAnswer,
                });
              }
            }
          }
        }
      }
    } finally {
      Math.random = realRandom;
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
