import { describe, it, expect } from 'vitest';
import {
  normalizeMathExpr, expressionsEquivalent, isAntiderivative, parseNumericInput, numbersEqual, roundingTolerance,
  freeVariables, toPolynomial, polynomialsEqual, polynomialDegree, primaryPoints, confirmationPoints,
  referenceSeedKey, FIXED_SAMPLE_POINTS, grade,
} from './index';
import * as Q from './rational';

describe('normalizeMathExpr', () => {
  it('turns student notation into parser syntax', () => {
    expect(normalizeMathExpr('xsin(x) + cos(x)')).toBe('x*sin(x)+cos(x)');
    expect(normalizeMathExpr('xe^x - e^x')).toBe('x*e^x-e^x');
    expect(normalizeMathExpr('(x-1)e^x')).toBe('(x-1)*e^x');
    expect(normalizeMathExpr('sin²(x)/2')).toBe('(sin(x))^2/2');
    expect(normalizeMathExpr('sec^2θ')).toBe('sec(theta)^2');
    expect(normalizeMathExpr('-ln|cos x|')).toBe('-log(abs(cos(x)))');
    expect(normalizeMathExpr('|x|+1')).toBe('(abs(x))+1');
    expect(normalizeMathExpr('x·ln(x) − x')).toBe('x*log(x)-x');
    expect(normalizeMathExpr('x <= 4')).toBe('x≤4');
  });

  it('does not mangle function names containing x', () => {
    expect(normalizeMathExpr('exp(x)*(x-1)')).toBe('exp(x)*(x-1)');
  });

  it('applies √ to the number or name right after it, and π and √ next to a name are products', () => {
    expect(normalizeMathExpr('√3/2')).toBe('sqrt(3)/2');          // not sqrt(3/2)
    expect(parseNumericInput('√3/2')).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(normalizeMathExpr('√(x+1)')).toBe('sqrt(x+1)');
    expect(normalizeMathExpr('x√2')).toBe('x*sqrt(2)');
    expect(normalizeMathExpr('π√2')).toBe('pi*sqrt(2)');
    expect(normalizeMathExpr('2π')).toBe('2pi');
    expect(normalizeMathExpr('πr^2')).toBe('pi*r^2');
    expect(normalizeMathExpr('xπ')).toBe('x*pi');
    expect(parseNumericInput('π/4')).toBeCloseTo(Math.PI / 4, 12);
    expect(expressionsEquivalent('x√2', 'sqrt(2)*x')).toBe(true);
  });
});

describe('freeVariables', () => {
  it('ignores function names and constants', () => {
    expect(freeVariables('x*sin(x)+cos(x)').sort()).toEqual(['x']);
    expect(freeVariables('pi/4+e')).toEqual([]);
    expect(freeVariables('2*sin(theta)').sort()).toEqual(['theta']);
  });
});

describe('exact rational arithmetic', () => {
  it('reads decimal literals exactly', () => {
    expect(Q.fromNumber(0.1)).toEqual(Q.rat(1n, 10n));
    expect(Q.fromNumber(-2.5)).toEqual(Q.rat(-5n, 2n));
    expect(Q.fromNumber(1e-7)).toEqual(Q.rat(1n, 10000000n));
    expect(Q.fromNumber(NaN)).toBeNull();
  });
  it('normalizes sign and lowest terms', () => {
    expect(Q.rat(4n, -8n)).toEqual({ n: -1n, d: 2n });
    expect(Q.equals(Q.add(Q.rat(1n, 3n), Q.rat(1n, 6n)), Q.rat(1n, 2n))).toBe(true);
  });
});

describe('polynomial canonical form', () => {
  const poly = (s: string) => toPolynomial(normalizeMathExpr(s));
  it('recognises polynomials, including factorial and decimal coefficients', () => {
    expect(polynomialsEqual(poly('1+x+x^2/2!+x^3/3!')!, poly('1+x+x^2/2+x^3/6')!)).toBe(true);
    expect(polynomialsEqual(poly('0.5x^2')!, poly('x^2/2')!)).toBe(true);
    expect(polynomialsEqual(poly('(x+1)^3')!, poly('x^3+3x^2+3x+1')!)).toBe(true);
    expect(polynomialsEqual(poly('pi*x/4')!, poly('x*pi/4')!)).toBe(true);
    expect(polynomialDegree(poly('(x-1)(x+2)(x-3)')!)).toBe(3);
  });
  it('rejects non-polynomials', () => {
    for (const s of ['x/x', '1/x', 'sqrt(x)', 'x^(1/2)', 'sin(x)', 'abs(x)', 'x^-1', 'x/0', '2^x', 'i*x']) {
      expect(poly(s), s).toBeNull();
    }
  });
  it('decides exactly where sampling can only estimate', () => {
    expect(polynomialsEqual(poly('x^2/3')!, poly('0.3333333333x^2')!)).toBe(false);
    expect(polynomialsEqual(poly('0.1+0.2')!, poly('0.3')!)).toBe(true); // exact, unlike binary floating point
  });
});

describe('expressionsEquivalent — exact', () => {
  it('accepts algebraically equal forms', () => {
    expect(expressionsEquivalent('x^2-6x+10', '(x-3)^2+1')).toBe(true);
    expect(expressionsEquivalent('1+x+x^2/2!+x^3/3!', '1+x+x^2/2+x^3/6')).toBe(true);
    expect(expressionsEquivalent('tan(θ)', 'sin(theta)/cos(theta)')).toBe(true);
    expect(expressionsEquivalent('1/cos^2(θ)', 'sec(theta)^2')).toBe(true);
  });

  it('rejects near misses', () => {
    expect(expressionsEquivalent('0.5005', '1/2')).toBe(false);
    expect(expressionsEquivalent('0.5', '1/2')).toBe(true);
    expect(expressionsEquivalent('x^2+6', 'x^2+5')).toBe(false);
  });

  it('never credits undefined mathematics', () => {
    expect(expressionsEquivalent('0/0', 'x^2+5')).toBe(false);
    expect(expressionsEquivalent('NaN+0', 'x^2+5')).toBe(false);
    expect(expressionsEquivalent('NaN', 'x^2+5')).toBe(false);
    expect(expressionsEquivalent('1/(x-x)', 'x')).toBe(false);
    expect(expressionsEquivalent('sqrt(-1)', 'i')).toBe(false); // complex result is not a real answer
    expect(expressionsEquivalent('', 'x')).toBe(false);
  });

  it('an assignment "u = ..." is not an expression; only a declared name may be assigned (grade)', () => {
    expect(expressionsEquivalent('u = x^2+5', 'x^2+5')).toBe(false);
    const spec = { kind: 'expression' as const, reference: 'x^2+5', assignable: ['u'] };
    expect(grade(spec, 'u = x^2+5')).toBe(true);
    expect(grade(spec, 'U = 5 + x^2')).toBe(true);
    expect(grade(spec, 'u = x^2+6')).toBe(false);
    expect(grade(spec, 'x = x^2+5')).toBe(false); // lhs collides with the variable
    expect(grade(spec, 'w = x^2+5')).toBe(false); // undeclared name
    expect(grade({ kind: 'expression', reference: 'x^2+5' }, 'u = x^2+5')).toBe(false);
  });

  it('compares inequalities in either orientation with algebraic sides', () => {
    expect(expressionsEquivalent('x <= 4', 'x ≤ 4')).toBe(true);
    expect(expressionsEquivalent('4 >= x', 'x ≤ 4')).toBe(true);
    expect(expressionsEquivalent('x < 8/2', 'x < 4')).toBe(true);
    expect(expressionsEquivalent('x < 4', 'x ≤ 4')).toBe(false);
    expect(expressionsEquivalent('4 <= x', 'x ≤ 4')).toBe(false);
    expect(expressionsEquivalent('x', 'x ≤ 4')).toBe(false);
  });

  it('treats words as words', () => {
    expect(expressionsEquivalent('Diverges', 'diverges')).toBe(true);
    expect(expressionsEquivalent('converges', 'diverges')).toBe(false);
    expect(expressionsEquivalent('x', 'diverges')).toBe(false);
  });
});

describe('equations and declared parameters', () => {
  const theta = { parameters: ['theta'] };
  it('renames only a declared parameter', () => {
    expect(expressionsEquivalent('x=2sin(t)', 'x=2sin(theta)', theta)).toBe(true);
    expect(expressionsEquivalent('2sin(u)=x', 'x=2sin(theta)', theta)).toBe(true);
    expect(expressionsEquivalent('x = 2*sin(θ)', 'x=2sin(theta)', theta)).toBe(true);
    // undeclared: the parameter keeps its identity
    expect(expressionsEquivalent('x=2sin(t)', 'x=2sin(theta)')).toBe(false);
    // the dependent variable is not a parameter
    expect(expressionsEquivalent('y=2sin(theta)', 'x=2sin(theta)', theta)).toBe(false);
    expect(expressionsEquivalent('y=2sin(t)', 'x=2sin(theta)', theta)).toBe(false);
  });

  it('matches up to a nonzero constant factor and rearrangement, nothing more', () => {
    expect(expressionsEquivalent('2*x=4*sin(theta)', 'x=2*sin(theta)', theta)).toBe(true);
    expect(expressionsEquivalent('x/2 = sin(t)', 'x=2sin(theta)', theta)).toBe(true);
    expect(expressionsEquivalent('x - 2sin(θ) = 0', 'x=2sin(theta)', theta)).toBe(true);
    expect(expressionsEquivalent('-x = -2sin(theta)', 'x=2sin(theta)', theta)).toBe(true);
    expect(expressionsEquivalent('x^2 = 4*sin(theta)^2', 'x=2sin(theta)', theta)).toBe(false); // squaring changes the solution set
    expect(expressionsEquivalent('x = 2sin(theta) + 1', 'x=2sin(theta)', theta)).toBe(false);
    expect(expressionsEquivalent('x=3sin(theta)', 'x=2sin(theta)', theta)).toBe(false);
    expect(expressionsEquivalent('x=2cos(theta)', 'x=2sin(theta)', theta)).toBe(false); // a different substitution
    expect(expressionsEquivalent('0*x = 0', 'x=2sin(theta)', theta)).toBe(false);
    expect(expressionsEquivalent('2sin(theta)', 'x=2sin(theta)', theta)).toBe(false);
  });

  it('decides polynomial equations exactly', () => {
    expect(expressionsEquivalent('2x = 4', 'x = 2')).toBe(true);
    expect(expressionsEquivalent('x^2 = 4', 'x = 2')).toBe(false);
    expect(expressionsEquivalent('y = (x-3)^2+1', 'y = x^2-6x+10')).toBe(true);
  });
});

describe('sampling: problem-seeded primary points, submission-keyed confirmation', () => {
  it('primary points depend only on the problem', () => {
    const key = referenceSeedKey(normalizeMathExpr('x*sin(x)+cos(x)'));
    expect(primaryPoints(key)).toEqual(primaryPoints(key));
    expect(primaryPoints(key).slice(0, FIXED_SAMPLE_POINTS.length)).toEqual(FIXED_SAMPLE_POINTS);
    expect(primaryPoints(key)).not.toEqual(primaryPoints(referenceSeedKey('x')));
    // the API offers no way for a submission to influence them
    expect(primaryPoints.length).toBe(1);
  });

  it('equivalent spellings get identical verdicts', () => {
    const spellings = ['x*sin(x)+cos(x)', 'cos(x)+x*sin(x)', 'xsin(x) + cos x', 'cos(x) + sin(x)·x'];
    for (const s of spellings) expect(expressionsEquivalent(s, 'x*sin(x)+cos(x)'), s).toBe(true);
  });

  it('a polynomial built to vanish on the published primary points is still rejected', () => {
    const reference = 'sin(x)';
    const pts = primaryPoints(referenceSeedKey(normalizeMathExpr(reference)));
    const vanishing = pts.map(p => `(x-(${p}))`).join('*');
    // equal at every primary point, caught by the confirmation stream
    expect(expressionsEquivalent(`sin(x) + ${vanishing}`, reference)).toBe(false);
    // polynomial references are decided exactly, so the attack fails by degree
    expect(expressionsEquivalent(`x + ${vanishing}`, 'x')).toBe(false);
  });

  it('confirmation points vary with the submission', () => {
    expect(confirmationPoints('a')).not.toEqual(confirmationPoints('b'));
  });
});

describe('tolerance is judged at each sample point', () => {
  // A single global scale (the largest value at any point) let e^{4x} ≈ 10^10 at x = 6
  // excuse an error of 1 everywhere: "(1/2)(e^{4b} − 1) + 1" was accepted for I(b).
  it('a large value at one point does not excuse an error at another', () => {
    expect(expressionsEquivalent('(1/2)*(e^(4*x) - 1) + 1', '(1/2)*(e^(4*x) - 1)')).toBe(false);
    expect(expressionsEquivalent('e^(5*x) + x', 'e^(5*x)')).toBe(false);
    expect(expressionsEquivalent('(1/2)*(e^(4*x) - 1)', 'e^(4*x)/2 - 1/2')).toBe(true);
    expect(expressionsEquivalent('(1/2)*(e^(4*b) - 1) + 1', '(1/2)*(e^(4*b) - 1)', {
      domain: { intervals: [{ lo: 0, hi: Infinity, loClosed: false, hiClosed: false }] }, domainPolicy: 'onDeclaredDomain',
    })).toBe(false);
  });
  it('an equation is not satisfied by a residual that is only small next to a large one elsewhere', () => {
    expect(expressionsEquivalent('y = e^(4*x) + 1', 'y = e^(4*x)')).toBe(false);
    expect(expressionsEquivalent('2*y = 2*e^(4*x)', 'y = e^(4*x)')).toBe(true);
  });
});

describe('domain: same partial function (pathological corpus)', () => {
  // submission, reference, verdict
  const corpus: [string, string, boolean][] = [
    ['x/x', '1', false],
    ['(x^2-1)/(x-1)', 'x+1', false],
    ['sqrt(x^2)', 'abs(x)', true],
    ['sqrt(x^2)', 'x', false],
    ['log(x^2)', '2*log(x)', false],          // differ for x < 0
    ['2*log(x)', 'log(x^2)', false],          // and the verdict does not depend on which is the reference
    ['ln(cos(x))', 'ln(abs(cos(x)))', false],
    ['tan(x)', 'sin(x)/cos(x)', true],
    ['1/(x-1)', '(x+1)/(x^2-1)', false],      // hole at x = -1
    ['sin(x)^2+cos(x)^2', '1', true],
    ['theta/theta', '1', false],
    ['x^2/x', 'x', false],
    ['x*sin(x)/sin(x)', 'x', false],
    ['sqrt(x)^2', 'x', false],
    ['exp(log(x))', 'x', false],
    ['(x+1)^2', 'x^2+2x+1', true],
  ];
  for (const [submission, reference, verdict] of corpus) {
    it(`${submission}  vs  ${reference}  →  ${verdict ? 'accept' : 'reject'}`, () => {
      expect(expressionsEquivalent(submission, reference)).toBe(verdict);
    });
  }
});

describe('isAntiderivative — differentiate the submission, compare with the integrand', () => {
  it('accepts every antiderivative of x·cos x, with or without + C', () => {
    for (const F of ['x*sin(x)+cos(x)', 'cos(x)+x*sin(x)', 'xsin(x)+cos(x)+3', 'x sin x + cos x + C']) {
      expect(isAntiderivative(F, 'x*cos(x)', { reference: 'x*sin(x)+cos(x)' }), F).toBe(true);
    }
  });
  it('accepts every antiderivative of x·e^x', () => {
    for (const F of ['exp(x)*(x-1)', '(x-1)e^x', 'xe^x-e^x']) {
      expect(isAntiderivative(F, 'x*e^x', { reference: 'x*e^x-e^x' }), F).toBe(true);
    }
  });
  it('accepts every antiderivative of sin x cos x', () => {
    for (const F of ['sin(x)^2/2', '-cos(x)^2/2', '-cos²(x)/2', '-cos(2x)/4']) {
      expect(isAntiderivative(F, 'sin(x)*cos(x)', { reference: 'sin(x)^2/2' }), F).toBe(true);
    }
  });
  it('compares only on the integrand\'s domain', () => {
    // ln x is defined for x > 0 only; x ln|x| − x is a correct antiderivative there
    for (const F of ['x(ln(x)-1)', 'x·ln(x) - x', 'x*ln|x| - x']) {
      expect(isAntiderivative(F, 'log(x)', { reference: 'x*log(x)-x' }), F).toBe(true);
    }
  });
  it('requires the absolute value in −ln|cos x| (F must be defined wherever f is)', () => {
    for (const F of ['-ln|cos(x)|', 'ln|sec(x)|', 'ln|secx|']) {
      expect(isAntiderivative(F, 'tan(x)', { reference: '-log(abs(cos(x)))' }), F).toBe(true);
    }
    // formal derivative is tan x, but undefined where cos x < 0
    expect(isAntiderivative('-ln(cos(x))', 'tan(x)', { reference: '-log(abs(cos(x)))' })).toBe(false);
    expect(isAntiderivative('ln(sec(x))', 'tan(x)', { reference: '-log(abs(cos(x)))' })).toBe(false);
  });
  it('works without a reference (derivative check alone)', () => {
    expect(isAntiderivative('x^3/3', 'x^2')).toBe(true);
    expect(isAntiderivative('x^3/3 + 7', 'x^2')).toBe(true);
    expect(isAntiderivative('x^3', 'x^2')).toBe(false);
  });
  it('rejects the integrand, wrong functions, and C used as a coefficient', () => {
    expect(isAntiderivative('x*cos(x)', 'x*cos(x)', { reference: 'x*sin(x)+cos(x)' })).toBe(false);
    expect(isAntiderivative('sin(x)*cos(x)', 'sin(x)*cos(x)', { reference: 'sin(x)^2/2' })).toBe(false);
    expect(isAntiderivative('x*sin(x)+cos(x)+x', 'x*cos(x)', { reference: 'x*sin(x)+cos(x)' })).toBe(false);
    expect(isAntiderivative('x*sin(x)+cos(x)+C*x', 'x*cos(x)', { reference: 'x*sin(x)+cos(x)' })).toBe(false);
    expect(isAntiderivative('t*sin(t)+cos(t)', 'x*cos(x)', { reference: 'x*sin(x)+cos(x)' })).toBe(false);
    expect(isAntiderivative('0/0', 'x*cos(x)', { reference: 'x*sin(x)+cos(x)' })).toBe(false);
    expect(isAntiderivative('y = x*sin(x)+cos(x)', 'x*cos(x)')).toBe(false);
  });
  it('rejects a polynomial-vanishing attack on a polynomial integrand exactly', () => {
    const vanishing = FIXED_SAMPLE_POINTS.map(p => `(x-(${p}))`).join('*');
    expect(isAntiderivative(`x^3/3 + ${vanishing}`, 'x^2')).toBe(false);
  });
});

describe('parseNumericInput', () => {
  it('accepts decimals, fractions and exact constant expressions', () => {
    expect(parseNumericInput('0.6')).toBe(0.6);
    expect(parseNumericInput('3/5')).toBe(0.6);
    expect(parseNumericInput('-3/4')).toBe(-0.75);
    expect(parseNumericInput('−3/4')).toBe(-0.75);
    expect(parseNumericInput(' 12 ')).toBe(12);
    expect(parseNumericInput('sqrt(3)/2')).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(parseNumericInput('pi/4')).toBeCloseTo(Math.PI / 4, 12);
    expect(parseNumericInput('e^0.5/384')).toBeCloseTo(Math.exp(0.5) / 384, 12);
    expect(parseNumericInput('1/2!')).toBe(0.5);
  });
  it('accepts any exact expression by default, including arithmetic', () => {
    expect(parseNumericInput('(7+5)/2')).toBe(6);
    expect(parseNumericInput('7+5')).toBe(12);
    expect(parseNumericInput('(1+sqrt(2))/2')).toBeCloseTo((1 + Math.SQRT2) / 2, 12);
    expect(parseNumericInput('e^0.5*0.5^4/24')).toBeCloseTo(Math.exp(0.5) / 384, 12);
  });
  it("'evaluated' form rejects arithmetic that restates the problem", () => {
    const ev = (s: string) => parseNumericInput(s, 'evaluated');
    for (const s of ['7+5', '7*5', '7 - 5', '2(3)', '7*(5)', '(7)(5)', '3^2', '(7+5)/2']) expect(ev(s), s).toBeNull();
    // exact forms with a coefficient are fine, whatever the operand order
    expect(ev('12')).toBe(12);
    expect(ev('10.81')).toBe(10.81);
    expect(ev('3/5')).toBe(0.6);
    expect(ev('4*sqrt(2)')).toBeCloseTo(4 * Math.SQRT2, 12);
    expect(ev('sqrt(2)*2')).toBeCloseTo(2 * Math.SQRT2, 12);
    expect(ev('2*(pi)')).toBeCloseTo(2 * Math.PI, 12);
    expect(ev('2pi')).toBeCloseTo(2 * Math.PI, 12);
  });
  it('rejects non-constants and undefined values', () => {
    for (const s of ['abc', 'x', '1/0', '0/0', '', 'x=2', 'sqrt(-1)', 'NaN', 'Infinity']) {
      expect(parseNumericInput(s), s).toBeNull();
    }
  });
});

describe('numeric policies', () => {
  it('numbersEqual is exact up to floating-point noise', () => {
    expect(numbersEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(numbersEqual(3.3, 3.31)).toBe(false);
    expect(numbersEqual(0.5, 0.5005)).toBe(false);
  });
  it('roundingTolerance is half a unit in the last requested place', () => {
    expect(roundingTolerance(2)).toBeCloseTo(0.005, 8);
    expect(roundingTolerance(3)).toBeCloseTo(0.0005, 8);
  });
});
