/**
 * The typed answer contract: solution sets, domain policies, grade() and the
 * helpers derived from a spec.
 */
import { describe, it, expect } from 'vitest';
import type { AnswerSpec, Interval } from '../../types';
import {
  grade, canonicalInput, wrongInputs, displayOf, referenceNumber, toleranceFor,
  parseIntervalSet, intervalSetsEqual, normalizeIntervals, parseFiniteSet, finiteSetsEqual,
  expressionsEquivalent, numbersEqual, partIsActive,
} from './index';

const INF = Infinity;
const open = (lo: number, hi: number): Interval => ({ lo, hi, loClosed: false, hiClosed: false });
const closed = (lo: number, hi: number): Interval => ({ lo, hi, loClosed: true, hiClosed: true });

describe('numbersEqual and infinities', () => {
  it('an infinity equals only itself', () => {
    expect(numbersEqual(INF, INF)).toBe(true);
    expect(numbersEqual(-INF, -INF)).toBe(true);
    expect(numbersEqual(5, INF)).toBe(false);
    expect(numbersEqual(INF, 5)).toBe(false);
    expect(numbersEqual(-INF, 1)).toBe(false);
    expect(numbersEqual(-INF, INF)).toBe(false);
    expect(numbersEqual(NaN, NaN)).toBe(false);
  });
});

describe('interval solution sets', () => {
  it('parses inequalities in either orientation', () => {
    expect(parseIntervalSet('x < 4', 'x')).toEqual([open(-INF, 4)]);
    expect(parseIntervalSet('4 > x', 'x')).toEqual([open(-INF, 4)]);
    expect(parseIntervalSet('x >= -2', 'x')).toEqual([{ lo: -2, hi: INF, loClosed: true, hiClosed: false }]);
    expect(parseIntervalSet('x ≤ 1/2', 'x')).toEqual([{ lo: -INF, hi: 0.5, loClosed: false, hiClosed: true }]);
  });

  it('parses double inequalities and interval notation, including unions', () => {
    expect(parseIntervalSet('1 < x <= 3', 'x')).toEqual([{ lo: 1, hi: 3, loClosed: false, hiClosed: true }]);
    expect(parseIntervalSet('3 >= x > 1', 'x')).toEqual([{ lo: 1, hi: 3, loClosed: false, hiClosed: true }]);
    expect(parseIntervalSet('[2, inf)', 'x')).toEqual([{ lo: 2, hi: INF, loClosed: true, hiClosed: false }]);
    expect(parseIntervalSet('(-∞, 1) ∪ (3, ∞)', 'x')).toEqual([open(-INF, 1), open(3, INF)]);
    expect(parseIntervalSet('(-inf,1) U (3,inf)', 'x')).toEqual([open(-INF, 1), open(3, INF)]);
    expect(parseIntervalSet('x ∈ [0, 1]', 'x')).toEqual([closed(0, 1)]);
    expect(parseIntervalSet('all real numbers', 'x')).toEqual([open(-INF, INF)]);
  });

  it('rejects malformed sets, other variables, and impossible double inequalities', () => {
    expect(parseIntervalSet('y < 4', 'x')).toBeNull();
    expect(parseIntervalSet('x < y', 'x')).toBeNull();
    expect(parseIntervalSet('3 < x < 1', 'x')).toBeNull();
    expect(parseIntervalSet('1 < x > 3', 'x')).toBeNull();
    expect(parseIntervalSet('(3, 1)', 'x')).toBeNull();
    expect(parseIntervalSet('x < inf', 'x')).toBeNull();
    expect(parseIntervalSet('', 'x')).toBeNull();
  });

  it('compares as sets: order, merging, closedness', () => {
    expect(intervalSetsEqual([open(3, INF), open(-INF, 1)], [open(-INF, 1), open(3, INF)])).toBe(true);
    expect(intervalSetsEqual([closed(0, 2), closed(1, 3)], [closed(0, 3)])).toBe(true);
    expect(intervalSetsEqual([{ lo: 0, hi: 1, loClosed: true, hiClosed: false }, closed(1, 2)], [closed(0, 2)])).toBe(true);
    expect(intervalSetsEqual([open(0, 1), open(1, 2)], [open(0, 2)])).toBe(false); // 1 is missing
    expect(intervalSetsEqual([open(0, 1)], [closed(0, 1)])).toBe(false);
    expect(intervalSetsEqual([open(-INF, 0)], [open(1, INF)])).toBe(false);
  });

  it('normalizeIntervals drops empty intervals and never closes an infinite end', () => {
    expect(normalizeIntervals([open(1, 1), { lo: -INF, hi: 0, loClosed: true, hiClosed: true }]))
      .toEqual([{ lo: -INF, hi: 0, loClosed: false, hiClosed: true }]);
  });
});

describe('finite sets', () => {
  it('parses lists, braces, "x = a or x = b" and the empty set', () => {
    expect(parseFiniteSet('2, -3')).toEqual([2, -3]);
    expect(parseFiniteSet('{2, −3}')).toEqual([2, -3]);
    expect(parseFiniteSet('x = 2 or x = -3')).toEqual([2, -3]);
    expect(parseFiniteSet('1/2 and 3')).toEqual([0.5, 3]);
    expect(parseFiniteSet('∅')).toEqual([]);
    expect(parseFiniteSet('no real solutions')).toEqual([]);
    expect(parseFiniteSet('2, banana')).toBeNull();
  });

  it('compares as sets', () => {
    expect(finiteSetsEqual([2, -3], [-3, 2])).toBe(true);
    expect(finiteSetsEqual([2, 2], [2])).toBe(true);
    expect(finiteSetsEqual([2], [2, -3])).toBe(false);
    expect(finiteSetsEqual([], [])).toBe(true);
  });
});

describe('domain policies', () => {
  it('samePartialFunction (default): a removable hole is a different function', () => {
    expect(expressionsEquivalent('(x^2-1)/(x-1)', 'x+1')).toBe(false);
    expect(expressionsEquivalent('2*log(x)', 'log(x^2)')).toBe(false);
  });

  it('ignoreRemovableSingularities: holes are skipped, poles are not', () => {
    const opts = { domainPolicy: 'ignoreRemovableSingularities' as const };
    expect(expressionsEquivalent('(x^2-1)/(x-1)', 'x+1', opts)).toBe(true);
    expect(expressionsEquivalent('x/x', '1', opts)).toBe(true);
    expect(expressionsEquivalent('(x^2-1)/(x-1)', 'x+2', opts)).toBe(false);
    expect(expressionsEquivalent('1/(x-1)', '0', opts)).toBe(false);
  });

  it('onDeclaredDomain: only the declared domain matters', () => {
    const positive = { domainPolicy: 'onDeclaredDomain' as const, domain: { intervals: [open(0, INF)] } };
    expect(expressionsEquivalent('2*log(x)', 'log(x^2)', positive)).toBe(true);
    expect(expressionsEquivalent('abs(x)', 'x', positive)).toBe(true);
    expect(expressionsEquivalent('-x', 'abs(x)', positive)).toBe(false);
    expect(expressionsEquivalent('log(x)', 'log(x^2)', positive)).toBe(false);
    // critical points outside the declared domain are not sampled; inside, they are
    const around1 = { domainPolicy: 'onDeclaredDomain' as const, domain: { intervals: [open(0, 2)], criticalPoints: [1, 5] } };
    expect(expressionsEquivalent('x', 'x', around1)).toBe(true);
  });
});

describe('grade', () => {
  const lim: AnswerSpec = {
    kind: 'multipart',
    parts: [
      { label: 'Verdict', spec: { kind: 'choice', options: ['converges', 'diverges'], answer: 'converges' } },
      { label: 'Limit', spec: { kind: 'number', value: 1, tolerance: { kind: 'exact' } }, when: { part: 0, equals: 'converges' } },
    ],
  };

  it('partIsActive follows the chosen value', () => {
    if (lim.kind !== 'multipart') throw new Error();
    expect(partIsActive(lim.parts, 1, ['converges', ''])).toBe(true);
    expect(partIsActive(lim.parts, 1, ['Converges.', ''])).toBe(true);
    expect(partIsActive(lim.parts, 1, ['diverges', ''])).toBe(false);
    expect(partIsActive(lim.parts, 0, ['', ''])).toBe(true);
  });

  it('rejects input of the wrong shape for every kind', () => {
    expect(grade(lim, 'converges')).toBe(false);
    expect(grade({ kind: 'number', value: 1, tolerance: { kind: 'exact' } }, ['1'])).toBe(false);
  });

  it('text answers are a closed vocabulary, choice answers must be an option', () => {
    expect(grade({ kind: 'text', accepted: ['infinity', '∞'] }, '∞')).toBe(true);
    expect(grade({ kind: 'text', accepted: ['infinity', '∞'] }, 'a lot')).toBe(false);
    expect(grade({ kind: 'choice', options: ['yes', 'no'], answer: 'no' }, 'nope')).toBe(false);
  });

  it('equations must be equations', () => {
    const eq: AnswerSpec = { kind: 'equation', lhs: 'y', rhs: '2x+1' };
    expect(grade(eq, 'y = 2x + 1')).toBe(true);
    expect(grade(eq, '2y = 4x + 2')).toBe(true);
    expect(grade(eq, 'y - 2x = 1')).toBe(true);
    expect(grade(eq, '2x + 1')).toBe(false);
    expect(grade(eq, 'y = 2x')).toBe(false);
  });
});

describe('toleranceFor', () => {
  it('matches the rounding instruction', () => {
    expect(toleranceFor({ kind: 'decimalPlaces', places: 2 }, 3.14159)).toBeCloseTo(0.005, 8);
    expect(toleranceFor({ kind: 'significantFigures', figures: 2 }, 0.0123)).toBeCloseTo(0.0005, 9);
    expect(toleranceFor({ kind: 'relative', tol: 0.01 }, 200)).toBeCloseTo(2, 9);
    expect(toleranceFor({ kind: 'exact' }, 1e6)).toBeLessThan(1e-2);
  });
});

describe('canonical helpers', () => {
  const specs: AnswerSpec[] = [
    { kind: 'number', value: 2.5, tolerance: { kind: 'exact' } },
    { kind: 'number', value: Math.PI, tolerance: { kind: 'decimalPlaces', places: 3 } },
    { kind: 'number', value: 30, tolerance: { kind: 'exact' }, unit: 'degree' },
    { kind: 'fraction', numerator: -3, denominator: 4 },
    { kind: 'fraction', numerator: 5, denominator: 6, lowestTerms: true },
    { kind: 'expression', reference: 'x^2+5', assignable: ['u'] },
    { kind: 'equation', lhs: 'x', rhs: '3tan(theta)', parameters: ['theta'] },
    { kind: 'interval', variable: 'x', set: [open(-INF, 2)] },
    { kind: 'interval', variable: 'x', set: [open(-INF, -1), closed(2, 3)] },
    { kind: 'finiteSet', elements: [0, 5] },
    { kind: 'finiteSet', elements: [-2] },
    { kind: 'antiderivative', integrand: 'x*e^x', variable: 'x', reference: 'x*e^x-e^x' },
    { kind: 'choice', options: ['converges', 'diverges'], answer: 'diverges' },
    { kind: 'text', accepted: ['circle'] },
    {
      kind: 'multipart',
      parts: [
        { label: 'Verdict', spec: { kind: 'choice', options: ['converges', 'diverges'], answer: 'converges' } },
        { label: 'Limit', spec: { kind: 'number', value: 0, tolerance: { kind: 'exact' } }, when: { part: 0, equals: 'converges' } },
      ],
    },
    { kind: 'anyOf', options: [{ kind: 'equation', lhs: 'x', rhs: '2sin(theta)' }, { kind: 'equation', lhs: 'x', rhs: '2cos(theta)' }] },
  ];

  for (const spec of specs) {
    it(`${spec.kind}: canonical input passes, every wrong input fails, display renders`, () => {
      expect(grade(spec, canonicalInput(spec))).toBe(true);
      const wrong = wrongInputs(spec);
      expect(wrong.length).toBeGreaterThan(0);
      for (const w of wrong) expect(grade(spec, w), JSON.stringify(w)).toBe(false);
      expect(displayOf(spec).length).toBeGreaterThan(0);
    });
  }

  it('referenceNumber reads numeric answers only', () => {
    expect(referenceNumber({ kind: 'fraction', numerator: 1, denominator: 4 })).toBe(0.25);
    expect(referenceNumber({ kind: 'text', accepted: ['circle'] })).toBeNull();
  });
});
