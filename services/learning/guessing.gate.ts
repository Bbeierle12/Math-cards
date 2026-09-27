/**
 * Guessability gate (docs/MASTERY-TUNING.md, Phase 0).
 *
 * A student who does not read the numbers must not reach proficiency. For
 * every topic we model guessers who know which template a problem comes from
 * (the prompt shows that) but ignore its parameters:
 *
 *  - modal: submit, for each template, the single answer that is correct on
 *    the most instances of that template;
 *  - vocabulary: like modal, but every closed-vocabulary part (a verdict
 *    word) is chosen at random from its vocabulary.
 *
 * Templates with fewer than FIXED_ITEM distinct instances are fixed items
 * (an identity, a named fact): knowing the template is knowing the question,
 * so answering them is recall, not guessing, and the guesser is scored wrong
 * on them.
 *
 * Gate: the chance of reaching proficiency within BUDGET attempts is at most
 * 1% for every strategy on every topic, under the real mastery rules. A
 * rigorous bound settles a topic when it can; otherwise the attempts are
 * simulated with the scheduler's policy (aim at the template with the fewest
 * correct answers, prefer an instance not seen before) over a pool of
 * generated problems whose correctness under each strategy is precomputed.
 */
import { describe, it, expect } from 'vitest';
import { GENERATORS, generateProblem } from '../generators';
import { canonicalInput, grade } from '../grading';
import { applyEvent, emptySkill, meetsProficiency, rulesFor } from './mastery';
import { instanceKey } from './scheduler';
import { createRng } from '../random';
import type { AnswerSpec, Problem, SkillState, TopicId } from '../../types';

const BUDGET = 200;
const RUNS = Number(process.env.GUESS_RUNS || 400);
const SAMPLE = 60;
const FIXED_ITEM = 5;
const MAX_RATE = 0.01;

type Answer = string | string[];
type Strategy = 'modal' | 'vocabulary';

/** Kinds whose grading is expensive; for these, equal answers have equal canonical inputs. */
const SYMBOLIC = new Set(['expression', 'antiderivative', 'equation']);
const isSymbolic = (spec: AnswerSpec): boolean =>
  SYMBOLIC.has(spec.kind) || (spec.kind === 'anyOf' && spec.options.some(isSymbolic))
  || (spec.kind === 'multipart' && spec.parts.some(p => p.spec !== null && isSymbolic(p.spec)));

const correctOn = (p: Problem, a: Answer): boolean =>
  isSymbolic(p.answer) ? JSON.stringify(canonicalInput(p.answer)) === JSON.stringify(a) : grade(p.answer, a);

/** Closed vocabularies of the parts of an answer (null for typed parts). */
const vocabularies = (spec: AnswerSpec): (string[] | null)[] => {
  if (spec.kind === 'choice') return [spec.options];
  if (spec.kind === 'multipart') return spec.parts.map(p => (p.spec?.kind === 'choice' ? p.spec.options : null));
  return [null];
};

/** Every way of filling the vocabulary parts of `modal`, each equally likely under the vocabulary strategy. */
const vocabularyAnswers = (modal: Answer, vocab: (string[] | null)[]): Answer[] => {
  let out: string[][] = [Array.isArray(modal) ? [...modal] : [modal]];
  vocab.forEach((words, i) => {
    if (words) out = out.flatMap(a => words.map(w => a.map((v, j) => (j === i ? w : v))));
  });
  return out.map(a => (Array.isArray(modal) ? a : a[0]));
};

interface PoolItem { templateId: string; instance: string; modal: boolean; vocabulary: number }
interface TemplateGuess { rate: Record<Strategy, number>; n: number; fixed: boolean; modal: Answer }

/** For each template: the instance-blind best answer, how often each strategy is right, and a problem pool. */
const analyse = (topic: TopicId): { templates: Map<string, TemplateGuess>; pools: Map<string, PoolItem[]> } => {
  const byTemplate = new Map<string, Problem[]>();
  const wanted = GENERATORS.get(topic)!.templates.length;
  for (let i = 0; i < 20_000 && (byTemplate.size < wanted || i < SAMPLE * wanted); i++) {
    const p = generateProblem(topic, {}, `guess-${i}`);
    const list = byTemplate.get(p.templateId) ?? [];
    if (list.length < SAMPLE) list.push(p);
    byTemplate.set(p.templateId, list);
  }
  const templates = new Map<string, TemplateGuess>();
  const pools = new Map<string, PoolItem[]>();
  for (const [template, problems] of byTemplate) {
    const counts = new Map<string, number>();
    for (const p of problems) {
      const key = JSON.stringify(canonicalInput(p.answer));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const candidates = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k]) => JSON.parse(k) as Answer);
    let modal: Answer = candidates[0];
    let best = -1;
    for (const c of candidates) {
      const hits = problems.filter(p => correctOn(p, c)).length;
      if (hits > best) { modal = c; best = hits; }
    }
    const fixed = new Set(problems.map(instanceKey)).size < FIXED_ITEM;
    const variants = vocabularyAnswers(modal, vocabularies(problems[0].answer));
    const pool = problems.map(p => ({
      templateId: template,
      instance: instanceKey(p),
      modal: !fixed && correctOn(p, modal),
      vocabulary: fixed ? 0 : variants.filter(v => correctOn(p, v)).length / variants.length,
    }));
    pools.set(template, pool);
    const mean = (f: (x: PoolItem) => number) => pool.reduce((s, x) => s + f(x), 0) / pool.length;
    templates.set(template, {
      rate: { modal: mean(x => Number(x.modal)), vocabulary: mean(x => x.vocabulary) },
      n: pool.length, fixed, modal,
    });
  }
  return { templates, pools };
};

/**
 * Rigorous upper bound on P(proficient within BUDGET attempts) for a guesser
 * whose chance of being right is at most q on every attempt. Evidence is then
 * dominated by a random walk with steps +1 (prob q) and −errorPenalty, floored
 * at 0. By the Cramér–Lundberg bound, a walk started at 0 ever gains h with
 * probability ≤ e^{−θh}, where θ > 0 solves q·e^θ + (1 − q)·e^{−θ·penalty} = 1;
 * a floored walk restarts from 0 at most BUDGET times. Returns 1 when the
 * drift is not negative (no bound).
 */
export const lundbergBound = (q: number, h: number, penalty: number, budget: number): number => {
  if (q <= 0) return 0;
  if (q + (1 - q) * -penalty >= 0) return 1;
  const f = (th: number) => q * Math.exp(th) + (1 - q) * Math.exp(-th * penalty) - 1;
  let lo = 1e-9, hi = 1;
  while (f(hi) < 0) hi *= 2;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
  return Math.min(1, budget * Math.exp(-lo * h));
};

/** Upper 95% Wilson bound of a proportion estimated from n samples. */
const wilsonUpper = (rate: number, n: number): number => {
  const z = 1.96;
  const centre = rate + z * z / (2 * n);
  const margin = z * Math.sqrt(rate * (1 - rate) / n + z * z / (4 * n * n));
  return Math.min(1, (centre + margin) / (1 + z * z / n));
};

/** Fraction of simulated runs that reach proficiency within BUDGET attempts. */
const passRate = (topic: TopicId, pools: Map<string, PoolItem[]>, strategy: Strategy): number => {
  const def = GENERATORS.get(topic)!;
  const rules = rulesFor(10);
  const templates = [...pools.keys()];
  let passed = 0;
  for (let r = 0; r < RUNS; r++) {
    const rng = createRng(`${topic}:${strategy}:${r}`);
    let s: SkillState = emptySkill();
    for (let n = 0; n < BUDGET; n++) {
      // the scheduler: the template with the fewest correct answers, then an unseen instance if there is one
      const counts = templates.map(t => s.templates[t] ?? 0);
      const least = Math.min(...counts);
      const pool = pools.get(rng.pick(templates.filter((_, i) => counts[i] === least)))!;
      const fresh = pool.filter(x => !s.instances.includes(x.instance));
      const item = rng.pick(fresh.length ? fresh : pool);
      const correct = strategy === 'modal' ? item.modal : rng.next() < item.vocabulary;
      s = applyEvent(s, {
        t: (n + 1) * 60_000, skillId: topic, generatorVersion: def.version, templateId: item.templateId, seed: `${r}.${n}`,
        instance: item.instance, correct, firstAttempt: true, hintUsed: false,
      }, rules, def.templates.length);
      if (meetsProficiency(s, rules, def.templates.length)) { passed++; break; }
    }
  }
  return passed / RUNS;
};

describe('guessability bound', () => {
  it('is an upper bound on simulated random walks', () => {
    for (const q of [0.15, 0.25, 0.3]) {
      const rng = createRng(`walk:${q}`);
      let hits = 0;
      for (let r = 0; r < 4000; r++) {
        let e = 0;
        for (let n = 0; n < BUDGET && e < 10; n++) e = Math.max(0, e + (rng.next() < q ? 1 : -0.5));
        if (e >= 10) hits++;
      }
      expect(hits / 4000, `q = ${q}`).toBeLessThanOrEqual(lundbergBound(q, 10, 0.5, BUDGET) + 0.01);
    }
    expect(lundbergBound(0.4, 10, 0.5, BUDGET)).toBe(1); // positive drift: no bound
  });
});

describe(`guessability gate (${RUNS} runs × ${BUDGET} attempts)`, () => {
  for (const topic of GENERATORS.keys()) {
    it(topic, () => {
      const { templates, pools } = analyse(topic);
      const rules = rulesFor(10);
      const summary = [...templates].map(([t, g]) => `${t}: ${(100 * g.rate.modal).toFixed(0)}% with ${JSON.stringify(g.modal)}`).join('; ');
      for (const strategy of ['modal', 'vocabulary'] as const) {
        // proof first: bound every template's success rate from above (fixed items contribute 0)
        const q = Math.max(...[...templates.values()].map(g => (g.fixed ? 0 : wilsonUpper(g.rate[strategy], g.n))));
        if (lundbergBound(q, rules.threshold, rules.errorPenalty, BUDGET) <= MAX_RATE) continue;
        const rate = passRate(topic, pools, strategy);
        expect(rate, `${topic}, ${strategy} guessing reaches proficiency in ${(100 * rate).toFixed(1)}% of runs (${summary})`).toBeLessThanOrEqual(MAX_RATE);
      }
    }, 300_000);
  }
});
