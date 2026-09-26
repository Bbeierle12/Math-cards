import { describe, it, expect } from 'vitest';
import { generateProblem, validateAnswer, gcd, simplifyFraction, answerDisplay } from './mathService';
import { GENERATORS, MAX_ATTEMPTS, instantiate } from './generators';
import type { GeneratorDef } from './generators';
import { exact } from './generators/context';
import { referenceNumber } from './grading';
import { CURRICULUM } from '../constants';
import { AnswerSpec, Problem, TopicId } from '../types';
import { coef, terms } from './testing/latex';

// ===========================
// UTILITY FUNCTIONS
// ===========================

describe('gcd', () => {
  it('returns the GCD of two positive numbers', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(15, 5)).toBe(5);
    expect(gcd(7, 3)).toBe(1);
  });

  it('handles negative numbers', () => {
    expect(gcd(-12, 8)).toBe(4);
    expect(gcd(12, -8)).toBe(4);
    expect(gcd(-12, -8)).toBe(4);
  });

  it('handles zero', () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(5, 0)).toBe(5);
  });

  it('handles equal numbers', () => {
    expect(gcd(6, 6)).toBe(6);
  });
});

describe('simplifyFraction', () => {
  it('simplifies a basic fraction', () => {
    expect(simplifyFraction(4, 8)).toEqual({ numerator: 1, denominator: 2 });
    expect(simplifyFraction(6, 9)).toEqual({ numerator: 2, denominator: 3 });
  });

  it('returns already-simplified fractions as-is', () => {
    expect(simplifyFraction(3, 7)).toEqual({ numerator: 3, denominator: 7 });
  });

  it('normalizes the sign onto the numerator', () => {
    expect(simplifyFraction(-4, 8)).toEqual({ numerator: -1, denominator: 2 });
    expect(simplifyFraction(4, -8)).toEqual({ numerator: -1, denominator: 2 });
    expect(simplifyFraction(-4, -8)).toEqual({ numerator: 1, denominator: 2 });
  });
});

// ===========================
// ANSWER VALIDATION (one block per answer kind)
// ===========================

const problemWith = (answer: AnswerSpec, topicId: TopicId = 'addition'): Problem => ({
  id: 'test',
  topicId,
  problemText: '',
  answer,
  explanation: '',
  solution: [],
  generatorId: topicId,
  generatorVersion: 0,
  seed: 'test',
  templateId: 'test',
});

describe('validateAnswer', () => {
  describe('number (exact)', () => {
    const five = problemWith(exact(5));

    it('accepts the value and rejects anything else', () => {
      expect(validateAnswer(five, '5')).toBe(true);
      expect(validateAnswer(five, '6')).toBe(false);
      expect(validateAnswer(five, '5.0000001')).toBe(false);
      expect(validateAnswer(five, 'abc')).toBe(false);
      expect(validateAnswer(five, '')).toBe(false);
    });

    it('accepts any exact expression for the value unless the evaluated form is required', () => {
      const six = problemWith(exact(6));
      expect(validateAnswer(six, '(7+5)/2')).toBe(true);
      expect(validateAnswer(six, '12/2')).toBe(true);
      const evaluated = problemWith(exact(6, 'evaluated'));
      expect(validateAnswer(evaluated, '(7+5)/2')).toBe(false);
      expect(validateAnswer(evaluated, '6')).toBe(true);
    });

    it('handles negative answers', () => {
      const neg = problemWith(exact(-3));
      expect(validateAnswer(neg, '-3')).toBe(true);
      expect(validateAnswer(neg, '−3')).toBe(true); // typographic minus
      expect(validateAnswer(neg, '3')).toBe(false);
    });

    it('allows a typed degree sign only for degree answers', () => {
      const deg = problemWith({ kind: 'number', value: 45, tolerance: { kind: 'exact' }, unit: 'degree' });
      expect(validateAnswer(deg, '45')).toBe(true);
      expect(validateAnswer(deg, '45°')).toBe(true);
      expect(validateAnswer(deg, '45 degrees')).toBe(true);
      expect(validateAnswer(deg, '46°')).toBe(false);
      expect(validateAnswer(problemWith(exact(45)), '45°')).toBe(false);
    });
  });

  describe('number (rounded)', () => {
    const rounded = problemWith({ kind: 'number', value: 3.3, tolerance: { kind: 'decimalPlaces', places: 2 } });

    it('accepts anything within half a unit of the last requested place', () => {
      expect(validateAnswer(rounded, '3.3')).toBe(true);
      expect(validateAnswer(rounded, '3.30')).toBe(true);
      expect(validateAnswer(rounded, '3.304')).toBe(true);
      expect(validateAnswer(rounded, '3.296')).toBe(true);
    });

    it('rejects values that round to a different answer', () => {
      expect(validateAnswer(rounded, '3.31')).toBe(false);
      expect(validateAnswer(rounded, '3.5')).toBe(false);
      expect(validateAnswer(rounded, '3.0')).toBe(false);
      expect(validateAnswer(rounded, 'abc')).toBe(false);
    });

    it('explicit tolerances are honoured', () => {
      const abs = problemWith({ kind: 'number', value: 10, tolerance: { kind: 'absolute', tol: 0.5 } });
      expect(validateAnswer(abs, '10.4')).toBe(true);
      expect(validateAnswer(abs, '10.6')).toBe(false);
      const sig = problemWith({ kind: 'number', value: 12345, tolerance: { kind: 'significantFigures', figures: 3 } });
      expect(validateAnswer(sig, '12300')).toBe(true);
      expect(validateAnswer(sig, '12400')).toBe(false);
    });
  });

  describe('fraction', () => {
    const threeQuarters = problemWith({ kind: 'fraction', numerator: 3, denominator: 4 }, 'fractions-basic');

    it('accepts the fraction and equivalent fractions', () => {
      expect(validateAnswer(threeQuarters, '3/4')).toBe(true);
      expect(validateAnswer(threeQuarters, '6/8')).toBe(true);
      expect(validateAnswer(threeQuarters, '-3/-4')).toBe(true);
    });

    it('rejects other values and malformed input', () => {
      expect(validateAnswer(threeQuarters, '2/4')).toBe(false);
      expect(validateAnswer(threeQuarters, '3')).toBe(false);
      expect(validateAnswer(threeQuarters, '3/0')).toBe(false);
      expect(validateAnswer(threeQuarters, 'abc')).toBe(false);
    });

    it('accepts a whole number only when the value is an integer', () => {
      const two = problemWith({ kind: 'fraction', numerator: 2, denominator: 1 }, 'fractions-basic');
      expect(validateAnswer(two, '2')).toBe(true);
      expect(validateAnswer(two, '4/2')).toBe(true);
    });

    it('handles negative fractions', () => {
      const neg = problemWith({ kind: 'fraction', numerator: -1, denominator: 2 }, 'fractions-basic');
      expect(validateAnswer(neg, '-1/2')).toBe(true);
      expect(validateAnswer(neg, '1/-2')).toBe(true);
      expect(validateAnswer(neg, '-2/4')).toBe(true);
      expect(validateAnswer(neg, '1/2')).toBe(false);
    });

    it('requires lowest terms when the task is to simplify', () => {
      const lowest = problemWith({ kind: 'fraction', numerator: 7, denominator: 6, lowestTerms: true }, 'rational-expressions');
      expect(validateAnswer(lowest, '7/6')).toBe(true);
      expect(validateAnswer(lowest, '14/12')).toBe(false);
      expect(validateAnswer(lowest, '-7/-6')).toBe(false);
    });

    it('compares exactly, beyond floating-point precision', () => {
      const tiny = problemWith({ kind: 'fraction', numerator: 1, denominator: 3 }, 'fractions-basic');
      expect(validateAnswer(tiny, '333333333333333333/999999999999999999')).toBe(true);
      expect(validateAnswer(tiny, '333333333333333333/999999999999999998')).toBe(false);
    });
  });

  describe('interval (inequality solutions)', () => {
    const lt2 = problemWith({ kind: 'interval', variable: 'x', set: [{ lo: -Infinity, hi: 2, loClosed: false, hiClosed: false }] }, 'inequalities');
    const le4 = problemWith({ kind: 'interval', variable: 'x', set: [{ lo: -Infinity, hi: 4, loClosed: false, hiClosed: true }] }, 'inequalities');
    const ge4 = problemWith({ kind: 'interval', variable: 'x', set: [{ lo: 4, hi: Infinity, loClosed: true, hiClosed: false }] }, 'inequalities');

    it('accepts the inequality in any standard spelling', () => {
      expect(validateAnswer(lt2, 'x < 2')).toBe(true);
      expect(validateAnswer(lt2, 'x<2')).toBe(true);
      expect(validateAnswer(lt2, ' x < 2 ')).toBe(true);
      expect(validateAnswer(lt2, '2 > x')).toBe(true);
      expect(validateAnswer(lt2, '(-inf, 2)')).toBe(true);
      expect(validateAnswer(lt2, '(-∞, 2)')).toBe(true);
      expect(validateAnswer(lt2, 'x ∈ (-∞, 2)')).toBe(true);
    });

    it('accepts ASCII <= and >= for ≤ and ≥ (regression H1)', () => {
      expect(validateAnswer(le4, 'x <= 4')).toBe(true);
      expect(validateAnswer(le4, 'x ≤ 4')).toBe(true);
      expect(validateAnswer(le4, '4 >= x')).toBe(true);
      expect(validateAnswer(ge4, 'x>=4')).toBe(true);
      expect(validateAnswer(ge4, '4 <= x')).toBe(true);
      expect(validateAnswer(ge4, '[4, inf)')).toBe(true);
    });

    it('rejects the wrong direction, the wrong endpoint, and the wrong closedness', () => {
      expect(validateAnswer(lt2, 'x > 2')).toBe(false);
      expect(validateAnswer(lt2, 'x <= 2')).toBe(false);
      expect(validateAnswer(lt2, 'x < 3')).toBe(false);
      expect(validateAnswer(lt2, '(-inf, 2]')).toBe(false);
      expect(validateAnswer(lt2, '(2, inf)')).toBe(false);
      expect(validateAnswer(le4, 'x < 4')).toBe(false);
      expect(validateAnswer(le4, '4 <= x')).toBe(false);
      expect(validateAnswer(ge4, 'x > 4')).toBe(false);
      expect(validateAnswer(ge4, '4 >= x')).toBe(false);
    });

    it('rejects a different variable and non-sets', () => {
      expect(validateAnswer(lt2, 'y < 2')).toBe(false);
      expect(validateAnswer(lt2, '2')).toBe(false);
      expect(validateAnswer(lt2, 'x = 2')).toBe(false);
    });

    it('never treats an infinite endpoint as equal to a finite one', () => {
      expect(validateAnswer(ge4, 'x < 0')).toBe(false);
      expect(validateAnswer(ge4, '(-inf, 0)')).toBe(false);
      expect(validateAnswer(lt2, '(5, inf)')).toBe(false);
    });
  });

  describe('finite sets (all roots)', () => {
    const roots = problemWith({ kind: 'finiteSet', elements: [2, -3] }, 'polynomial-functions');

    it('accepts the set in any order and notation', () => {
      expect(validateAnswer(roots, '2, -3')).toBe(true);
      expect(validateAnswer(roots, '-3, 2')).toBe(true);
      expect(validateAnswer(roots, '{2, -3}')).toBe(true);
      expect(validateAnswer(roots, 'x = 2 or x = -3')).toBe(true);
    });

    it('rejects incomplete, extra and wrong sets', () => {
      expect(validateAnswer(roots, '2')).toBe(false);
      expect(validateAnswer(roots, '2, -3, 4')).toBe(false);
      expect(validateAnswer(roots, '2, 3')).toBe(false);
      expect(validateAnswer(roots, '')).toBe(false);
    });
  });

  describe('expression', () => {
    const inner = problemWith({ kind: 'expression', reference: 'x^2+5', assignable: ['u'] }, 'integration-substitution');

    it('accepts equivalent expressions and a declared assignment', () => {
      expect(validateAnswer(inner, 'x^2+5')).toBe(true);
      expect(validateAnswer(inner, '5 + x²')).toBe(true);
      expect(validateAnswer(inner, 'u = x^2 + 5')).toBe(true);
    });

    it('rejects other expressions, undeclared assignments and undefined input', () => {
      expect(validateAnswer(inner, 'x^2+6')).toBe(false);
      expect(validateAnswer(inner, 'v = x^2 + 5')).toBe(false);
      expect(validateAnswer(inner, 'y^2+5')).toBe(false);
      expect(validateAnswer(inner, '0/0')).toBe(false);
    });

    it('same partial function by default: x/x is not 1', () => {
      const one = problemWith({ kind: 'expression', reference: '1' }, 'trig-identities');
      expect(validateAnswer(one, 'x/x')).toBe(false);
    });
  });

  describe('equation', () => {
    const sub = problemWith({ kind: 'equation', lhs: 'x', rhs: '2sin(theta)', parameters: ['theta'] }, 'trig-substitution');

    it('accepts rearrangements, nonzero multiples and renamed parameters', () => {
      expect(validateAnswer(sub, 'x = 2sin(theta)')).toBe(true);
      expect(validateAnswer(sub, 'x/2 = sin(t)')).toBe(true);
      expect(validateAnswer(sub, '2sin(θ) = x')).toBe(true);
    });

    it('requires an equation, and the right one', () => {
      expect(validateAnswer(sub, '2sin(theta)')).toBe(false);
      expect(validateAnswer(sub, 'x = 2cos(theta)')).toBe(false);
      expect(validateAnswer(sub, 'y = 2sin(theta)')).toBe(false);
    });
  });

  describe('antiderivative', () => {
    const ibp = problemWith({ kind: 'antiderivative', integrand: 'x*cos(x)', variable: 'x', reference: 'x*sin(x)+cos(x)' }, 'integration-by-parts');

    it('accepts any antiderivative, with or without +C', () => {
      expect(validateAnswer(ibp, 'x sin(x) + cos(x)')).toBe(true);
      expect(validateAnswer(ibp, 'x*sin(x) + cos(x) + 7')).toBe(true);
      expect(validateAnswer(ibp, 'x*sin(x) + cos(x) + C')).toBe(true);
    });

    it('rejects the integrand and non-antiderivatives', () => {
      expect(validateAnswer(ibp, 'x*cos(x)')).toBe(false);
      expect(validateAnswer(ibp, 'x*sin(x) - cos(x)')).toBe(false);
    });
  });

  describe('choice and text', () => {
    const mc = problemWith({ kind: 'choice', options: ['A', 'B', 'C'], answer: 'B' });
    const word = problemWith({ kind: 'text', accepted: ['circle', 'a circle'] }, 'polar-coordinates');

    it('choice: only the listed correct option', () => {
      expect(validateAnswer(mc, 'B')).toBe(true);
      expect(validateAnswer(mc, 'b')).toBe(true);
      expect(validateAnswer(mc, 'A')).toBe(false);
      expect(validateAnswer(mc, 'D')).toBe(false);
    });

    it('text: a closed vocabulary', () => {
      expect(validateAnswer(word, 'Circle')).toBe(true);
      expect(validateAnswer(word, 'a circle.')).toBe(true);
      expect(validateAnswer(word, 'ellipse')).toBe(false);
    });
  });

  describe('multipart and anyOf', () => {
    const converges = problemWith({
      kind: 'multipart',
      parts: [
        { label: 'Verdict', spec: { kind: 'choice', options: ['converges', 'diverges'], answer: 'converges' } },
        { label: 'Limit', spec: exact(0), when: { part: 0, equals: 'converges' } },
      ],
    }, 'sequences');
    const diverges = problemWith({
      kind: 'multipart',
      parts: [
        { label: 'Verdict', spec: { kind: 'choice', options: ['converges', 'diverges'], answer: 'diverges' } },
        { label: 'Limit', spec: null, when: { part: 0, equals: 'converges' } },
      ],
    }, 'sequences');

    it('grades all-or-nothing, and only the parts that apply', () => {
      expect(validateAnswer(converges, ['converges', '0'])).toBe(true);
      expect(validateAnswer(converges, ['converges', '1'])).toBe(false);
      expect(validateAnswer(converges, ['converges', ''])).toBe(false);
      expect(validateAnswer(converges, ['diverges', ''])).toBe(false);
      expect(validateAnswer(diverges, ['diverges', ''])).toBe(true);
      expect(validateAnswer(diverges, ['converges', '0'])).toBe(false);
    });

    it('a single string is not a multipart answer', () => {
      expect(validateAnswer(converges, 'converges')).toBe(false);
      expect(validateAnswer(converges, '0')).toBe(false);
    });

    it('anyOf accepts any option', () => {
      const either = problemWith({ kind: 'anyOf', options: [exact(2), exact(-2)] });
      expect(validateAnswer(either, '2')).toBe(true);
      expect(validateAnswer(either, '-2')).toBe(true);
      expect(validateAnswer(either, '0')).toBe(false);
    });
  });
});

describe('answerDisplay', () => {
  it('prefers the authored display and otherwise derives one from the answer', () => {
    expect(answerDisplay({ ...problemWith(exact(5)), displayAnswer: '$5$ apples' })).toBe('$5$ apples');
    expect(answerDisplay(problemWith(exact(0.25)))).toBe('$0.25$');
    expect(answerDisplay(problemWith({ kind: 'number', value: Math.PI, tolerance: { kind: 'decimalPlaces', places: 2 } }))).toBe('$3.14$');
    expect(answerDisplay(problemWith({ kind: 'fraction', numerator: -3, denominator: 4 }))).toBe('$-\\frac{3}{4}$');
    expect(answerDisplay(problemWith({ kind: 'interval', variable: 'x', set: [{ lo: -Infinity, hi: 2, loClosed: false, hiClosed: true }] }))).toBe('$x \\leq 2$');
    expect(answerDisplay(problemWith({ kind: 'choice', options: ['yes', 'no'], answer: 'no' }))).toBe('No');
  });
});

// ===========================
// PROBLEM GENERATION
// ===========================

const practiceTopics: TopicId[] = CURRICULUM.flatMap(level => level.topics)
  .filter(topic => topic.type !== 'reference')
  .map(topic => topic.id);

describe('generator registry', () => {
  it('has exactly one generator for every practice topic in the curriculum', () => {
    expect([...GENERATORS.keys()].sort()).toEqual([...practiceTopics].sort());
  });

  it('throws for a topic without a generator', () => {
    expect(() => generateProblem('nonexistent' as TopicId)).toThrow(/not yet implemented/);
    expect(() => generateProblem('unit-circle')).toThrow();
  });
});

describe('generateProblem', () => {
  for (const topicId of practiceTopics) {
    it(`"${topicId}": a complete problem with provenance`, () => {
      const problem = generateProblem(topicId, {}, 'fixed-seed');
      expect(problem.topicId).toBe(topicId);
      expect(problem.problemText).toBeTruthy();
      expect(problem.explanation).toBeTruthy();
      expect(problem.answer.kind).toBeTruthy();
      expect(problem.generatorId).toBe(topicId);
      expect(problem.generatorVersion).toBe(GENERATORS.get(topicId)!.version);
      expect(problem.seed).toBe('fixed-seed');
      expect(problem.templateId).toBeTruthy();
      expect(problem.id).toBe(`${topicId}@${problem.generatorVersion}:fixed-seed`);
    });
  }

  it('is a pure function of (topic, settings, seed)', () => {
    for (const topicId of practiceTopics) {
      expect(generateProblem(topicId, {}, 's1')).toEqual(generateProblem(topicId, {}, 's1'));
    }
    const settings = { numberRange: { min: 0, max: 20 }, allowNegatives: false };
    expect(generateProblem('addition', settings, 's2')).toEqual(generateProblem('addition', settings, 's2'));
  });

  it('replays exactly from the provenance recorded on the problem', () => {
    const original = generateProblem('subtraction', { numberRange: { min: -5, max: 5 } });
    expect(original.settings).toEqual({ numberRange: { min: -5, max: 5 } });
    const replay = generateProblem(original.generatorId, original.settings, original.seed);
    expect(replay).toEqual(original);
  });

  it('different seeds give different problems', () => {
    const texts = new Set(Array.from({ length: 20 }, (_, i) => generateProblem('addition', {}, `v${i}`).problemText));
    expect(texts.size).toBeGreaterThan(5);
  });

  it('a fresh random seed is used and recorded when none is given', () => {
    const a = generateProblem('limits');
    const b = generateProblem('limits');
    expect(a.seed).not.toBe(b.seed);
    expect(generateProblem('limits', {}, a.seed)).toEqual(a);
  });
});

describe('generator invariants', () => {
  it('a violated invariant discards the draft and retries deterministically', () => {
    let calls = 0;
    const picky: GeneratorDef = {
      topicId: 'addition',
      version: 1,
      templates: ['t'],
      generate: (ctx) => {
        calls++;
        const n = ctx.int(1, 10);
        ctx.require(n === 7, 'integerAnswer');
        return { templateId: 't', problemText: `${n}`, answer: exact(n), explanation: 'e' };
      },
    };
    const first = instantiate(picky, {}, 'seed');
    const callsForFirst = calls;
    expect(first.problemText).toBe('7');
    expect(callsForFirst).toBeGreaterThan(0);
    expect(instantiate(picky, {}, 'seed')).toEqual(first);
    expect(calls).toBe(2 * callsForFirst);
  });

  it('a generator that cannot satisfy its invariants fails loudly', () => {
    const broken: GeneratorDef = {
      topicId: 'addition',
      version: 3,
      templates: ['t'],
      generate: (ctx) => {
        ctx.require(false, 'answerNotTrivial');
        return { templateId: 't', problemText: '', answer: exact(0), explanation: '' };
      },
    };
    expect(() => instantiate(broken, {}, 'x')).toThrow(new RegExp(`no valid instance in ${MAX_ATTEMPTS} attempts.*answerNotTrivial`));
  });

  it('other errors are not swallowed', () => {
    const crashing: GeneratorDef = {
      topicId: 'addition',
      version: 1,
      templates: ['t'],
      generate: () => { throw new TypeError('bug'); },
    };
    expect(() => instantiate(crashing, {}, 'x')).toThrow(TypeError);
  });
});

// ===========================
// EDGE CASES AND RECOMPUTATION FROM THE DISPLAYED TEXT
// ===========================

const seeds = (n: number, prefix = 'ms') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const num = (p: Problem): number => {
  const v = referenceNumber(p.answer);
  if (v === null) throw new Error(`not numeric: ${p.problemText}`);
  return v;
};
const must = (m: RegExpMatchArray | null, p: Problem): RegExpMatchArray => {
  if (!m) throw new Error(`Could not parse: ${p.problemText}`);
  return m;
};

describe('edge cases', () => {
  it('division never divides by zero and always has an integer quotient', () => {
    for (const seed of seeds(80)) {
      const p = generateProblem('division', {}, seed);
      const m = must(p.problemText.match(/\$(-?\d+) \\div \(?(-?\d+)\)?/), p);
      expect(Number(m[2])).not.toBe(0);
      expect(Number.isInteger(Number(m[1]) / Number(m[2]))).toBe(true);
    }
  });

  it('fraction problems produce fractions in lowest terms with a positive denominator', () => {
    for (const seed of seeds(40)) {
      const p = generateProblem('fractions-basic', {}, seed);
      expect(p.answer.kind).toBe('fraction');
      if (p.answer.kind !== 'fraction') continue;
      expect(p.answer.denominator).toBeGreaterThan(0);
      expect(gcd(p.answer.numerator, p.answer.denominator)).toBe(p.answer.numerator === 0 ? p.answer.denominator : 1);
    }
  });

  it('decimal answers are exact values with at most 2 decimal places', () => {
    for (const seed of seeds(40)) {
      const p = generateProblem('decimals', {}, seed);
      const spec = p.answer;
      expect(spec.kind === 'number' && spec.tolerance.kind).toBe('exact');
      const decimalPlaces = (num(p).toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    }
  });
});

describe('arithmetic correctness: the answer solves the displayed problem', () => {
  it('multi-step equations', () => {
    for (const seed of seeds(60)) {
      const p = generateProblem('multi-step-equations', {}, seed);
      const m = must(p.problemText.match(/^\$(.+) = (.+)\$$/), p);
      const [l, r] = [terms(m[1]), terms(m[2])];
      const x = num(p);
      expect(coef(l, 'x') * x + coef(l, '')).toBe(coef(r, 'x') * x + coef(r, ''));
      expect(coef(l, 'x')).not.toBe(coef(r, 'x')); // exactly one solution
    }
  });

  it('simple linear equations', () => {
    for (const seed of seeds(60)) {
      const p = generateProblem('simple-linear-equations', {}, seed);
      const m = must(p.problemText.match(/^\$(.+) = (-?\d+)\$$/), p);
      const t = terms(m[1]);
      expect(coef(t, 'x') * num(p) + coef(t, '')).toBe(Number(m[2]));
    }
  });

  const operands = (p: Problem, op: string): [number, number] => {
    const m = must(p.problemText.match(new RegExp(`^\\$(-?\\d+) ${op} \\(?(-?\\d+)\\)? =`)), p);
    return [Number(m[1]), Number(m[2])];
  };

  it('addition, subtraction, multiplication, division', () => {
    for (const seed of seeds(30)) {
      const [a1, b1] = operands(generateProblem('addition', {}, seed), '\\+');
      expect(num(generateProblem('addition', {}, seed))).toBe(a1 + b1);
      const [a2, b2] = operands(generateProblem('subtraction', {}, seed), '-');
      expect(num(generateProblem('subtraction', {}, seed))).toBe(a2 - b2);
      const [a3, b3] = operands(generateProblem('multiplication', {}, seed), '\\\\times');
      expect(num(generateProblem('multiplication', {}, seed)) === a3 * b3).toBe(true); // == also for ±0
      const [a4, b4] = operands(generateProblem('division', {}, seed), '\\\\div');
      expect(num(generateProblem('division', {}, seed)) === a4 / b4).toBe(true);
    }
  });

  it('quadratic equations: the answer is the larger root', () => {
    for (const seed of seeds(60)) {
      const p = generateProblem('quadratic-equations', {}, seed);
      const m = must(p.problemText.match(/Solve for \$x\$: \$(.+) = 0\$/), p);
      const t = terms(m[1]);
      const [a, b, c] = [coef(t, 'x^2'), coef(t, 'x'), coef(t, '')];
      expect(a).toBe(1);
      const x = num(p);
      expect(x * x + b * x + c).toBe(0);
      const other = -b - x; // Vieta
      expect(x).toBeGreaterThanOrEqual(other);
    }
  });

  it('factoring: the answer is the smaller constant of the factors', () => {
    for (const seed of seeds(60)) {
      const p = generateProblem('factoring', {}, seed);
      const m = must(p.problemText.match(/Factor: \$(.+)\$/), p);
      const t = terms(m[1]);
      const [sum, product] = [coef(t, 'x'), coef(t, '')];
      const k = num(p);
      const other = sum - k;
      expect(k * other).toBe(product);
      expect(k).toBeLessThanOrEqual(other);
    }
  });
});

// ===========================
// REGRESSIONS
// ===========================

describe('regression M10: tolerance scoped to π-based answers only', () => {
  it('diameter grades exactly; circumference/area demand the instructed π ≈ 3.14', () => {
    for (const seed of seeds(40)) {
      const p = generateProblem('circles', {}, seed);
      const answer = num(p);
      const r = Number(must(p.problemText.match(/radius \$(\d+)\$/), p)[1]);
      if (/diameter/.test(p.problemText)) {
        expect(p.answer).toEqual(exact(2 * r));
        expect(validateAnswer(p, String(answer + 0.4))).toBe(false);
        expect(validateAnswer(p, String(answer - 0.4))).toBe(false);
      } else if (/circumference/.test(p.problemText)) {
        expect(validateAnswer(p, (2 * 3.14 * r).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (2 * Math.PI * r).toFixed(2))).toBe(false);
      } else {
        expect(validateAnswer(p, (3.14 * r * r).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (Math.PI * r * r).toFixed(2))).toBe(false);
      }
    }
  });

  it('surface area grades to exactly the requested 2 decimal places', () => {
    let found = 0;
    for (const seed of seeds(300, 'sa')) {
      const p = generateProblem('integration-applications', {}, seed);
      if (!/surface area/.test(p.problemText)) continue;
      found++;
      expect(p.answer).toMatchObject({ kind: 'number', tolerance: { kind: 'decimalPlaces', places: 2 } });
      const answer = num(p);
      expect(validateAnswer(p, answer.toFixed(2))).toBe(true);
      expect(validateAnswer(p, String(answer + 0.03))).toBe(false);
      expect(validateAnswer(p, String(answer - 0.4))).toBe(false);
      if (found >= 10) break;
    }
    expect(found).toBeGreaterThan(0);
  });
});
