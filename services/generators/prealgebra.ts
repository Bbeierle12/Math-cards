/** Pre-algebra. */
import type { GeneratorDef } from './context';
import { exact, fractionAnswer, latexFrac, latexFraction, latexNum, roundTo, simplifyFraction } from './context';

export const simpleLinearEquations: GeneratorDef = {
  topicId: 'simple-linear-equations',
  version: 2,
  templates: ['ax+b=c'],
  generate: (ctx) => {
    const x = ctx.int(2, 10);
    const a = ctx.int(2, 5);
    const b = ctx.int(1, 15);
    const c = a * x + b;
    return {
      templateId: 'ax+b=c',
      problemText: `$${a}x + ${b} = ${c}$`,
      answer: exact(x),
      explanation: `Subtract $${b}$ from both sides: $${a}x = ${c - b}$. Divide by $${a}$: $x = ${x}$.`,
      hint: `First, subtract ${b} from both sides.`,
    };
  },
};

export const fractionsBasic: GeneratorDef = {
  topicId: 'fractions-basic',
  version: 2,
  templates: ['add', 'subtract', 'multiply', 'divide'],
  generate: (ctx) => {
    const op = ctx.pick(['+', '-', '×', '÷'] as const);
    const num1 = ctx.int(1, 9);
    const den1 = ctx.int(2, 10);
    const num2 = ctx.int(1, 9);
    const den2 = ctx.int(2, 10);
    const [answerNum, answerDen] =
      op === '+' ? [num1 * den2 + num2 * den1, den1 * den2]
        : op === '-' ? [num1 * den2 - num2 * den1, den1 * den2]
          : op === '×' ? [num1 * num2, den1 * den2]
            : [num1 * den2, den1 * num2];
    const simplified = simplifyFraction(answerNum, answerDen);
    const unsimplified = latexFrac(answerNum, answerDen);
    const simplifyNote = answerDen === simplified.denominator ? '' : `, which simplifies to $${latexFraction(answerNum, answerDen)}$`;
    const explanation = op === '+' || op === '-'
      ? `Common denominator $${den1 * den2}$: $${latexFrac(num1 * den2, den1 * den2)} ${op} ${latexFrac(num2 * den1, den1 * den2)} = ${unsimplified}$${simplifyNote}.`
      : op === '×'
        ? `Multiply numerators and denominators: $\\frac{${num1} \\times ${num2}}{${den1} \\times ${den2}} = ${unsimplified}$${simplifyNote}.`
        : `Multiply by the reciprocal: $${latexFrac(num1, den1)} \\times ${latexFrac(den2, num2)} = ${unsimplified}$${simplifyNote}.`;
    return {
      templateId: { '+': 'add', '-': 'subtract', '×': 'multiply', '÷': 'divide' }[op],
      problemText: `$${latexFrac(num1, den1)} ${op === '×' ? '\\times' : op === '÷' ? '\\div' : op} ${latexFrac(num2, den2)} = \\;?$`,
      answer: fractionAnswer(answerNum, answerDen),
      explanation,
      hint: op === '+' || op === '-' ? 'Find a common denominator first.' : op === '×' ? 'Multiply numerators and denominators.' : 'Flip and multiply!',
    };
  },
};

export const decimals: GeneratorDef = {
  topicId: 'decimals',
  version: 3,
  templates: ['add', 'subtract', 'multiply'],
  generate: (ctx) => {
    const op = ctx.pick(['+', '-', '×'] as const);
    let a = ctx.int(1, 99) / 10;
    let b = ctx.int(1, 99) / 10;
    // Negative numbers are introduced later (Integers), so differences stay >= 0.
    if (op === '-' && a < b) [a, b] = [b, a];
    const value = op === '+' ? a + b : op === '-' ? a - b : a * b;
    // Sums/differences of tenths and products of tenths are exact to 2 places.
    const result = roundTo(value, 2);
    return {
      templateId: { '+': 'add', '-': 'subtract', '×': 'multiply' }[op],
      problemText: `$${a} ${op === '×' ? '\\times' : op} ${b} = \\;?$`,
      answer: exact(result, 'evaluated'),
      explanation: `$${a} ${op === '×' ? '\\times' : op} ${b} = ${result}$`,
      hint: op === '×'
        ? 'Multiply as whole numbers, then place the decimal point (count the decimal digits in both factors).'
        : 'Line up the decimal points when adding or subtracting.',
    };
  },
};

export const orderOfOperations: GeneratorDef = {
  topicId: 'order-of-operations',
  version: 2,
  templates: ['a+b*c', '(a+b)*c', 'a*b+c*d'],
  generate: (ctx) => {
    const a = ctx.int(1, 10);
    const b = ctx.int(1, 10);
    const c = ctx.int(1, 10);
    const d = ctx.int(1, 5);
    const form = ctx.pick(['a+b*c', '(a+b)*c', 'a*b+c*d'] as const);
    let text: string;
    let answer: number;
    let explanation: string;
    if (form === 'a+b*c') {
      text = `$${a} + ${b} \\times ${c}$`;
      answer = a + b * c;
      explanation = `Multiply first: $${b} \\times ${c} = ${b * c}$. Then add: $${a} + ${b * c} = ${answer}$.`;
    } else if (form === '(a+b)*c') {
      text = `$(${a} + ${b}) \\times ${c}$`;
      answer = (a + b) * c;
      explanation = `Parentheses first: $${a} + ${b} = ${a + b}$. Then multiply: $${a + b} \\times ${c} = ${answer}$.`;
    } else {
      text = `$${a} \\times ${b} + ${c} \\times ${d}$`;
      answer = a * b + c * d;
      explanation = `Do both multiplications first: $${a} \\times ${b} = ${a * b}$ and $${c} \\times ${d} = ${c * d}$. Then add: $${a * b} + ${c * d} = ${answer}$.`;
    }
    return {
      templateId: form,
      problemText: `${text} $= \\;?$`,
      answer: exact(answer, 'evaluated'),
      explanation,
      hint: 'Remember PEMDAS: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction.',
    };
  },
};

export const integers: GeneratorDef = {
  topicId: 'integers',
  version: 2,
  templates: ['add', 'subtract', 'multiply'],
  generate: (ctx) => {
    const a = ctx.int(-20, 20);
    const b = ctx.int(-20, 20);
    const op = ctx.pick(['+', '-', '×'] as const);
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    return {
      templateId: { '+': 'add', '-': 'subtract', '×': 'multiply' }[op],
      problemText: `$${latexNum(a)} ${op === '×' ? '\\times' : op} ${latexNum(b)} = \\;?$`,
      answer: exact(answer, 'evaluated'),
      explanation: `$${latexNum(a)} ${op === '×' ? '\\times' : op} ${latexNum(b)} = ${answer}$` +
        (op === '×' && a < 0 && b < 0 ? ' (negative times negative is positive)'
          : op === '-' && b < 0 ? ` (subtracting $${b}$ is adding $${-b}$)` : ''),
      hint: op === '×' ? 'Two negatives make a positive when multiplying!'
        : op === '-' ? 'Subtracting a negative is the same as adding.' : 'When adding, consider the signs of both numbers.',
    };
  },
};
