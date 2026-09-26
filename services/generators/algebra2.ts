/** Algebra 2. */
import type { GeneratorDef } from './context';
import { exact, fractionAnswer, gcd, latexNum, latexPolynomial, ordinalSuffix, simplifyFraction } from './context';

export const complexNumbers: GeneratorDef = {
  topicId: 'complex-numbers',
  version: 2,
  generate: (ctx) => {
    const [a1, b1, a2, b2] = [ctx.int(-8, 8), ctx.int(-8, 8), ctx.int(-8, 8), ctx.int(-8, 8)];
    const operation = ctx.pick(['+', '-'] as const);
    const sign = operation === '+' ? 1 : -1;
    const real = a1 + sign * a2;
    const imag = b1 + sign * b2;
    const z = (a: number, b: number) => latexPolynomial([[a, ''], [b, 'i']]);
    return {
      templateId: operation === '+' ? 'add' : 'subtract',
      problemText: `$(${z(a1, b1)}) ${operation} (${z(a2, b2)})$\nWhat is the imaginary part (the coefficient of $i$)?`,
      answer: exact(imag),
      explanation: `Real parts: $${a1} ${operation} ${latexNum(a2)} = ${real}$. Imaginary parts: $${b1} ${operation} ${latexNum(b2)} = ${imag}$. Result: $${z(real, imag)}$, so the imaginary part is $${imag}$.`,
      hint: 'Combine real parts and imaginary parts separately.',
    };
  },
};

export const rationalExpressions: GeneratorDef = {
  topicId: 'rational-expressions',
  version: 3,
  generate: (ctx) => {
    // (ax)/(bx) = a/b for x ≠ 0, entered in lowest terms
    const a = ctx.int(2, 9);
    const b = ctx.int(2, 9);
    ctx.require(a !== b, 'answerNotTrivial');
    const s = simplifyFraction(a, b);
    const reduced = s.denominator === 1 ? `${s.numerator}` : `\\frac{${s.numerator}}{${s.denominator}}`;
    return {
      templateId: 'cancel-common-factor',
      problemText: `Simplify $\\frac{${a}x}{${b}x}$ for $x \\neq 0$.\nEnter the result as a fraction in lowest terms.`,
      answer: fractionAnswer(a, b, { lowestTerms: true }),
      explanation: `Cancel the common factor $x$ (allowed because $x \\neq 0$): $\\frac{${a}x}{${b}x} = \\frac{${a}}{${b}}$${gcd(a, b) > 1 ? `, and dividing top and bottom by $${gcd(a, b)}$ gives $${reduced}$` : ''}.`,
      hint: 'Cancel common factors in the numerator and denominator, then reduce.',
    };
  },
};

export const radicals: GeneratorDef = {
  topicId: 'radicals',
  version: 2,
  generate: (ctx) => {
    const multiplier = ctx.pick([2, 3, 5, 7]);
    const perfect = ctx.pick([4, 9, 16, 25, 36, 49, 64, 81, 100]);
    const radicand = multiplier * perfect;
    const outside = Math.sqrt(perfect);
    return {
      templateId: 'simplify-square-root',
      problemText: `Simplify $\\sqrt{${radicand}}$. What number is outside the radical?`,
      answer: exact(outside),
      displayAnswer: `$${outside}$ (since $\\sqrt{${radicand}} = ${outside}\\sqrt{${multiplier}}$)`,
      explanation: `$\\sqrt{${radicand}} = \\sqrt{${perfect} \\times ${multiplier}} = \\sqrt{${perfect}}\\sqrt{${multiplier}} = ${outside}\\sqrt{${multiplier}}$`,
      hint: `Look for perfect square factors. ${radicand} = ${multiplier} × ${perfect}`,
    };
  },
};

export const logarithms: GeneratorDef = {
  topicId: 'logarithms',
  version: 2,
  generate: (ctx) => {
    const base = ctx.pick([2, 3, 10]);
    const exponent = ctx.int(2, 4);
    const value = base ** exponent;
    return {
      templateId: 'evaluate-log',
      problemText: `$\\log_{${base}}(${value}) = \\;?$`,
      answer: exact(exponent),
      explanation: `$${base}^{${exponent}} = ${value}$, so $\\log_{${base}}(${value}) = ${exponent}$.`,
      hint: `Ask yourself: ${base} to what power equals ${value}?`,
    };
  },
};

export const sequencesSeries: GeneratorDef = {
  topicId: 'sequences-series',
  version: 2,
  generate: (ctx) => {
    if (ctx.bool()) {
      const a1 = ctx.int(3, 15);
      const d = ctx.int(2, 8);
      const n = ctx.int(8, 12);
      const an = a1 + (n - 1) * d;
      return {
        templateId: 'arithmetic-nth-term',
        problemText: `An arithmetic sequence starts at $${a1}$ with common difference $d = ${d}$. Find the $${n}$${ordinalSuffix(n)} term.`,
        answer: exact(an),
        explanation: `$a_n = a_1 + (n-1)d = ${a1} + (${n}-1)(${d}) = ${a1} + ${(n - 1) * d} = ${an}$`,
        hint: 'Use the formula: $a_n = a_1 + (n-1)d$',
      };
    }
    const a1 = ctx.int(2, 5);
    const r = ctx.pick([2, 3]);
    const n = ctx.int(4, 6);
    const an = a1 * r ** (n - 1);
    return {
      templateId: 'geometric-nth-term',
      problemText: `A geometric sequence starts at $${a1}$ with common ratio $r = ${r}$. Find the $${n}$${ordinalSuffix(n)} term.`,
      answer: exact(an),
      explanation: `$a_n = a_1 \\cdot r^{n-1} = ${a1} \\cdot ${r}^{${n - 1}} = ${a1} \\cdot ${r ** (n - 1)} = ${an}$`,
      hint: 'Use the formula: $a_n = a_1 \\cdot r^{n-1}$',
    };
  },
};
