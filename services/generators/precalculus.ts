/** Pre-calculus. */
import type { GeneratorDef } from './context';
import { exact, latexLinearFactor, latexNum, latexPolynomial } from './context';

export const functions: GeneratorDef = {
  topicId: 'functions',
  version: 2,
  templates: ['evaluate-linear'],
  generate: (ctx) => {
    const a = ctx.int(2, 5);
    const b = ctx.int(1, 8);
    const x = ctx.int(-5, 5);
    const result = a * x + b;
    return {
      templateId: 'evaluate-linear',
      problemText: `If $f(x) = ${latexPolynomial([[a, 'x'], [b, '']])}$, find $f(${x})$`,
      answer: exact(result),
      explanation: `$f(${x}) = ${a} \\cdot ${latexNum(x)} + ${b} = ${a * x} + ${b} = ${result}$`,
      hint: `Substitute ${x} for x in the function.`,
    };
  },
};

export const polynomialFunctions: GeneratorDef = {
  topicId: 'polynomial-functions',
  version: 3,
  templates: ['two-roots', 'double-root'],
  generate: (ctx) => {
    // (x − a)(x − b) = 0: every real root must be given
    const a = ctx.int(-5, 5);
    const b = ctx.int(-5, 5);
    const quadratic = latexPolynomial([[1, 'x^2'], [-(a + b), 'x'], [a * b, '']]);
    const roots = a === b ? [a] : [Math.min(a, b), Math.max(a, b)];
    const factored = a === b ? `${latexLinearFactor('x', a)}^2` : `${latexLinearFactor('x', a)}${latexLinearFactor('x', b)}`;
    return {
      templateId: a === b ? 'double-root' : 'two-roots',
      problemText: `Find all real roots of $${quadratic} = 0$.\n(Separate roots with commas.)`,
      answer: { kind: 'finiteSet', elements: roots },
      displayAnswer: roots.map(r => `$x = ${r}$`).join(' and '),
      explanation: `Factor: $${quadratic} = ${factored}$, so ${a === b ? `the only root is $x = ${a}$ (a double root)` : `the roots are $x = ${a}$ and $x = ${b}$`}.`,
      hint: 'Factor the polynomial or use the quadratic formula.',
    };
  },
};

export const rationalFunctions: GeneratorDef = {
  topicId: 'rational-functions',
  version: 2,
  templates: ['reciprocal-linear'],
  generate: (ctx) => {
    const a = ctx.int(-8, 8);
    const denominator = latexPolynomial([[1, 'x'], [-a, '']]);
    return {
      templateId: 'reciprocal-linear',
      problemText: `Find the vertical asymptote of $f(x) = \\frac{1}{${denominator}}$. Enter the value of $x$.`,
      answer: exact(a),
      displayAnswer: `$x = ${a}$`,
      explanation: `The numerator is never zero, so the vertical asymptote is where the denominator vanishes: $${denominator} = 0 \\Rightarrow x = ${a}$.`,
      hint: 'Set the denominator equal to zero.',
    };
  },
};

export const exponentialFunctions: GeneratorDef = {
  topicId: 'exponential-functions',
  version: 2,
  templates: ['doubling'],
  generate: (ctx) => {
    const p0 = ctx.int(100, 500);
    const t = ctx.int(1, 4);
    const value = p0 * 2 ** t;
    return {
      templateId: 'doubling',
      problemText: `A population starts at $${p0}$ and doubles every period. What is the population after $${t}$ period(s)?`,
      answer: exact(value),
      explanation: `$P(${t}) = ${p0} \\cdot 2^{${t}} = ${p0} \\cdot ${2 ** t} = ${value}$`,
      hint: 'Use the formula $P(t) = P_0 \\cdot 2^t$',
    };
  },
};

export const conicSections: GeneratorDef = {
  topicId: 'conic-sections',
  version: 2,
  templates: ['circle-center-x', 'circle-radius'],
  generate: (ctx) => {
    const r = ctx.int(3, 10);
    const h = ctx.int(-5, 5);
    const k = ctx.int(-5, 5);
    const square = (v: string, c: number) => `${latexLinearFactor(v, c)}^2`;
    const circle = `${square('x', h)} + ${square('y', k)} = ${r * r}`;
    const askRadius = ctx.bool();
    return {
      templateId: askRadius ? 'circle-radius' : 'circle-center-x',
      problemText: askRadius
        ? `Find the radius of the circle: $${circle}$`
        : `Find the $x$-coordinate of the center: $${circle}$`,
      answer: exact(askRadius ? r : h),
      explanation: `Compare with $(x-h)^2 + (y-k)^2 = r^2$: $h = ${h}$, $k = ${k}$, $r^2 = ${r * r}$ so $r = ${r}$.`,
      hint: 'Standard form: $(x-h)^2 + (y-k)^2 = r^2$, center $(h,k)$, radius $r$',
    };
  },
};
