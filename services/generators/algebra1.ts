/** Algebra 1. */
import type { GeneratorDef } from './context';
import { exact, latexLinearFactor, latexNum, latexPolynomial, ray } from './context';

export const multiStepEquations: GeneratorDef = {
  topicId: 'multi-step-equations',
  version: 2,
  templates: ['ax+b=cx+d'],
  generate: (ctx) => {
    // ax + b = cx + d with integer solution x
    const x = ctx.int(2, 10);
    const a = ctx.int(2, 8);
    const b = ctx.int(-15, 15);
    const c = ctx.int(1, a - 1);
    const d = (a - c) * x + b;
    ctx.require(a !== c, 'uniqueRealSolution');
    const lhs = latexPolynomial([[a, 'x'], [b, '']]);
    const rhs = latexPolynomial([[c, 'x'], [d, '']]);
    const moved = latexPolynomial([[a - c, 'x'], [b, '']]);
    const constantStep = b === 0 ? '' : ` Then ${b > 0 ? 'subtract' : 'add'} $${Math.abs(b)}$: $${latexPolynomial([[a - c, 'x']])} = ${d - b}$.`;
    return {
      templateId: 'ax+b=cx+d',
      problemText: `$${lhs} = ${rhs}$`,
      answer: exact(x),
      explanation: `Subtract $${latexPolynomial([[c, 'x']])}$ from both sides: $${moved} = ${d}$.${constantStep} Divide by $${a - c}$: $x = ${x}$.`,
      hint: 'Move all x terms to one side and constants to the other.',
    };
  },
};

const OPS = ['<', '>', '≤', '≥'] as const;
type Op = typeof OPS[number];
const texOp = (op: Op) => (op === '≤' ? '\\leq' : op === '≥' ? '\\geq' : op);
const flip = (op: Op): Op => ({ '<': '>', '>': '<', '≤': '≥', '≥': '≤' } as const)[op];

export const inequalities: GeneratorDef = {
  topicId: 'inequalities',
  version: 3,
  templates: ['positive-coefficient', 'negative-coefficient'],
  generate: (ctx) => {
    const negative = ctx.bool(0.4);
    const a = negative ? -ctx.int(2, 5) : ctx.int(2, 5);
    const b = ctx.int(1, 10);
    const solution = negative ? ctx.int(-10, 10) : ctx.int(2, 20);
    const c = a * solution + b;
    const op = ctx.pick(OPS);
    const resultOp = negative ? flip(op) : op;
    return {
      templateId: negative ? 'negative-coefficient' : 'positive-coefficient',
      problemText: `Solve for $x$: $${latexPolynomial([[a, 'x'], [b, '']])} ${texOp(op)} ${c}$\n(Answer as an inequality such as x < 3, or in interval notation.)`,
      answer: ray('x', resultOp, solution),
      explanation: `Subtract $${b}$: $${latexPolynomial([[a, 'x']])} ${texOp(op)} ${c - b}$. Divide by $${a}$`
        + (negative
          ? ` — a negative number, so the inequality reverses: $x ${texOp(resultOp)} ${solution}$.`
          : ` (positive, so the direction is unchanged): $x ${texOp(resultOp)} ${solution}$.`),
      hint: 'Solve it like an equation. Dividing both sides by a negative number reverses the inequality; dividing by a positive number does not.',
    };
  },
};

export const systemsOfEquations: GeneratorDef = {
  topicId: 'systems-of-equations',
  version: 3,
  templates: ['solve-for-x'],
  generate: (ctx) => {
    const x = ctx.int(2, 8);
    const y = ctx.int(2, 8);
    const a1 = ctx.int(1, 5);
    const b1 = ctx.int(1, 5);
    const a2 = ctx.int(1, 5);
    const b2 = ctx.int(1, 5);
    ctx.require(a1 * b2 - a2 * b1 !== 0, 'uniqueRealSolution');
    const c1 = a1 * x + b1 * y;
    const c2 = a2 * x + b2 * y;
    const det = a1 * b2 - a2 * b1;
    return {
      templateId: 'solve-for-x',
      problemText: `$${latexPolynomial([[a1, 'x'], [b1, 'y']])} = ${c1}$\n$${latexPolynomial([[a2, 'x'], [b2, 'y']])} = ${c2}$\nFind $x$:`,
      answer: exact(x),
      explanation: `Eliminate $y$: multiply the first equation by $${b2}$ and the second by $${b1}$, then subtract: $(${a1 * b2} - ${a2 * b1})x = ${c1 * b2} - ${c2 * b1}$, so $${latexPolynomial([[det, 'x']])} = ${c1 * b2 - c2 * b1}$ and $x = ${x}$. (Then $y = ${y}$.)`,
      hint: 'Try using substitution or elimination method.',
    };
  },
};

export const exponents: GeneratorDef = {
  topicId: 'exponents',
  version: 2,
  templates: ['product', 'quotient', 'power'],
  generate: (ctx) => {
    const base = ctx.int(2, 5);
    const exp1 = ctx.int(2, 4);
    const exp2 = ctx.int(2, 4);
    const rule = ctx.pick(['product', 'quotient', 'power'] as const);
    const forms = {
      product: {
        text: `$${base}^{${exp1}} \\times ${base}^{${exp2}}$`, answer: exp1 + exp2,
        explanation: `Same base, multiplying: add the exponents. $${base}^{${exp1}} \\times ${base}^{${exp2}} = ${base}^{${exp1} + ${exp2}} = ${base}^{${exp1 + exp2}}$.`,
        hint: 'When multiplying: add exponents.',
      },
      quotient: {
        text: `$${base}^{${exp1 + exp2}} \\div ${base}^{${exp2}}$`, answer: exp1,
        explanation: `Same base, dividing: subtract the exponents. $${base}^{${exp1 + exp2}} \\div ${base}^{${exp2}} = ${base}^{${exp1 + exp2} - ${exp2}} = ${base}^{${exp1}}$.`,
        hint: 'When dividing: subtract exponents.',
      },
      power: {
        text: `$(${base}^{${exp1}})^{${exp2}}$`, answer: exp1 * exp2,
        explanation: `Power of a power: multiply the exponents. $(${base}^{${exp1}})^{${exp2}} = ${base}^{${exp1} \\cdot ${exp2}} = ${base}^{${exp1 * exp2}}$.`,
        hint: 'When raising to a power: multiply exponents.',
      },
    };
    const chosen = forms[rule];
    return {
      templateId: rule,
      problemText: `Simplify: ${chosen.text}\nWhat is the simplified exponent? (The answer is $${base}^{?}$)`,
      answer: exact(chosen.answer),
      explanation: chosen.explanation,
      hint: chosen.hint,
    };
  },
};

export const polynomials: GeneratorDef = {
  topicId: 'polynomials',
  version: 2,
  templates: ['add', 'subtract'],
  generate: (ctx) => {
    const p = [ctx.int(1, 5), ctx.int(-10, 10), ctx.int(-10, 10)];
    const q = [ctx.int(1, 5), ctx.int(-10, 10), ctx.int(-10, 10)];
    const operation = ctx.pick(['+', '-'] as const);
    const sign = operation === '+' ? 1 : -1;
    const r = p.map((v, i) => v + sign * q[i]);
    const poly = (c: number[]) => latexPolynomial([[c[0], 'x^2'], [c[1], 'x'], [c[2], '']]);
    return {
      templateId: operation === '+' ? 'add' : 'subtract',
      problemText: `$(${poly(p)}) ${operation} (${poly(q)})$\nWhat is the coefficient of $x$?`,
      answer: exact(r[1]),
      explanation: `Combine the coefficients of $x$: $${p[1]} ${operation} ${latexNum(q[1])} = ${r[1]}$. (Full result: $${poly(r)}$.)`,
      hint: 'Combine like terms: match x² with x², x with x, and constants with constants.',
    };
  },
};

export const factoring: GeneratorDef = {
  topicId: 'factoring',
  version: 2,
  templates: ['monic-quadratic'],
  generate: (ctx) => {
    // (x + a)(x + b) = x² + (a+b)x + ab, with a, b nonzero
    const a = ctx.pick([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    const b = ctx.pick([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    const quadratic = latexPolynomial([[1, 'x^2'], [a + b, 'x'], [a * b, '']]);
    return {
      templateId: 'monic-quadratic',
      problemText: `Factor: $${quadratic}$\nWhat is the smaller constant in the factors?`,
      answer: exact(Math.min(a, b)),
      explanation: `Find two numbers that multiply to $${a * b}$ and add to $${a + b}$: $${a}$ and $${b}$. So $${quadratic} = ${latexLinearFactor('x', -a)}${latexLinearFactor('x', -b)}$; the smaller constant is $${Math.min(a, b)}$.`,
      hint: `Find two numbers that multiply to $${a * b}$ and add to $${a + b}$.`,
    };
  },
};

export const quadraticEquations: GeneratorDef = {
  topicId: 'quadratic-equations',
  version: 3,
  templates: ['factorable-monic'],
  generate: (ctx) => {
    // (x − a)(x − b) = 0
    const a = ctx.pick([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    const b = ctx.pick([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    ctx.require(a !== b, 'distinctRoots');
    const quadratic = latexPolynomial([[1, 'x^2'], [-(a + b), 'x'], [a * b, '']]);
    return {
      templateId: 'factorable-monic',
      problemText: `Solve for $x$: $${quadratic} = 0$\nWhat is the larger solution?`,
      answer: exact(Math.max(a, b)),
      explanation: `Factor: $${latexLinearFactor('x', a)}${latexLinearFactor('x', b)} = 0$, so $x = ${a}$ or $x = ${b}$. The larger solution is $${Math.max(a, b)}$.`,
      hint: `Try factoring first, or use the quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$`,
    };
  },
};

