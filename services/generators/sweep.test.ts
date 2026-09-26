/**
 * Seed sweep: every generator × many seeds.
 *
 * For each generated problem: generation does not throw (named invariants
 * are met, structural checks pass), the problem replays exactly from its
 * provenance, the canonical answer passes the production grader, and every
 * must-reject input fails. Identical problems (fixed banks repeat) are graded
 * once.
 *
 * `npm test` runs a quick sweep; `npm run test:sweep` runs SWEEP_SEEDS=2000
 * (and scales the independent recomputation in mathCorrectness.test.ts to the
 * same seed count).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GENERATORS, generateProblem } from './index';
import { INVARIANTS } from './context';
import { checkDraft } from './checks';
import { canonicalInput, grade, wrongInputs } from '../grading';
import type { GeneratorSettings, Problem } from '../../types';

const SEEDS = Number(process.env.SWEEP_SEEDS || 150);

const sweep = (topic: Parameters<typeof generateProblem>[0], settings: GeneratorSettings = {}) => {
  const unique = new Map<string, Problem>();
  const templates = new Set<string>();
  for (let i = 0; i < SEEDS; i++) {
    const p = generateProblem(topic, settings, `sweep-${i}`);
    templates.add(p.templateId);
    const key = JSON.stringify([p.problemText, p.answer]);
    if (!unique.has(key)) unique.set(key, p);
  }
  return { unique: [...unique.values()], templates };
};

describe(`seed sweep (${SEEDS} seeds per generator)`, () => {
  for (const topic of GENERATORS.keys()) {
    it(topic, () => {
      const { unique, templates } = sweep(topic);
      expect(templates.size).toBeGreaterThan(0);
      for (const p of unique) {
        const where = `${topic} seed ${p.seed}: ${p.problemText}`;
        expect(checkDraft({ ...p }), where).toEqual([]);
        expect(generateProblem(p.generatorId, p.settings, p.seed), where).toEqual(p);
        const canonical = canonicalInput(p.answer);
        expect(grade(p.answer, canonical), `${where}\nrejected its own answer ${JSON.stringify(canonical)}`).toBe(true);
        for (const wrong of wrongInputs(p.answer)) {
          expect(grade(p.answer, wrong), `${where}\naccepted ${JSON.stringify(wrong)}`).toBe(false);
        }
      }
    }, 120_000);
  }

  it('arithmetic under every settings combination', () => {
    const ranges = [undefined, { min: 0, max: 10 }, { min: -10, max: -5 }, { min: 5, max: 1 }, { min: -50, max: 50 }];
    for (const topic of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (const numberRange of ranges) {
        for (const allowNegatives of [undefined, true, false]) {
          const settings: GeneratorSettings = {};
          if (numberRange) settings.numberRange = numberRange;
          if (allowNegatives !== undefined) settings.allowNegatives = allowNegatives;
          for (const p of sweep(topic, settings).unique) {
            expect(grade(p.answer, canonicalInput(p.answer))).toBe(true);
            if (allowNegatives === false) {
              expect(p.answer.kind === 'number' && p.answer.value >= 0, `${topic} ${JSON.stringify(settings)}: ${p.problemText}`).toBe(true);
              expect(p.problemText, JSON.stringify(settings)).not.toMatch(/-\d/);
            }
          }
        }
      }
    }
  }, 120_000);
});

describe('structural checks', () => {
  const base = { templateId: 't', problemText: 'What is $2 + 2$?', explanation: 'It is $4$.', answer: { kind: 'number', value: 4, tolerance: { kind: 'exact' } } } as const;

  it('accept a well-formed draft', () => {
    expect(checkDraft({ ...base })).toEqual([]);
  });

  it('reject leaked values, broken LaTeX and textbook-format slips', () => {
    expect(checkDraft({ ...base, problemText: 'What is $NaN + 2$?' })).not.toEqual([]);
    expect(checkDraft({ ...base, problemText: 'What is $undefined$?' })).not.toEqual([]);
    expect(checkDraft({ ...base, explanation: 'ln(cos x) is undefined where cos x < 0.' })).toEqual([]); // the English word
    expect(checkDraft({ ...base, problemText: 'What is $\\frac{1}{2$?' })).not.toEqual([]);
    expect(checkDraft({ ...base, problemText: 'What is $2 + 2?' })).not.toEqual([]);
    expect(checkDraft({ ...base, problemText: 'Solve $3x + -4 = 2$' })).not.toEqual([]);
    expect(checkDraft({ ...base, problemText: 'Solve $1x = 2$' })).not.toEqual([]);
    expect(checkDraft({ ...base, problemText: 'Solve $x - (-4) = 2$, then $11x = 22$ and $\\frac{1}{x}$' })).toEqual([]);
  });

  it('reject malformed answer specs', () => {
    const bad = (answer: unknown) => checkDraft({ ...base, answer: answer as never });
    expect(bad({ kind: 'number', value: NaN, tolerance: { kind: 'exact' } })).not.toEqual([]);
    expect(bad({ kind: 'number', value: Infinity, tolerance: { kind: 'exact' } })).not.toEqual([]);
    expect(bad({ kind: 'fraction', numerator: 2, denominator: 4 })).not.toEqual([]);
    expect(bad({ kind: 'fraction', numerator: 1, denominator: -2 })).not.toEqual([]);
    expect(bad({ kind: 'choice', options: ['yes', 'Yes'], answer: 'yes' })).not.toEqual([]);
    expect(bad({ kind: 'choice', options: ['yes', 'no'], answer: 'maybe' })).not.toEqual([]);
    expect(bad({ kind: 'expression', reference: 'x^^2' })).not.toEqual([]);
    expect(bad({ kind: 'finiteSet', elements: [1, 1] })).not.toEqual([]);
    expect(bad({ kind: 'interval', variable: 'x', set: [{ lo: 3, hi: 1, loClosed: false, hiClosed: false }] })).not.toEqual([]);
    expect(bad({ kind: 'interval', variable: 'x', set: [{ lo: -Infinity, hi: 1, loClosed: true, hiClosed: false }] })).not.toEqual([]);
    expect(bad({ kind: 'anyOf', options: [{ kind: 'number', value: 1, tolerance: { kind: 'exact' } }, { kind: 'text', accepted: ['one'] }] })).not.toEqual([]);
    expect(bad({
      kind: 'multipart',
      parts: [
        { label: 'A', spec: { kind: 'number', value: 1, tolerance: { kind: 'exact' } } },
        { label: 'B', spec: null, when: { part: 0, equals: 'converges' } },
      ],
    })).not.toEqual([]);
  });

  it('every invariant a generator can name is documented', () => {
    for (const [name, description] of Object.entries(INVARIANTS)) {
      expect(description.length, name).toBeGreaterThan(10);
    }
  });
});

describe('no unseeded randomness in the app', () => {
  it('Math.random is not used outside tests', () => {
    const roots = ['services', 'components', 'contexts', 'App.tsx', 'index.tsx'];
    const offenders: string[] = [];
    const visit = (p: string) => {
      if (!fs.existsSync(p)) return;
      if (fs.statSync(p).isDirectory()) {
        for (const f of fs.readdirSync(p)) visit(path.join(p, f));
      } else if (/\.(ts|tsx)$/.test(p) && !/\.(test|eval)\.tsx?$/.test(p) && fs.readFileSync(p, 'utf8').includes('Math.random')) {
        offenders.push(p);
      }
    };
    roots.forEach(visit);
    expect(offenders).toEqual([]);
  });
});
