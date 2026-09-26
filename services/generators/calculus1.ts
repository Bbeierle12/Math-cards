/** Calculus 1. */
import type { GeneratorDef } from './context';
import { exact, latexPolynomial, latexPower, latexTerm } from './context';

export const limits: GeneratorDef = {
  topicId: 'limits',
  version: 2,
  generate: (ctx) => {
    const a = ctx.int(2, 8);
    const b = ctx.int(-10, 10);
    const x = ctx.int(1, 5);
    const answer = a * x + b;
    return {
      templateId: 'polynomial-substitution',
      problemText: `Evaluate: $\\displaystyle\\lim_{x \\to ${x}} \\left[${latexPolynomial([[a, 'x'], [b, '']])}\\right]$`,
      answer: exact(answer),
      explanation: `Polynomials are continuous, so substitute $x = ${x}$: $${a} \\cdot ${x}${b === 0 ? '' : ` ${latexTerm(b)}`} = ${answer}$.`,
      hint: 'For polynomial functions, just substitute the value!',
    };
  },
};

export const derivativesBasic: GeneratorDef = {
  topicId: 'derivatives-basic',
  version: 2,
  generate: (ctx) => {
    const c = ctx.int(2, 10);
    const n = ctx.int(2, 5);
    return {
      templateId: 'power-rule-coefficient',
      problemText: `Find the derivative of $${c}x^{${n}}$. What is the coefficient?`,
      answer: exact(c * n),
      explanation: `Power rule: $\\frac{d}{dx}[${c}x^{${n}}] = ${c} \\cdot ${n} x^{${n} - 1} = ${c * n}${latexPower('x', n - 1)}$. The coefficient is $${c * n}$.`,
      hint: 'Power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$',
    };
  },
};

export const derivativesProductQuotient: GeneratorDef = {
  topicId: 'derivatives-product-quotient',
  version: 2,
  generate: (ctx) => {
    const a = ctx.int(2, 6);
    const b = ctx.int(2, 6);
    if (ctx.bool()) {
      return {
        templateId: 'product-of-powers',
        problemText: `Find $\\frac{d}{dx}\\left[x^{${a}} \\cdot x^{${b}}\\right]$. What is the new exponent?`,
        answer: exact(a + b - 1),
        explanation: `$x^{${a}} \\cdot x^{${b}} = x^{${a + b}}$, and $\\frac{d}{dx}[x^{${a + b}}] = ${a + b}x^{${a + b - 1}}$. The new exponent is $${a + b - 1}$.`,
        hint: 'Simplify first: $x^a \\cdot x^b = x^{a+b}$, then use power rule.',
      };
    }
    // x^a / x^b with a ≠ b (x^a/x^a = 1 has derivative 0, which has no exponent to ask about)
    ctx.require(a !== b, 'quotient is not constant');
    return {
      templateId: 'quotient-of-powers',
      problemText: `Simplify then find $\\frac{d}{dx}\\left[\\frac{x^{${a}}}{x^{${b}}}\\right]$ (for $x \\neq 0$). What is the new exponent?`,
      answer: exact(a - b - 1),
      explanation: `$\\frac{x^{${a}}}{x^{${b}}} = x^{${a - b}}$ for $x \\neq 0$, and $\\frac{d}{dx}[x^{${a - b}}] = ${a - b}x^{${a - b - 1}}$. The new exponent is $${a - b - 1}$.`,
      hint: 'Simplify first: $\\frac{x^a}{x^b} = x^{a-b}$, then use power rule.',
    };
  },
};

export const chainRule: GeneratorDef = {
  topicId: 'chain-rule',
  version: 2,
  generate: (ctx) => {
    const n = ctx.int(2, 5);
    const a = ctx.int(2, 4);
    const b = ctx.int(1, 8);
    const inner = `${a}x + ${b}`;
    return {
      templateId: 'linear-inner',
      problemText: `Find $\\frac{d}{dx}\\left[(${inner})^{${n}}\\right]$.\nThe derivative has the form $K(${inner})^{${n - 1}}$. What is $K$?`,
      answer: exact(n * a),
      explanation: `Chain rule: $${n}(${inner})^{${n - 1}} \\cdot ${a} = ${n * a}(${inner})^{${n - 1}}$, so $K = ${n * a}$.`,
      hint: `Chain rule: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$`,
    };
  },
};

export const integralsBasic: GeneratorDef = {
  topicId: 'integrals-basic',
  version: 2,
  generate: (ctx) => {
    const c = ctx.int(2, 10);
    const n = ctx.int(1, 4);
    const coeffs = c % (n + 1) === 0 ? `${c / (n + 1)}` : `\\frac{${c}}{${n + 1}}`;
    return {
      templateId: 'power-rule-exponent',
      problemText: `$\\displaystyle\\int ${c}${latexPower('x', n)}\\,dx$. What is the new exponent?`,
      answer: exact(n + 1),
      explanation: `Power rule: $\\int ${c}${latexPower('x', n)}\\,dx = ${coeffs}x^{${n + 1}} + C$. The new exponent is $${n + 1}$.`,
      hint: 'Power rule: $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C$ for $n \\neq -1$',
    };
  },
};

export const integrationSubstitution: GeneratorDef = {
  topicId: 'integration-substitution',
  version: 2,
  generate: (ctx) => {
    const n = ctx.int(2, 4);
    const c = ctx.int(1, 5);
    return {
      templateId: 'inner-derivative-present',
      problemText: `$\\displaystyle\\int 2x(x^2 + ${c})^{${n}}\\,dx$\nWhat substitution $u$ should you use?`,
      answer: { kind: 'expression', reference: `x^2+${c}`, assignable: ['u'] },
      displayAnswer: `$u = x^2 + ${c}$`,
      explanation: `Let $u = x^2 + ${c}$. Then $du = 2x\\,dx$, which is exactly the remaining factor, so the integral becomes $\\int u^{${n}}\\,du$.`,
      hint: 'Look for a function whose derivative is also in the integrand.',
    };
  },
};
