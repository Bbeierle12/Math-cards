/** Basic arithmetic. Arithmetic is the skill here, so answers must be evaluated. */
import type { GeneratorDef } from './context';
import { exact, latexNum, resolveRange } from './context';

export const addition: GeneratorDef = {
  topicId: 'addition',
  version: 2,
  generate: (ctx) => {
    const { min, max } = resolveRange(ctx.settings, -10, 10);
    const a = ctx.int(min, max);
    const b = ctx.int(min, max);
    return {
      templateId: 'sum',
      problemText: `$${a} + ${latexNum(b)} = \\;?$`,
      answer: exact(a + b, 'evaluated'),
      explanation: `$${a} + ${latexNum(b)} = ${a + b}$`,
      hint: a < 0 && b < 0 ? 'Adding two negative numbers gives a negative result.' : undefined,
    };
  },
};

export const subtraction: GeneratorDef = {
  topicId: 'subtraction',
  version: 2,
  generate: (ctx) => {
    const { min, max } = resolveRange(ctx.settings, -10, 10);
    let a = ctx.int(min, max);
    let b = ctx.int(min, max);
    // With negatives disabled the difference must not be negative either.
    if (ctx.settings.allowNegatives === false && a < b) [a, b] = [b, a];
    return {
      templateId: 'difference',
      problemText: `$${a} - ${latexNum(b)} = \\;?$`,
      answer: exact(a - b, 'evaluated'),
      explanation: b < 0
        ? `Subtracting a negative is adding: $${a} - (${b}) = ${a} + ${-b} = ${a - b}$`
        : `$${a} - ${b} = ${a - b}$`,
      hint: b < 0 ? 'Remember: subtracting a negative is the same as adding a positive.' : 'Subtract the second number from the first.',
    };
  },
};

export const multiplication: GeneratorDef = {
  topicId: 'multiplication',
  version: 2,
  generate: (ctx) => {
    const { min, max } = resolveRange(ctx.settings, -10, 10);
    const a = ctx.int(min, max);
    const b = ctx.int(min, max);
    const signNote = a === 0 || b === 0 ? ''
      : (a < 0) !== (b < 0) ? ' (one negative factor makes the product negative)'
        : a < 0 && b < 0 ? ' (two negative factors make a positive product)' : '';
    return {
      templateId: 'product',
      problemText: `$${a} \\times ${latexNum(b)} = \\;?$`,
      answer: exact(a * b, 'evaluated'),
      explanation: `$${a} \\times ${latexNum(b)} = ${a * b}$${signNote}`,
      hint: (a === 0 || b === 0) ? 'Anything times zero is zero.'
        : (a < 0 && b < 0) ? 'A negative times a negative gives a positive!'
          : (a < 0 || b < 0) ? 'A positive times a negative gives a negative.' : 'Multiply the two numbers together.',
    };
  },
};

export const division: GeneratorDef = {
  topicId: 'division',
  version: 2,
  generate: (ctx) => {
    const { min, max } = resolveRange(ctx.settings, -10, 10);
    // A range that can only produce 0 (e.g. [0, 0]) still yields a valid problem.
    if (min === 0 && max === 0) {
      return {
        templateId: 'zero-dividend',
        problemText: `$0 \\div 1 = \\;?$`,
        answer: exact(0, 'evaluated'),
        explanation: `$0 \\div 1 = 0$ because $0 \\times 1 = 0$.`,
        hint: 'Zero divided by any non-zero number is zero.',
      };
    }
    const divisors: number[] = [];
    for (let v = min; v <= max; v++) if (v !== 0) divisors.push(v);
    const b = ctx.pick(divisors);
    const result = ctx.int(min, max);
    const a = b * result;
    ctx.require(b !== 0, 'nonZeroDenominator');
    return {
      templateId: 'exact-quotient',
      problemText: `$${a} \\div ${latexNum(b)} = \\;?$`,
      answer: exact(result, 'evaluated'),
      explanation: `$${latexNum(b)} \\times ${latexNum(result)} = ${a}$, so $${a} \\div ${latexNum(b)} = ${result}$.`,
      hint: 'Think: what number times the divisor gives the dividend?',
    };
  },
};
