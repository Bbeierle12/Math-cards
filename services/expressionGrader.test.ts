import { describe, it, expect } from 'vitest';
import {
  normalizeMathExpr, expressionsEquivalent, parseNumericInput, numbersEqual, roundingTolerance, freeVariables,
} from './expressionGrader';

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
});

describe('freeVariables', () => {
  it('ignores function names and constants', () => {
    expect(freeVariables('x*sin(x)+cos(x)').sort()).toEqual(['x']);
    expect(freeVariables('pi/4+e')).toEqual([]);
    expect(freeVariables('2*sin(theta)').sort()).toEqual(['theta']);
  });
});

describe('expressionsEquivalent — exact', () => {
  it('accepts algebraically equal forms', () => {
    expect(expressionsEquivalent('x^2-6x+10', '(x-3)^2+1')).toBe(true);
    expect(expressionsEquivalent('1+x+x^2/2!+x^3/3!', '1+x+x^2/2+x^3/6')).toBe(true);
    expect(expressionsEquivalent('tan(θ)', 'sin(theta)/cos(theta)')).toBe(true);
    expect(expressionsEquivalent('1/cos^2(θ)', 'sec(theta)^2')).toBe(true);
  });

  it('rejects near misses that the old 0.001 absolute tolerance let through', () => {
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

  it('handles "u = ..." for a bare stored expression', () => {
    expect(expressionsEquivalent('u = x^2+5', 'x^2+5')).toBe(true);
    expect(expressionsEquivalent('u = x^2+6', 'x^2+5')).toBe(false);
    expect(expressionsEquivalent('x = x^2+5', 'x^2+5')).toBe(false); // lhs collides with the variable
  });

  it('compares equations side by side with any parameter name', () => {
    expect(expressionsEquivalent('x=2sin(t)', 'x=2sin(theta)')).toBe(true);
    expect(expressionsEquivalent('x = 2*sin(θ)', 'x=2sin(theta)')).toBe(true);
    expect(expressionsEquivalent('2sin(u)=x', 'x=2sin(theta)')).toBe(true);
    expect(expressionsEquivalent('x=3sin(theta)', 'x=2sin(theta)')).toBe(false);
    expect(expressionsEquivalent('x=2cos(theta)', 'x=2sin(theta)')).toBe(false); // a different (valid) substitution: alt list, not equivalence
    expect(expressionsEquivalent('2sin(theta)', 'x=2sin(theta)')).toBe(false);
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

describe('expressionsEquivalent — adversarial soundness', () => {
  it('rejects rewrites that are undefined at critical points', () => {
    expect(expressionsEquivalent('x/x', '1')).toBe(false);
    expect(expressionsEquivalent('theta/theta', '1')).toBe(false);
    expect(expressionsEquivalent('x^2/x', 'x')).toBe(false);
    expect(expressionsEquivalent('x*sin(x)/sin(x)', 'x')).toBe(false);
    expect(expressionsEquivalent('(x^2-1)/(x-1)', 'x+1')).toBe(false);
  });

  it('rejects a polynomial engineered to vanish on the old fixed sample points', () => {
    const oldPoints = [0.37, 0.91, 1.43, 2.17, 2.86, 3.52, 4.31, -0.64, -1.77, -2.93, 5.09, -4.23];
    const vanishing = oldPoints.map(p => `(x-(${p}))`).join('*');
    expect(expressionsEquivalent(`x + ${vanishing}`, 'x')).toBe(false);
    expect(expressionsEquivalent(`x + ${vanishing}`, 'x', 'up-to-constant')).toBe(false);
    // and one that also vanishes at the new fixed critical points
    const all = [...oldPoints, 0, 1, -1, 2, -2, 0.5].map(p => `(x-(${p}))`).join('*');
    expect(expressionsEquivalent(`x + ${all}`, 'x')).toBe(false);
  });

  it('accepts genuinely equal rewrites at every point', () => {
    expect(expressionsEquivalent('(x+1)^2', 'x^2+2x+1')).toBe(true);
    expect(expressionsEquivalent('sin(x)^2+cos(x)^2', '1')).toBe(true);
    expect(expressionsEquivalent('2*x/2', 'x')).toBe(true);
  });

  it('equations match up to a nonzero constant factor and rearrangement', () => {
    expect(expressionsEquivalent('2*x=4*sin(theta)', 'x=2*sin(theta)')).toBe(true);
    expect(expressionsEquivalent('x/2 = sin(t)', 'x=2sin(theta)')).toBe(true);
    expect(expressionsEquivalent('x - 2sin(θ) = 0', 'x=2sin(theta)')).toBe(true);
    expect(expressionsEquivalent('-x = -2sin(theta)', 'x=2sin(theta)')).toBe(true);
    expect(expressionsEquivalent('x^2 = 4*sin(theta)^2', 'x=2sin(theta)')).toBe(false); // squaring changes the solution set
    expect(expressionsEquivalent('x = 2sin(theta) + 1', 'x=2sin(theta)')).toBe(false);
    expect(expressionsEquivalent('0*x = 0', 'x=2sin(theta)')).toBe(false);
  });
});

describe('expressionsEquivalent — up to an additive constant (antiderivatives)', () => {
  const C = 'up-to-constant';
  it('accepts every antiderivative of x·cos x', () => {
    expect(expressionsEquivalent('cos(x)+x*sin(x)', 'x*sin(x)+cos(x)', C)).toBe(true);
    expect(expressionsEquivalent('xsin(x)+cos(x)+3', 'x*sin(x)+cos(x)', C)).toBe(true);
  });
  it('accepts every antiderivative of x·e^x', () => {
    expect(expressionsEquivalent('exp(x)*(x-1)', 'x*e^x-e^x', C)).toBe(true);
    expect(expressionsEquivalent('(x-1)e^x', 'x*e^x-e^x', C)).toBe(true);
    expect(expressionsEquivalent('xe^x-e^x', 'x*e^x-e^x', C)).toBe(true);
  });
  it('accepts every antiderivative of sin x cos x', () => {
    expect(expressionsEquivalent('-cos(x)^2/2', 'sin(x)^2/2', C)).toBe(true);
    expect(expressionsEquivalent('-cos²(x)/2', 'sin(x)^2/2', C)).toBe(true);
    expect(expressionsEquivalent('-cos(2x)/4', 'sin(x)^2/2', C)).toBe(true);
  });
  it('accepts ln-form antiderivatives', () => {
    expect(expressionsEquivalent('x(ln(x)-1)', 'x*log(x)-x', C)).toBe(true);
    expect(expressionsEquivalent('x·ln(x) - x', 'x*log(x)-x', C)).toBe(true);
  });
  it('requires the absolute value in -ln|cos x|', () => {
    expect(expressionsEquivalent('-ln|cos(x)|', '-log(abs(cos(x)))', C)).toBe(true);
    expect(expressionsEquivalent('ln|sec(x)|', '-log(abs(cos(x)))', C)).toBe(true);
    expect(expressionsEquivalent('ln|secx|', '-log(abs(cos(x)))', C)).toBe(true);
    // undefined (complex) where cos x < 0: not a real-valued antiderivative on the domain of tan
    expect(expressionsEquivalent('-ln(cos(x))', '-log(abs(cos(x)))', C)).toBe(false);
    expect(expressionsEquivalent('ln(sec(x))', '-log(abs(cos(x)))', C)).toBe(false);
  });
  it('rejects the integrand and other wrong functions', () => {
    expect(expressionsEquivalent('x*cos(x)', 'x*sin(x)+cos(x)', C)).toBe(false);
    expect(expressionsEquivalent('sin(x)*cos(x)', 'sin(x)^2/2', C)).toBe(false);
    expect(expressionsEquivalent('x*sin(x)+cos(x)+x', 'x*sin(x)+cos(x)', C)).toBe(false);
  });
});

describe('parseNumericInput', () => {
  it('accepts decimals, fractions and exact constant expressions', () => {
    expect(parseNumericInput('0.6')).toBe(0.6);
    expect(parseNumericInput('3/5')).toBe(0.6);
    expect(parseNumericInput('-3/4')).toBe(-0.75);
    expect(parseNumericInput(' 12 ')).toBe(12);
    expect(parseNumericInput('sqrt(3)/2')).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(parseNumericInput('pi/4')).toBeCloseTo(Math.PI / 4, 12);
    expect(parseNumericInput('e^0.5/384')).toBeCloseTo(Math.exp(0.5) / 384, 12);
    expect(parseNumericInput('1/2!')).toBe(0.5);
  });
  it('rejects arithmetic that merely restates the problem', () => {
    expect(parseNumericInput('7+5')).toBeNull();
    expect(parseNumericInput('7*5')).toBeNull();
    expect(parseNumericInput('7 - 5')).toBeNull();
    expect(parseNumericInput('2(3)')).toBeNull();
    expect(parseNumericInput('7*(5)')).toBeNull();
    expect(parseNumericInput('(7)(5)')).toBeNull();
    expect(parseNumericInput('3^2')).toBeNull();
    expect(parseNumericInput('(7+5)/2')).toBeNull();
    // exact forms with a coefficient are fine, whatever the operand order
    expect(parseNumericInput('4*sqrt(2)')).toBeCloseTo(4 * Math.SQRT2, 12);
    expect(parseNumericInput('sqrt(2)*2')).toBeCloseTo(2 * Math.SQRT2, 12);
    expect(parseNumericInput('2*(pi)')).toBeCloseTo(2 * Math.PI, 12);
    expect(parseNumericInput('2sqrt(2)')).toBeCloseTo(2 * Math.SQRT2, 12);
    expect(parseNumericInput('2pi')).toBeCloseTo(2 * Math.PI, 12);
    expect(parseNumericInput('(1+sqrt(2))/2')).toBeCloseTo((1 + Math.SQRT2) / 2, 12);
    expect(parseNumericInput('sqrt(32)')).toBeCloseTo(4 * Math.SQRT2, 12);
  });
  it('rejects non-constants and undefined values', () => {
    expect(parseNumericInput('abc')).toBeNull();
    expect(parseNumericInput('x')).toBeNull();
    expect(parseNumericInput('1/0')).toBeNull();
    expect(parseNumericInput('0/0')).toBeNull();
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('x=2')).toBeNull();
    expect(parseNumericInput('sqrt(-1)')).toBeNull();
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
