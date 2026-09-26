/**
 * Shared machinery for problem generators.
 *
 * A generator is a pure function of a GenContext (a seeded RNG plus the
 * learner's arithmetic settings). It returns a Draft: the prompt, the typed
 * answer contract, the explanation, and the structural template it used.
 * The registry (./index.ts) turns a Draft into a Problem and records the
 * generator id, version and seed so the exact problem can be replayed.
 */
import type { AnswerSpec, FractionAnswer, GeneratorSettings, Interval, NumberForm, TopicId } from '../../types';
import type { Rng } from '../random';

export type { GeneratorSettings };

/**
 * Named validity conditions of a generated instance. A generator states the
 * ones its template can violate with ctx.require(condition, name); the
 * registry retries on a derived seed when one fails.
 */
export const INVARIANTS = {
  nonZeroDenominator: 'no division by zero in the prompt, the answer or the working',
  uniqueRealSolution: 'the equation or system has exactly one solution',
  distinctRoots: '"the larger / smaller root" presupposes two distinct roots',
  answerNotTrivial: 'the prompt does not already state the answer (e.g. a quotient that is not constant)',
  triangleInequality: 'the side lengths form a nondegenerate triangle',
  positiveAngles: 'every angle of the figure is positive',
  integerAnswer: 'the answer is an integer, as the prompt implies',
  boundHolds: 'a claimed error bound is at least the actual error',
} as const;

export type InvariantName = keyof typeof INVARIANTS;

export interface GenContext extends Rng {
  settings: GeneratorSettings;
  /**
   * Declare a validity condition of the instance being built. When it fails
   * the registry discards the draft and retries with a derived seed; a
   * generator whose invariants cannot be met fails loudly.
   */
  require(condition: boolean, invariant: InvariantName): void;
}

export interface Draft {
  /** Structural template (e.g. 'rectangle-area'); coefficient variants share one. */
  templateId: string;
  problemText: string;
  answer: AnswerSpec;
  displayAnswer?: string;
  explanation: string;
  hint?: string;
}

export interface GeneratorDef {
  topicId: TopicId;
  /** Bump when the generator's output for a given seed changes. */
  version: number;
  /**
   * Every structural template the generator can emit. Mastery requires
   * evidence across templates and the scheduler targets them, so a draft
   * with an undeclared templateId is a generator bug.
   */
  templates: readonly string[];
  generate: (ctx: GenContext) => Draft;
}

export class InvariantViolation extends Error {
  constructor(public readonly invariant: InvariantName) {
    super(`generator invariant violated: ${invariant} (${INVARIANTS[invariant]})`);
  }
}

// ---------------------------------------------------------------------------
// Answer builders
// ---------------------------------------------------------------------------

export const exact = (value: number, form?: NumberForm): AnswerSpec =>
  (form ? { kind: 'number', value, tolerance: { kind: 'exact' }, form } : { kind: 'number', value, tolerance: { kind: 'exact' } });

export const roundedTo = (value: number, places: number): AnswerSpec =>
  ({ kind: 'number', value, tolerance: { kind: 'decimalPlaces', places } });

export const fractionAnswer = (numerator: number, denominator: number, opts: { lowestTerms?: boolean } = {}): AnswerSpec => {
  const f = simplifyFraction(numerator, denominator);
  return opts.lowestTerms
    ? { kind: 'fraction', numerator: f.numerator, denominator: f.denominator, lowestTerms: true }
    : { kind: 'fraction', numerator: f.numerator, denominator: f.denominator };
};

/** An angle in degrees; a typed ° is allowed. */
export const degrees = (value: number): AnswerSpec =>
  ({ kind: 'number', value, tolerance: { kind: 'exact' }, unit: 'degree' });

export const choice = (options: string[], answer: string): AnswerSpec => ({ kind: 'choice', options, answer });

export const words = (...accepted: string[]): AnswerSpec => ({ kind: 'text', accepted });

/** Solution set of `variable op bound`. */
export const ray = (variable: string, op: '<' | '>' | '≤' | '≥', bound: number): AnswerSpec => {
  const iv: Interval = op === '<' ? { lo: -Infinity, hi: bound, loClosed: false, hiClosed: false }
    : op === '≤' ? { lo: -Infinity, hi: bound, loClosed: false, hiClosed: true }
      : op === '>' ? { lo: bound, hi: Infinity, loClosed: false, hiClosed: false }
        : { lo: bound, hi: Infinity, loClosed: true, hiClosed: false };
  return { kind: 'interval', variable, set: [iv] };
};

// ---------------------------------------------------------------------------
// Number theory
// ---------------------------------------------------------------------------

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
};

/** Lowest terms with a positive denominator. */
export const simplifyFraction = (num: number, den: number): FractionAnswer => {
  const divisor = gcd(num, den) || 1;
  let n = num / divisor;
  let d = den / divisor;
  if (d < 0) { n = -n; d = -d; }
  return { numerator: n === 0 ? 0 : n, denominator: d };
};

/** Round to a fixed number of decimal places (for values the prompt itself approximates). */
export const roundTo = (n: number, places: number): number => {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
};

// ---------------------------------------------------------------------------
// LaTeX formatting
// ---------------------------------------------------------------------------

/** Negative numbers in parentheses: 3 × (−4). */
export const latexNum = (n: number): string => (n < 0 ? `(${n})` : `${n}`);
/** Signed constant term: "+ 5" / "- 5". */
export const latexTerm = (n: number): string => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);
export const latexFrac = (num: number, den: number): string => `\\frac{${num}}{${den}}`;
/** Fraction in lowest terms, integer when the denominator is 1, sign in front. */
export const latexFraction = (num: number, den: number): string => {
  const f = simplifyFraction(num, den);
  if (f.denominator === 1) return `${f.numerator}`;
  return `${f.numerator < 0 ? '-' : ''}\\frac{${Math.abs(f.numerator)}}{${f.denominator}}`;
};

/**
 * A sum of terms with integer coefficients, written the way a textbook would:
 * zero terms dropped, unit coefficients hidden, signs merged.
 *   latexPolynomial([[1, 'x^2'], [0, 'x'], [-6, '']]) → "x^2 - 6"
 */
export const latexPolynomial = (terms: [number, string][]): string => {
  const parts: string[] = [];
  for (const [coef, mono] of terms) {
    if (coef === 0) continue;
    const abs = Math.abs(coef);
    const body = mono === '' ? `${abs}` : abs === 1 ? mono : `${abs}${mono}`;
    if (parts.length === 0) parts.push(coef < 0 ? `-${body}` : body);
    else parts.push(coef < 0 ? `- ${body}` : `+ ${body}`);
  }
  return parts.length ? parts.join(' ') : '0';
};

/** English ordinal suffix: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st. */
export const ordinalSuffix = (n: number): string => {
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[Math.abs(n) % 10] ?? 'th';
};

/** v^k written the textbook way: x, x^{2}, 1 for k = 0. */
export const latexPower = (v: string, k: number): string => (k === 0 ? '1' : k === 1 ? v : `${v}^{${k}}`);

/** c·v^k written the textbook way: 3x^{2}, -x^{-2}, x, 5 (for k = 0). */
export const latexMonomial = (coef: number, v: string, k: number): string => {
  if (coef === 0) return '0';
  if (k === 0) return `${coef}`;
  const c = coef === 1 ? '' : coef === -1 ? '-' : `${coef}`;
  return `${c}${latexPower(v, k)}`;
};

/** "(x - 3)" / "(x + 3)" / "x" for the factor x − r. */
export const latexLinearFactor = (variable: string, root: number): string =>
  root === 0 ? variable : `(${variable} ${root > 0 ? '-' : '+'} ${Math.abs(root)})`;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Effective operand range for basic arithmetic. "Allow negatives" off means
 * no negative operands AND no negative answers; an inverted range is repaired.
 */
export const resolveRange = (
  settings: GeneratorSettings | undefined,
  fallbackMin: number,
  fallbackMax: number,
): { min: number; max: number } => {
  const rawMin = settings?.numberRange?.min;
  const rawMax = settings?.numberRange?.max;
  let min = typeof rawMin === 'number' && Number.isFinite(rawMin) ? Math.trunc(rawMin) : fallbackMin;
  let max = typeof rawMax === 'number' && Number.isFinite(rawMax) ? Math.trunc(rawMax) : fallbackMax;
  if (min > max) [min, max] = [max, min];
  if (settings?.allowNegatives === false) {
    min = Math.max(0, min);
    max = Math.max(min, max);
  }
  return { min, max };
};

// ---------------------------------------------------------------------------
// Special angles
// ---------------------------------------------------------------------------

export type SpecialAngle = 30 | 45 | 60;
export type TrigFn = 'sin' | 'cos' | 'tan';

export const SPECIAL_TRIG: Record<SpecialAngle, Record<TrigFn, { latex: string; text: string; value: number }>> = {
  30: {
    sin: { latex: '\\frac{1}{2}', text: '1/2', value: 0.5 },
    cos: { latex: '\\frac{\\sqrt{3}}{2}', text: '√3/2', value: Math.sqrt(3) / 2 },
    tan: { latex: '\\frac{\\sqrt{3}}{3}', text: '√3/3', value: Math.sqrt(3) / 3 },
  },
  45: {
    sin: { latex: '\\frac{\\sqrt{2}}{2}', text: '√2/2', value: Math.SQRT2 / 2 },
    cos: { latex: '\\frac{\\sqrt{2}}{2}', text: '√2/2', value: Math.SQRT2 / 2 },
    tan: { latex: '1', text: '1', value: 1 },
  },
  60: {
    sin: { latex: '\\frac{\\sqrt{3}}{2}', text: '√3/2', value: Math.sqrt(3) / 2 },
    cos: { latex: '\\frac{1}{2}', text: '1/2', value: 0.5 },
    tan: { latex: '\\sqrt{3}', text: '√3', value: Math.sqrt(3) },
  },
};
