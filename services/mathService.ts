import { TopicId, Problem, ProblemAnswer, FractionAnswer } from '../types';
import { PYTHAGOREAN_TRIPLES, SPECIAL_ANGLES } from '../constants';
import { expressionsEquivalent, parseNumericInput, numbersEqual, roundingTolerance } from './expressionGrader';

// ===========================
// UTILITY FUNCTIONS
// ===========================

// Helper function to get a random integer between min and max (inclusive)
const randInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper to pick a random element from an array
const randChoice = <T>(arr: T[]): T => {
  return arr[randInt(0, arr.length - 1)];
};

// LaTeX formatting helpers
const latexNum = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const latexTerm = (n: number): string => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);
const latexSignedCoeff = (n: number, varName: string): string => {
  if (n === 1) return `+ ${varName}`;
  if (n === -1) return `- ${varName}`;
  return n >= 0 ? `+ ${n}${varName}` : `- ${Math.abs(n)}${varName}`;
};
const latexFrac = (num: number, den: number): string => `\\frac{${num}}{${den}}`;

// Round to a fixed number of decimal places (for stored approximations that the
// problem text itself asks for, e.g. "Use pi ~ 3.14").
const roundTo = (n: number, places: number): number => {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
};

// Options for basic-arithmetic generators (from user settings).
interface NumberRangeOptions {
  numberRange?: { min: number; max: number };
  allowNegatives?: boolean;
}

// Resolve the effective operand range for basic arithmetic.
// "Allow negatives" off means: no negative operands AND no negative answers.
// An inverted range is repaired rather than fed to randInt.
export const resolveRange = (
  opts: NumberRangeOptions | undefined,
  fallbackMin: number,
  fallbackMax: number,
): { min: number; max: number } => {
  const rawMin = opts?.numberRange?.min;
  const rawMax = opts?.numberRange?.max;
  let min = typeof rawMin === 'number' && Number.isFinite(rawMin) ? Math.trunc(rawMin) : fallbackMin;
  let max = typeof rawMax === 'number' && Number.isFinite(rawMax) ? Math.trunc(rawMax) : fallbackMax;
  if (min > max) [min, max] = [max, min];
  if (opts?.allowNegatives === false) {
    min = Math.max(0, min);
    max = Math.max(min, max);
  }
  return { min, max };
};

// Exact values of the special angles used by the trigonometry generators.
const SPECIAL_TRIG: Record<30 | 45 | 60, Record<'sin' | 'cos' | 'tan', { latex: string; text: string; value: number }>> = {
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

// Helper to simplify fractions (GCD)
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

// Helper to simplify a fraction
export const simplifyFraction = (num: number, den: number): FractionAnswer => {
  const divisor = gcd(num, den);
  let simplifiedNum = num / divisor;
  let simplifiedDen = den / divisor;
  // Normalize so the denominator is always positive
  if (simplifiedDen < 0) {
    simplifiedNum = -simplifiedNum;
    simplifiedDen = -simplifiedDen;
  }
  return { numerator: simplifiedNum, denominator: simplifiedDen };
};

// ===========================
// BASIC ARITHMETIC
// ===========================

const generateAdditionProblem = (opts?: NumberRangeOptions): Problem => {
  const { min, max } = resolveRange(opts, -10, 10);
  const a = randInt(min, max);
  const b = randInt(min, max);
  return {
    id: crypto.randomUUID(),
    topicId: 'addition',
    problemText: `$${a} + ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: a + b,
    explanationPrompt: `$${a} + ${latexNum(b)} = ${a + b}$`,
    hint: a < 0 && b < 0 ? 'Adding two negative numbers gives a negative result.' : undefined,
  };
};

const generateSubtractionProblem = (opts?: NumberRangeOptions): Problem => {
  const { min, max } = resolveRange(opts, -10, 10);
  let a = randInt(min, max);
  let b = randInt(min, max);
  // With negatives disabled the difference must not be negative either.
  if (opts?.allowNegatives === false && a < b) [a, b] = [b, a];
  return {
    id: crypto.randomUUID(),
    topicId: 'subtraction',
    problemText: `$${a} - ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: a - b,
    explanationPrompt: b < 0
      ? `Subtracting a negative is adding: $${a} - (${b}) = ${a} + ${-b} = ${a - b}$`
      : `$${a} - ${b} = ${a - b}$`,
    hint: b < 0 ? 'Remember: subtracting a negative is the same as adding a positive.' : 'Subtract the second number from the first.',
  };
};

const generateMultiplicationProblem = (opts?: NumberRangeOptions): Problem => {
  const { min, max } = resolveRange(opts, -10, 10);
  const a = randInt(min, max);
  const b = randInt(min, max);
  return {
    id: crypto.randomUUID(),
    topicId: 'multiplication',
    problemText: `$${a} \\times ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: a * b,
    explanationPrompt: `$${a} \\times ${latexNum(b)} = ${a * b}$` +
      ((a < 0) !== (b < 0) && a !== 0 && b !== 0 ? ' (one negative factor makes the product negative)' : (a < 0 && b < 0 ? ' (two negative factors make a positive product)' : '')),
    hint: (a < 0 && b < 0) ? 'A negative times a negative gives a positive!' : (a < 0 || b < 0) ? 'A positive times a negative gives a negative.' : 'Multiply the two numbers together.',
  };
};

const generateDivisionProblem = (opts?: NumberRangeOptions): Problem => {
  const { min, max } = resolveRange(opts, -10, 10);
  // Guard against a range that can only produce 0 (e.g., [0,0])
  if (min === 0 && max === 0) {
    return {
      id: crypto.randomUUID(),
      topicId: 'division',
      problemText: `$0 \\div 1 = \\;?$`,
      answerType: 'numeric',
      correctAnswer: 0,
      explanationPrompt: `$0 \\div 1 = 0$ because $0 \\times 1 = 0$.`,
      hint: 'Zero divided by any non-zero number is zero.',
    };
  }
  let b = 0;
  for (let tries = 0; b === 0 && tries < 100; tries++) {
    b = randInt(min, max);
  }
  if (b === 0) b = 1;
  const result = randInt(min, max);
  const a = b * result;
  return {
    id: crypto.randomUUID(),
    topicId: 'division',
    problemText: `$${a} \\div ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: result,
    explanationPrompt: `$${latexNum(b)} \\times ${latexNum(result)} = ${a}$, so $${a} \\div ${latexNum(b)} = ${result}$.`,
    hint: 'Think: what number times the divisor gives the dividend?',
  };
};

// ===========================
// PRE-ALGEBRA
// ===========================

const generateSimpleLinearEquationProblem = (): Problem => {
  const x = randInt(2, 10);
  const a = randInt(2, 5);
  const b = randInt(1, 15);
  const c = a * x + b;

  return {
    id: crypto.randomUUID(),
    topicId: 'simple-linear-equations',
    problemText: `$${a}x + ${b} = ${c}$`,
    answerType: 'numeric',
    correctAnswer: x,
    explanationPrompt: `Subtract $${b}$ from both sides: $${a}x = ${c - b}$. Divide by $${a}$: $x = ${x}$.`,
    hint: `First, subtract ${b} from both sides.`,
  };
};

const generateFractionsBasicProblem = (): Problem => {
  const operations = ['+', '-', '×', '÷'];
  const op = randChoice(operations);

  // Generate two fractions
  const num1 = randInt(1, 9);
  const den1 = randInt(2, 10);
  const num2 = randInt(1, 9);
  const den2 = randInt(2, 10);

  let answerNum: number;
  let answerDen: number;

  switch (op) {
    case '+':
      answerNum = num1 * den2 + num2 * den1;
      answerDen = den1 * den2;
      break;
    case '-':
      answerNum = num1 * den2 - num2 * den1;
      answerDen = den1 * den2;
      break;
    case '×':
      answerNum = num1 * num2;
      answerDen = den1 * den2;
      break;
    case '÷':
      answerNum = num1 * den2;
      answerDen = den1 * num2;
      break;
    default:
      answerNum = 0;
      answerDen = 1;
  }

  const simplified = simplifyFraction(answerNum, answerDen);
  const simplifiedLatex = simplified.denominator === 1 ? `${simplified.numerator}` : latexFrac(simplified.numerator, simplified.denominator);
  const unsimplified = latexFrac(answerNum, answerDen);
  const simplifyNote = answerDen === simplified.denominator ? '' : `, which simplifies to $${simplifiedLatex}$`;
  const explanation = op === '+' || op === '-'
    ? `Common denominator $${den1 * den2}$: $${latexFrac(num1 * den2, den1 * den2)} ${op} ${latexFrac(num2 * den1, den1 * den2)} = ${unsimplified}$${simplifyNote}.`
    : op === '×'
      ? `Multiply numerators and denominators: $\\frac{${num1} \\times ${num2}}{${den1} \\times ${den2}} = ${unsimplified}$${simplifyNote}.`
      : `Multiply by the reciprocal: $${latexFrac(num1, den1)} \\times ${latexFrac(den2, num2)} = ${unsimplified}$${simplifyNote}.`;

  return {
    id: crypto.randomUUID(),
    topicId: 'fractions-basic',
    problemText: `$${latexFrac(num1, den1)} ${op === '×' ? '\\times' : op === '÷' ? '\\div' : op} ${latexFrac(num2, den2)} = \\;?$`,
    answerType: 'fraction',
    correctAnswer: simplified,
    explanationPrompt: explanation,
    hint: op === '+' || op === '-' ? 'Find a common denominator first.' : op === '×' ? 'Multiply numerators and denominators.' : 'Flip and multiply!',
  };
};

const generateDecimalsProblem = (): Problem => {
  const operations = ['+', '-', '×'];
  const op = randChoice(operations);

  // Generate decimals with 1-2 decimal places
  const a = randInt(1, 99) / 10;
  const b = randInt(1, 99) / 10;

  let answer: number;
  switch (op) {
    case '+':
      answer = a + b;
      break;
    case '-':
      answer = a - b;
      break;
    case '×':
      answer = a * b;
      break;
    default:
      answer = 0;
  }

  // Sums/differences of tenths and products of tenths are exact to 2 decimal
  // places, so this is an exact-answer problem (no tolerance).
  const exact = roundTo(answer, 2);
  return {
    id: crypto.randomUUID(),
    topicId: 'decimals',
    problemText: `$${a} ${op === '×' ? '\\times' : op} ${b} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: exact,
    explanationPrompt: `$${a} ${op === '×' ? '\\times' : op} ${b} = ${exact}$`,
    hint: op === '×' ? 'Multiply as whole numbers, then place the decimal point (count the decimal digits in both factors).' : 'Line up the decimal points when adding or subtracting.',
  };
};

const generateOrderOfOperationsProblem = (): Problem => {
  // Generate a PEMDAS problem
  const a = randInt(1, 10);
  const b = randInt(1, 10);
  const c = randInt(1, 10);
  const d = randInt(1, 5);

  const problemType = randInt(1, 3);
  let problemText: string;
  let answer: number;

  let explanation: string;

  switch (problemType) {
    case 1:
      // a + b × c
      problemText = `$${a} + ${b} \\times ${c}$`;
      answer = a + b * c;
      explanation = `Multiply first: $${b} \\times ${c} = ${b * c}$. Then add: $${a} + ${b * c} = ${answer}$.`;
      break;
    case 2:
      // (a + b) × c
      problemText = `$(${a} + ${b}) \\times ${c}$`;
      answer = (a + b) * c;
      explanation = `Parentheses first: $${a} + ${b} = ${a + b}$. Then multiply: $${a + b} \\times ${c} = ${answer}$.`;
      break;
    case 3:
      // a × b + c × d
      problemText = `$${a} \\times ${b} + ${c} \\times ${d}$`;
      answer = a * b + c * d;
      explanation = `Do both multiplications first: $${a} \\times ${b} = ${a * b}$ and $${c} \\times ${d} = ${c * d}$. Then add: $${a * b} + ${c * d} = ${answer}$.`;
      break;
    default:
      problemText = `$${a} + ${b}$`;
      answer = a + b;
      explanation = `$${a} + ${b} = ${answer}$`;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'order-of-operations',
    problemText: `${problemText} $= \\;?$`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: explanation,
    hint: 'Remember PEMDAS: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction.',
  };
};

const generateIntegersProblem = (): Problem => {
  // Focus on integer operations with negatives
  const a = randInt(-20, 20);
  const b = randInt(-20, 20);
  const operations = ['+', '-', '×'];
  const op = randChoice(operations);

  let answer: number;
  switch (op) {
    case '+':
      answer = a + b;
      break;
    case '-':
      answer = a - b;
      break;
    case '×':
      answer = a * b;
      break;
    default:
      answer = 0;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'integers',
    problemText: `$${latexNum(a)} ${op === '×' ? '\\times' : op} ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `$${latexNum(a)} ${op === '×' ? '\\times' : op} ${latexNum(b)} = ${answer}$` +
      (op === '×' && a < 0 && b < 0 ? ' (negative times negative is positive)' : op === '-' && b < 0 ? ` (subtracting $${b}$ is adding $${-b}$)` : ''),
    hint: op === '×' ? 'Two negatives make a positive when multiplying!' : op === '-' ? 'Subtracting a negative is the same as adding.' : 'When adding, consider the signs of both numbers.',
  };
};

// ===========================
// ALGEBRA 1
// ===========================

const generateMultiStepEquationProblem = (): Problem => {
  // Generate equation like: ax + b = cx + d
  const x = randInt(2, 10);
  const a = randInt(2, 8);
  const b = randInt(-15, 15);
  const c = randInt(1, a - 1);
  const d = (a - c) * x + b;

  return {
    id: crypto.randomUUID(),
    topicId: 'multi-step-equations',
    problemText: `$${a}x ${latexTerm(b)} = ${c}x ${latexTerm(d)}$`,
    answerType: 'numeric',
    correctAnswer: x,
    explanationPrompt: `Subtract $${c}x$ from both sides: $${a - c}x ${latexTerm(b)} = ${d}$. Then ${b >= 0 ? 'subtract' : 'add'} $${Math.abs(b)}$: $${a - c}x = ${d - b}$. Divide by $${a - c}$: $x = ${x}$.`,
    hint: 'Move all x terms to one side and constants to the other.',
  };
};

const generateInequalitiesProblem = (): Problem => {
  const a = randInt(2, 5);
  const b = randInt(1, 10);
  // Ensure (c - b) is divisible by a so the answer is an exact integer
  const x = randInt(1, 15);
  const c = a * x + b + randInt(1, 5) * a; // guarantees (c - b) % a === 0

  const operators = ['<', '>', '≤', '≥'];
  const op = randChoice(operators);

  const solution = (c - b) / a; // Always an integer now

  return {
    id: crypto.randomUUID(),
    topicId: 'inequalities',
    problemText: `Solve for $x$: $${a}x + ${b} ${op === '≤' ? '\\leq' : op === '≥' ? '\\geq' : op} ${c}$`,
    answerType: 'expression',
    correctAnswer: `x ${op} ${solution}`,
    explanationPrompt: `Subtract $${b}$: $${a}x ${op === '≤' ? '\\leq' : op === '≥' ? '\\geq' : op} ${c - b}$. Divide by $${a}$ (positive, so the inequality direction is unchanged): $x ${op === '≤' ? '\\leq' : op === '≥' ? '\\geq' : op} ${solution}$.`,
    hint: 'Solve like an equation, but remember: flip the sign when multiplying/dividing by a negative!',
  };
};

const generateSystemsOfEquationsProblem = (): Problem => {
  // Generate a system with integer solution
  const x = randInt(2, 8);
  const y = randInt(2, 8);

  let a1: number, b1: number, a2: number, b2: number;
  // Ensure the system is not linearly dependent (determinant != 0)
  do {
    a1 = randInt(1, 5);
    b1 = randInt(1, 5);
    a2 = randInt(1, 5);
    b2 = randInt(1, 5);
  } while (a1 * b2 - a2 * b1 === 0);

  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;

  return {
    id: crypto.randomUUID(),
    topicId: 'systems-of-equations',
    problemText: `$${a1}x + ${b1}y = ${c1}$\n$${a2}x + ${b2}y = ${c2}$\nFind $x$:`,
    answerType: 'numeric',
    correctAnswer: x,
    explanationPrompt: `Eliminate $y$: multiply the first equation by $${b2}$ and the second by $${b1}$, then subtract: $(${a1 * b2} - ${a2 * b1})x = ${c1 * b2} - ${c2 * b1}$, so $${a1 * b2 - a2 * b1}x = ${c1 * b2 - c2 * b1}$ and $x = ${x}$. (Then $y = ${y}$.)`,
    hint: 'Try using substitution or elimination method.',
  };
};

const generateExponentsProblem = (): Problem => {
  const base = randInt(2, 5);
  const exp1 = randInt(2, 4);
  const exp2 = randInt(2, 4);

  const problemTypes = [
    { text: `$${base}^{${exp1}} \\times ${base}^{${exp2}}$`, answer: exp1 + exp2, rule: 'multiplication', question: 'What is the simplified exponent?',
      explanation: `Same base, multiplying: add the exponents. $${base}^{${exp1}} \\times ${base}^{${exp2}} = ${base}^{${exp1} + ${exp2}} = ${base}^{${exp1 + exp2}}$.` },
    { text: `$${base}^{${exp1 + exp2}} \\div ${base}^{${exp2}}$`, answer: exp1, rule: 'division', question: 'What is the simplified exponent?',
      explanation: `Same base, dividing: subtract the exponents. $${base}^{${exp1 + exp2}} \\div ${base}^{${exp2}} = ${base}^{${exp1 + exp2} - ${exp2}} = ${base}^{${exp1}}$.` },
    { text: `$(${base}^{${exp1}})^{${exp2}}$`, answer: exp1 * exp2, rule: 'power', question: 'What is the simplified exponent?',
      explanation: `Power of a power: multiply the exponents. $(${base}^{${exp1}})^{${exp2}} = ${base}^{${exp1} \\cdot ${exp2}} = ${base}^{${exp1 * exp2}}$.` },
  ];

  const chosen = randChoice(problemTypes);

  return {
    id: crypto.randomUUID(),
    topicId: 'exponents',
    problemText: `Simplify: ${chosen.text}\n${chosen.question} (The answer is $${base}^{?}$)`,
    answerType: 'numeric',
    correctAnswer: chosen.answer,
    explanationPrompt: chosen.explanation,
    hint: chosen.rule === 'multiplication' ? 'When multiplying: add exponents.' : chosen.rule === 'division' ? 'When dividing: subtract exponents.' : 'When raising to a power: multiply exponents.',
  };
};

const generatePolynomialsProblem = (): Problem => {
  // Simple polynomial addition/subtraction
  const a1 = randInt(1, 5);
  const b1 = randInt(-10, 10);
  const c1 = randInt(-10, 10);

  const a2 = randInt(1, 5);
  const b2 = randInt(-10, 10);
  const c2 = randInt(-10, 10);

  const operation = randChoice(['+', '-']);
  const sign = operation === '+' ? 1 : -1;

  const resultA = a1 + sign * a2;
  const resultB = b1 + sign * b2;
  const resultC = c1 + sign * c2;

  const latexPoly = (a: number, b: number, c: number) =>
    `${a}x^2 ${latexTerm(b)}x ${latexTerm(c)}`;
  const poly1 = latexPoly(a1, b1, c1);
  const poly2 = latexPoly(a2, b2, c2);

  return {
    id: crypto.randomUUID(),
    topicId: 'polynomials',
    problemText: `$(${poly1}) ${operation} (${poly2})$\nWhat is the coefficient of $x$?`,
    answerType: 'numeric',
    correctAnswer: resultB,
    explanationPrompt: `Combine the $x$ terms: $${b1}x ${operation} (${b2}x) = ${resultB}x$. (Full result: $${resultA}x^2 ${latexTerm(resultB)}x ${latexTerm(resultC)}$.)`,
    hint: 'Combine like terms: match x² with x², x with x, and constants with constants.',
  };
};

const generateFactoringProblem = (): Problem => {
  // Generate a factorable quadratic: (x + a)(x + b) = x² + (a+b)x + ab
  // Avoid a=0 or b=0 to prevent degenerate x² + 0x + 0 problems
  let a = 0, b = 0;
  while (a === 0) a = randInt(-8, 8);
  while (b === 0) b = randInt(-8, 8);
  const sum = a + b;
  const product = a * b;

  const quadraticLatex = `x^2 ${latexTerm(sum)}x ${latexTerm(product)}`;

  return {
    id: crypto.randomUUID(),
    topicId: 'factoring',
    problemText: `Factor: $${quadraticLatex}$\nWhat is the smaller constant in the factors?`,
    answerType: 'numeric',
    correctAnswer: Math.min(a, b),
    explanationPrompt: `Find two numbers that multiply to $${product}$ and add to $${sum}$: $${a}$ and $${b}$. So $${quadraticLatex} = (x ${latexTerm(a)})(x ${latexTerm(b)})$; the smaller constant is $${Math.min(a, b)}$.`,
    hint: `Find two numbers that multiply to $${product}$ and add to $${sum}$.`,
  };
};

const generateQuadraticEquationsProblem = (): Problem => {
  // Generate equation (x - a)(x - b) = 0 with solutions a, b
  // Avoid a=0 or b=0 to prevent degenerate equations
  let a = 0, b = 0;
  while (a === 0) a = randInt(-8, 8);
  while (b === 0) b = randInt(-8, 8);
  const sum = -(a + b);
  const product = a * b;

  const quadraticLatex = `x^2 ${latexTerm(sum)}x ${latexTerm(product)} = 0`;

  return {
    id: crypto.randomUUID(),
    topicId: 'quadratic-equations',
    problemText: `Solve for $x$: $${quadraticLatex}$\nWhat is the larger solution?`,
    answerType: 'numeric',
    correctAnswer: Math.max(a, b),
    explanationPrompt: `Factor: $(x ${latexTerm(-a)})(x ${latexTerm(-b)}) = 0$, so $x = ${a}$ or $x = ${b}$. The larger solution is $${Math.max(a, b)}$.`,
    hint: `Try factoring first, or use the quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$`,
  };
};

// ===========================
// GEOMETRY
// ===========================

const generateAnglesProblem = (): Problem => {
  const problemType = randChoice(['complement', 'supplement'] as const);
  // Complementary: angle must be 1-89 so complement is positive
  // Supplementary: angle must be 1-179 so supplement is positive
  const angle1 = problemType === 'complement' ? randInt(1, 89) : randInt(1, 179);
  const chosen = problemType === 'complement'
    ? { type: 'complement', angle2: 90 - angle1, question: 'complementary' }
    : { type: 'supplement', angle2: 180 - angle1, question: 'supplementary' };

  return {
    id: crypto.randomUUID(),
    topicId: 'angles',
    problemText: `What is the ${chosen.question} angle of $${angle1}°$?`,
    answerType: 'numeric',
    correctAnswer: chosen.angle2,
    explanationPrompt: `${chosen.question[0].toUpperCase()}${chosen.question.slice(1)} angles add to $${chosen.type === 'complement' ? 90 : 180}°$: $${chosen.type === 'complement' ? 90 : 180}° - ${angle1}° = ${chosen.angle2}°$.`,
    hint: chosen.type === 'complement' ? 'Complementary angles add to 90°.' : 'Supplementary angles add to 180°.',
  };
};

const generateTrianglesProblem = (): Problem => {
  // Triangle angle sum property
  const angle1 = randInt(30, 80);
  const angle2 = randInt(30, 80);
  const angle3 = 180 - angle1 - angle2;

  return {
    id: crypto.randomUUID(),
    topicId: 'triangles',
    problemText: `A triangle has angles of $${angle1}°$ and $${angle2}°$. What is the third angle?`,
    answerType: 'numeric',
    correctAnswer: angle3,
    explanationPrompt: `The angles of a triangle add to $180°$: $180° - ${angle1}° - ${angle2}° = ${angle3}°$.`,
    hint: 'The sum of angles in a triangle is always 180°.',
  };
};

const generatePythagoreanTheoremProblem = (): Problem => {
  const triple = randChoice(PYTHAGOREAN_TRIPLES);
  const [a, b, c] = triple;

  // Randomly ask for a, b, or c
  const missing = randChoice([0, 1, 2]);

  let problemText: string;
  let answer: number;

  let explanation: string;

  if (missing === 0) {
    problemText = `A right triangle has leg $b = ${b}$ and hypotenuse $c = ${c}$. Find leg $a$.`;
    answer = a;
    explanation = `$a^2 = c^2 - b^2 = ${c * c} - ${b * b} = ${a * a}$, so $a = \\sqrt{${a * a}} = ${a}$.`;
  } else if (missing === 1) {
    problemText = `A right triangle has leg $a = ${a}$ and hypotenuse $c = ${c}$. Find leg $b$.`;
    answer = b;
    explanation = `$b^2 = c^2 - a^2 = ${c * c} - ${a * a} = ${b * b}$, so $b = \\sqrt{${b * b}} = ${b}$.`;
  } else {
    problemText = `A right triangle has legs $a = ${a}$ and $b = ${b}$. Find the hypotenuse $c$.`;
    answer = c;
    explanation = `$c^2 = a^2 + b^2 = ${a * a} + ${b * b} = ${c * c}$, so $c = \\sqrt{${c * c}} = ${c}$.`;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'pythagorean-theorem',
    problemText,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: explanation,
    hint: 'Pythagorean theorem: $a^2 + b^2 = c^2$, where $c$ is the hypotenuse.',
  };
};

const generateAreaPerimeterProblem = (): Problem => {
  const shape = randChoice(['rectangle', 'square', 'triangle', 'circle']);
  const measurement = randChoice(['area', 'perimeter']);

  let problemText: string;
  let answer: number;
  let hint: string;
  let explanation: string;
  let exactPi: number | undefined; // true-π value for π problems

  switch (shape) {
    case 'rectangle': {
      const length = randInt(5, 15);
      const width = randInt(3, 10);
      if (measurement === 'area') {
        problemText = `Find the area of a rectangle with length $${length}$ and width $${width}$.`;
        answer = length * width;
        hint = '$A = l \\times w$';
        explanation = `$A = l \\times w = ${length} \\times ${width} = ${answer}$`;
      } else {
        problemText = `Find the perimeter of a rectangle with length $${length}$ and width $${width}$.`;
        answer = 2 * (length + width);
        hint = '$P = 2(l + w)$';
        explanation = `$P = 2(l + w) = 2(${length} + ${width}) = ${answer}$`;
      }
      break;
    }
    case 'square': {
      const side = randInt(5, 15);
      if (measurement === 'area') {
        problemText = `Find the area of a square with side length $${side}$.`;
        answer = side * side;
        hint = '$A = s^2$';
        explanation = `$A = s^2 = ${side}^2 = ${answer}$`;
      } else {
        problemText = `Find the perimeter of a square with side length $${side}$.`;
        answer = 4 * side;
        hint = '$P = 4s$';
        explanation = `$P = 4s = 4 \\times ${side} = ${answer}$`;
      }
      break;
    }
    case 'triangle': {
      const base = randInt(6, 12);
      const height = randInt(4, 10);
      if (measurement === 'area') {
        // Use even base*height to guarantee integer answer
        const adjustedBase = base % 2 === 1 && height % 2 === 1 ? base + 1 : base;
        problemText = `Find the area of a triangle with base $${adjustedBase}$ and height $${height}$.`;
        answer = (adjustedBase * height) / 2;
        hint = '$A = \\frac{1}{2}bh$';
        explanation = `$A = \\frac{1}{2}bh = \\frac{1}{2} \\times ${adjustedBase} \\times ${height} = ${answer}$`;
      } else {
        // Generate a triangle with three known sides for perimeter
        const side1 = randInt(5, 12);
        const side2 = randInt(5, 12);
        const side3 = randInt(Math.abs(side1 - side2) + 1, side1 + side2 - 1); // triangle inequality
        problemText = `Find the perimeter of a triangle with sides $${side1}$, $${side2}$, and $${side3}$.`;
        answer = side1 + side2 + side3;
        hint = '$P = a + b + c$';
        explanation = `$P = ${side1} + ${side2} + ${side3} = ${answer}$`;
      }
      break;
    }
    case 'circle': {
      const radius = randInt(3, 10);
      if (measurement === 'area') {
        problemText = `Find the area of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
        answer = roundTo(3.14 * radius * radius, 2);
        exactPi = Math.PI * radius * radius;
        hint = '$A = \\pi r^2$';
        explanation = `$A = \\pi r^2 \\approx 3.14 \\times ${radius}^2 = 3.14 \\times ${radius * radius} = ${answer}$`;
      } else {
        problemText = `Find the circumference of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
        answer = roundTo(2 * 3.14 * radius, 2);
        exactPi = 2 * Math.PI * radius;
        hint = '$C = 2\\pi r$';
        explanation = `$C = 2\\pi r \\approx 2 \\times 3.14 \\times ${radius} = ${answer}$`;
      }
      break;
    }
    default:
      problemText = '';
      answer = 0;
      hint = '';
      explanation = '';
  }

  // π problems: the 3.14 value the text asks for, or the true-π value, to 2 places.
  if (exactPi !== undefined) {
    return {
      id: crypto.randomUUID(),
      topicId: 'area-perimeter',
      problemText,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      roundTo: 2,
      acceptableAnswers: [exactPi],
      explanationPrompt: explanation,
      hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'area-perimeter',
    problemText,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: explanation,
    hint,
  };
};

const generateCirclesProblem = (): Problem => {
  const radius = randInt(3, 10);
  const problemType = randChoice(['circumference', 'area', 'diameter']);

  let problemText: string;
  let answer: number;
  let hint: string;
  let explanation: string;
  let exactPi: number | undefined;

  switch (problemType) {
    case 'circumference':
      problemText = `Find the circumference of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
      answer = roundTo(2 * 3.14 * radius, 2);
      exactPi = 2 * Math.PI * radius;
      hint = '$C = 2\\pi r$';
      explanation = `$C = 2\\pi r \\approx 2 \\times 3.14 \\times ${radius} = ${answer}$`;
      break;
    case 'area':
      problemText = `Find the area of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
      answer = roundTo(3.14 * radius * radius, 2);
      exactPi = Math.PI * radius * radius;
      hint = '$A = \\pi r^2$';
      explanation = `$A = \\pi r^2 \\approx 3.14 \\times ${radius}^2 = 3.14 \\times ${radius * radius} = ${answer}$`;
      break;
    case 'diameter':
      problemText = `A circle has radius $${radius}$. What is its diameter?`;
      answer = 2 * radius;
      hint = '$d = 2r$';
      explanation = `$d = 2r = 2 \\times ${radius} = ${answer}$`;
      break;
    default:
      problemText = '';
      answer = 0;
      hint = '';
      explanation = '';
  }

  // Diameter is an exact integer (d = 2r, no π involved) — require the exact value.
  if (exactPi === undefined) {
    return {
      id: crypto.randomUUID(),
      topicId: 'circles',
      problemText,
      answerType: 'numeric',
      correctAnswer: answer,
      explanationPrompt: explanation,
      hint,
    };
  }

  // Circumference/area: the 3.14-based value the text asks for, or the true-π value, to 2 places.
  return {
    id: crypto.randomUUID(),
    topicId: 'circles',
    problemText,
    answerType: 'decimal-tolerance',
    correctAnswer: answer,
    roundTo: 2,
    acceptableAnswers: [exactPi],
    explanationPrompt: explanation,
    hint,
  };
};

const generateVolumeSurfaceAreaProblem = (): Problem => {
  const shape = randChoice(['cube', 'rectangular-prism', 'cylinder', 'sphere']);
  const measurement = randChoice(['volume', 'surface-area']);

  let problemText: string;
  let answer: number;
  let hint: string;
  let explanation: string;
  let exactPi: number | undefined;

  switch (shape) {
    case 'cube': {
      const side = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a cube with side length $${side}$.`;
        answer = side * side * side;
        hint = '$V = s^3$';
        explanation = `$V = s^3 = ${side}^3 = ${answer}$`;
      } else {
        problemText = `Find the surface area of a cube with side length $${side}$.`;
        answer = 6 * side * side;
        hint = '$SA = 6s^2$';
        explanation = `$SA = 6s^2 = 6 \\times ${side}^2 = 6 \\times ${side * side} = ${answer}$`;
      }
      break;
    }
    case 'rectangular-prism': {
      const l = randInt(4, 10);
      const w = randInt(3, 8);
      const h = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a rectangular prism: $l=${l}$, $w=${w}$, $h=${h}$.`;
        answer = l * w * h;
        hint = '$V = lwh$';
        explanation = `$V = lwh = ${l} \\times ${w} \\times ${h} = ${answer}$`;
      } else {
        problemText = `Find the surface area of a rectangular prism: $l=${l}$, $w=${w}$, $h=${h}$.`;
        answer = 2 * (l * w + l * h + w * h);
        hint = '$SA = 2(lw + lh + wh)$';
        explanation = `$SA = 2(lw + lh + wh) = 2(${l * w} + ${l * h} + ${w * h}) = ${answer}$`;
      }
      break;
    }
    case 'cylinder': {
      const r = randInt(3, 7);
      const height = randInt(5, 12);
      if (measurement === 'volume') {
        problemText = `Find the volume of a cylinder with $r=${r}$, $h=${height}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
        answer = roundTo(3.14 * r * r * height, 2);
        exactPi = Math.PI * r * r * height;
        hint = '$V = \\pi r^2 h$';
        explanation = `$V = \\pi r^2 h \\approx 3.14 \\times ${r * r} \\times ${height} = ${answer}$`;
      } else {
        problemText = `Find the surface area of a cylinder with $r=${r}$, $h=${height}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
        answer = roundTo(2 * 3.14 * r * (r + height), 2);
        exactPi = 2 * Math.PI * r * (r + height);
        hint = '$SA = 2\\pi r(r + h)$';
        explanation = `$SA = 2\\pi r(r + h) \\approx 2 \\times 3.14 \\times ${r} \\times ${r + height} = ${answer}$`;
      }
      break;
    }
    case 'sphere': {
      const radius = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a sphere with radius $${radius}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
        answer = roundTo((4 / 3) * 3.14 * radius * radius * radius, 2);
        exactPi = (4 / 3) * Math.PI * Math.pow(radius, 3);
        hint = '$V = \\frac{4}{3}\\pi r^3$';
        explanation = `$V = \\frac{4}{3}\\pi r^3 \\approx \\frac{4}{3} \\times 3.14 \\times ${radius * radius * radius} = ${answer}$`;
      } else {
        problemText = `Find the surface area of a sphere with radius $${radius}$. (Use $\\pi \\approx 3.14$; round to 2 decimal places.)`;
        answer = roundTo(4 * 3.14 * radius * radius, 2);
        exactPi = 4 * Math.PI * radius * radius;
        hint = '$SA = 4\\pi r^2$';
        explanation = `$SA = 4\\pi r^2 \\approx 4 \\times 3.14 \\times ${radius * radius} = ${answer}$`;
      }
      break;
    }
    default:
      problemText = '';
      answer = 0;
      hint = '';
      explanation = '';
  }

  // π problems: the 3.14 value the text asks for, or the true-π value, to 2 places.
  if (exactPi !== undefined) {
    return {
      id: crypto.randomUUID(),
      topicId: 'volume-surface-area',
      problemText,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      roundTo: 2,
      acceptableAnswers: [exactPi],
      explanationPrompt: explanation,
      hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'volume-surface-area',
    problemText,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: explanation,
    hint,
  };
};

// ===========================
// ALGEBRA 2
// ===========================

const generateComplexNumbersProblem = (): Problem => {
  const a1 = randInt(-8, 8);
  const b1 = randInt(-8, 8);
  const a2 = randInt(-8, 8);
  const b2 = randInt(-8, 8);

  const operation = randChoice(['+', '-']);
  const sign = operation === '+' ? 1 : -1;

  const realPart = a1 + sign * a2;
  const imagPart = b1 + sign * b2;

  const z1 = `${a1} ${latexTerm(b1)}i`;
  const z2 = `${a2} ${latexTerm(b2)}i`;

  return {
    id: crypto.randomUUID(),
    topicId: 'complex-numbers',
    problemText: `$(${z1}) ${operation} (${z2})$\nWhat is the imaginary coefficient?`,
    answerType: 'numeric',
    correctAnswer: imagPart,
    explanationPrompt: `Real parts: $${a1} ${operation} (${a2}) = ${realPart}$. Imaginary parts: $${b1} ${operation} (${b2}) = ${imagPart}$. Result: $${realPart} ${latexTerm(imagPart)}i$, so the imaginary coefficient is $${imagPart}$.`,
    hint: 'Combine real parts and imaginary parts separately.',
  };
};

const generateRadicalsProblem = (): Problem => {
  // Simplify square roots
  const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100];
  const multiplier = randChoice([2, 3, 5, 7]);
  const perfect = randChoice(perfectSquares);
  const radicand = multiplier * perfect;

  const simplified = Math.sqrt(perfect);

  return {
    id: crypto.randomUUID(),
    topicId: 'radicals',
    problemText: `Simplify $\\sqrt{${radicand}}$. What number is outside the radical?`,
    answerType: 'numeric',
    correctAnswer: simplified,
    explanationPrompt: `$\\sqrt{${radicand}} = \\sqrt{${perfect} \\times ${multiplier}} = \\sqrt{${perfect}}\\sqrt{${multiplier}} = ${simplified}\\sqrt{${multiplier}}$`,
    hint: `Look for perfect square factors. ${radicand} = ${multiplier} × ${perfect}`,
  };
};

const generateLogarithmsProblem = (): Problem => {
  const base = randChoice([2, 3, 10]);
  const exponent = randInt(2, 4);
  const value = Math.pow(base, exponent);

  return {
    id: crypto.randomUUID(),
    topicId: 'logarithms',
    problemText: `$\\log_{${base}}(${value}) = \\;?$`,
    answerType: 'numeric',
    correctAnswer: exponent,
    explanationPrompt: `$${base}^{${exponent}} = ${value}$, so $\\log_{${base}}(${value}) = ${exponent}$.`,
    hint: `Ask yourself: ${base} to what power equals ${value}?`,
  };
};

const generateSequencesSeriesProblem = (): Problem => {
  const type = randChoice(['arithmetic', 'geometric']);

  if (type === 'arithmetic') {
    const a1 = randInt(3, 15);
    const d = randInt(2, 8);
    const n = randInt(8, 12);
    const an = a1 + (n - 1) * d;

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences-series',
      problemText: `An arithmetic sequence starts at $${a1}$ with common difference $d = ${d}$. Find the $${n}$th term.`,
      answerType: 'numeric',
      correctAnswer: an,
      explanationPrompt: `$a_n = a_1 + (n-1)d = ${a1} + (${n}-1)(${d}) = ${a1} + ${(n - 1) * d} = ${an}$`,
      hint: `Use the formula: $a_n = a_1 + (n-1)d$`,
    };
  } else {
    const a1 = randInt(2, 5);
    const r = randChoice([2, 3]);
    const n = randInt(4, 6);
    const an = a1 * Math.pow(r, n - 1);

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences-series',
      problemText: `A geometric sequence starts at $${a1}$ with common ratio $r = ${r}$. Find the $${n}$th term.`,
      answerType: 'numeric',
      correctAnswer: an,
      explanationPrompt: `$a_n = a_1 \\cdot r^{n-1} = ${a1} \\cdot ${r}^{${n - 1}} = ${a1} \\cdot ${Math.pow(r, n - 1)} = ${an}$`,
      hint: `Use the formula: $a_n = a_1 \\cdot r^{n-1}$`,
    };
  }
};

// ===========================
// TRIGONOMETRY
// ===========================

const generateTrigRatiosProblem = (): Problem => {
  // Use a Pythagorean triple
  const triple = randChoice(PYTHAGOREAN_TRIPLES);
  const [a, b, c] = triple;

  const ratio = randChoice(['sin', 'cos', 'tan'] as const);
  const anglePosition = randChoice(['opposite-a', 'opposite-b'] as const);

  // Angle opposite side a: opposite = a, adjacent = b. Opposite side b: opposite = b, adjacent = a.
  const opposite = anglePosition === 'opposite-a' ? a : b;
  const adjacent = anglePosition === 'opposite-a' ? b : a;
  const [num, den] = ratio === 'sin' ? [opposite, c] : ratio === 'cos' ? [adjacent, c] : [opposite, adjacent];
  const exact = num / den;
  const reduced = simplifyFraction(num, den);
  const ratioWords = ratio === 'sin' ? 'opposite/hypotenuse' : ratio === 'cos' ? 'adjacent/hypotenuse' : 'opposite/adjacent';

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-ratios',
    problemText: `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\${ratio}(\\theta)$ where $\\theta$ is opposite to side $${opposite}$.\n(Enter a fraction, or a decimal rounded to 3 places.)`,
    answerType: 'decimal-tolerance',
    correctAnswer: exact,
    roundTo: 3,
    displayAnswer: `$${latexFrac(reduced.numerator, reduced.denominator)} \\approx ${exact.toFixed(3)}$`,
    explanationPrompt: `$\\${ratio}(\\theta) = \\frac{\\text{${ratioWords.split('/')[0]}}}{\\text{${ratioWords.split('/')[1]}}} = \\frac{${num}}{${den}}${reduced.denominator !== den ? ` = ${latexFrac(reduced.numerator, reduced.denominator)}` : ''} \\approx ${exact.toFixed(3)}$`,
    hint: 'SOH-CAH-TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent',
  };
};

const generateTrigSpecialAnglesProblem = (): Problem => {
  const angle = randChoice([30, 45, 60] as const);
  const ratio = randChoice(['sin', 'cos', 'tan'] as const);
  const exact = SPECIAL_TRIG[angle][ratio];

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-special-angles',
    problemText: `Evaluate $\\${ratio}(${angle}°)$. Round to 3 decimal places.`,
    answerType: 'decimal-tolerance',
    correctAnswer: exact.value,
    roundTo: 3,
    displayAnswer: `$${exact.latex} \\approx ${exact.value.toFixed(3)}$`,
    explanationPrompt: `From the ${angle === 45 ? '45-45-90' : '30-60-90'} triangle, $\\${ratio}(${angle}°) = ${exact.latex} \\approx ${exact.value.toFixed(3)}$.`,
    hint: angle === 30 ? '30-60-90 triangle!' : angle === 45 ? '45-45-90 triangle!' : '30-60-90 triangle!',
  };
};

// ===========================
// CALCULUS
// ===========================

const generateLimitsProblem = (): Problem => {
  const a = randInt(2, 8);
  const b = randInt(-10, 10);
  const x = randInt(1, 5);

  const answer = a * x + b;

  return {
    id: crypto.randomUUID(),
    topicId: 'limits',
    problemText: `Evaluate: $\\displaystyle\\lim_{x \\to ${x}} \\left[${a}x ${latexTerm(b)}\\right]$`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Polynomials are continuous, so substitute $x = ${x}$: $${a}(${x}) ${latexTerm(b)} = ${a * x} ${latexTerm(b)} = ${answer}$.`,
    hint: 'For polynomial functions, just substitute the value!',
  };
};

const generateDerivativesBasicProblem = (): Problem => {
  const coefficient = randInt(2, 10);
  const exponent = randInt(2, 5);

  const derivativeCoeff = coefficient * exponent;
  const derivativeExp = exponent - 1;

  return {
    id: crypto.randomUUID(),
    topicId: 'derivatives-basic',
    problemText: `Find the derivative of $${coefficient}x^{${exponent}}$. What is the coefficient?`,
    answerType: 'numeric',
    correctAnswer: derivativeCoeff,
    explanationPrompt: `Power rule: $\\frac{d}{dx}[${coefficient}x^{${exponent}}] = ${coefficient} \\cdot ${exponent} x^{${exponent} - 1} = ${derivativeCoeff}x^{${derivativeExp}}$. The coefficient is $${derivativeCoeff}$.`,
    hint: `Power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$`,
  };
};

const generateDerivativesProductQuotientProblem = (): Problem => {
  const a = randInt(2, 6);
  let b = randInt(2, 6);

  const problemType = randChoice(['product', 'quotient']);

  // For quotient rule, ensure a !== b so d/dx[x^a/x^b] isn't d/dx[1] = 0
  // which would give exponent "a-b-1 = -1" (wrong — the derivative of 1 is 0, not x^(-1))
  if (problemType === 'quotient') {
    while (b === a) {
      b = randInt(2, 6);
    }
  }

  if (problemType === 'product') {
    // d/dx[x^a × x^b] = (a+b)x^(a+b-1)
    const derivativeCoeff = a + b;

    return {
      id: crypto.randomUUID(),
      topicId: 'derivatives-product-quotient',
      problemText: `Find $\\frac{d}{dx}\\left[x^{${a}} \\cdot x^{${b}}\\right]$. What is the new exponent?`,
      answerType: 'numeric',
      correctAnswer: a + b - 1,
      explanationPrompt: `$x^{${a}} \\cdot x^{${b}} = x^{${a + b}}$, and $\\frac{d}{dx}[x^{${a + b}}] = ${derivativeCoeff}x^{${a + b - 1}}$. The new exponent is $${a + b - 1}$.`,
      hint: `Simplify first: $x^a \\cdot x^b = x^{a+b}$, then use power rule.`,
    };
  } else {
    // d/dx[x^a / x^b] = (a-b)x^(a-b-1)
    return {
      id: crypto.randomUUID(),
      topicId: 'derivatives-product-quotient',
      problemText: `Simplify then find $\\frac{d}{dx}\\left[\\frac{x^{${a}}}{x^{${b}}}\\right]$. What is the new exponent?`,
      answerType: 'numeric',
      correctAnswer: a - b - 1,
      explanationPrompt: `$\\frac{x^{${a}}}{x^{${b}}} = x^{${a - b}}$, and $\\frac{d}{dx}[x^{${a - b}}] = ${a - b}x^{${a - b - 1}}$. The new exponent is $${a - b - 1}$.`,
      hint: `Simplify first: $\\frac{x^a}{x^b} = x^{a-b}$, then use power rule.`,
    };
  }
};

const generateChainRuleProblem = (): Problem => {
  const outer = randInt(2, 5);
  const inner_coeff = randInt(2, 4);
  const inner_const = randInt(1, 8);

  // d/dx[(ax + b)^n] = n(ax + b)^(n-1) × a = na(ax + b)^(n-1)
  const derivativeCoeff = outer * inner_coeff;

  return {
    id: crypto.randomUUID(),
    topicId: 'chain-rule',
    problemText: `Find $\\frac{d}{dx}\\left[(${inner_coeff}x + ${inner_const})^{${outer}}\\right]$.\nThe derivative has the form $K(${inner_coeff}x + ${inner_const})^{${outer - 1}}$. What is $K$?`,
    answerType: 'numeric',
    correctAnswer: derivativeCoeff,
    explanationPrompt: `Chain rule: $${outer}(${inner_coeff}x + ${inner_const})^{${outer - 1}} \\cdot ${inner_coeff} = ${derivativeCoeff}(${inner_coeff}x + ${inner_const})^{${outer - 1}}$, so $K = ${derivativeCoeff}$.`,
    hint: `Chain rule: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$`,
  };
};

const generateIntegralsBasicProblem = (): Problem => {
  const coefficient = randInt(2, 10);
  const exponent = randInt(1, 4);

  const integralCoeff = coefficient / (exponent + 1);
  const integralExp = exponent + 1;

  return {
    id: crypto.randomUUID(),
    topicId: 'integrals-basic',
    problemText: `$\\displaystyle\\int ${coefficient}x^{${exponent}}\\,dx$. What is the new exponent?`,
    answerType: 'numeric',
    correctAnswer: integralExp,
    explanationPrompt: `Power rule: $\\int ${coefficient}x^{${exponent}}\\,dx = \\frac{${coefficient}}{${exponent + 1}}x^{${integralExp}} + C$. The new exponent is $${integralExp}$.`,
    hint: `Power rule: $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C$`,
  };
};

const generateIntegrationSubstitutionProblem = (): Problem => {
  // ∫ 2x(x^2 + c)^n dx  -> use u = x^2 + c
  const n = randInt(2, 4);
  const c = randInt(1, 5);

  return {
    id: crypto.randomUUID(),
    topicId: 'integration-substitution',
    problemText: `$\\displaystyle\\int 2x(x^2 + ${c})^{${n}}\\,dx$\nWhat substitution $u$ should you use?`,
    answerType: 'expression',
    correctAnswer: `x^2+${c}`,
    displayAnswer: `$u = x^2 + ${c}$`,
    explanationPrompt: `Let $u = x^2 + ${c}$. Then $du = 2x\\,dx$, which is exactly the remaining factor, so the integral becomes $\\int u^{${n}}\\,du$.`,
    hint: 'Look for a function whose derivative is also in the integrand.',
  };
};

// ===========================
// MORE TRIGONOMETRY
// ===========================

const generateTrigIdentitiesProblem = (): Problem => {
  // `answer` is the canonical (parser-ready) form; `display` is what the student sees.
  const identities: { display: string; answer: string; displayAnswer: string; name: string; explanation: string }[] = [
    { display: '$\\sin^2\\theta + \\cos^2\\theta = \\;?$', answer: '1', displayAnswer: '$1$', name: 'Pythagorean identity',
      explanation: 'On the unit circle a point is $(\\cos\\theta, \\sin\\theta)$ and its distance from the origin is 1, so $\\sin^2\\theta + \\cos^2\\theta = 1$.' },
    { display: '$\\tan\\theta = \\;?$', answer: 'sin(theta)/cos(theta)', displayAnswer: '$\\frac{\\sin\\theta}{\\cos\\theta}$', name: 'tangent identity',
      explanation: 'Tangent is opposite over adjacent, and dividing by the hypotenuse top and bottom gives $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$ (where $\\cos\\theta \\neq 0$).' },
    { display: '$1 + \\tan^2\\theta = \\;?$', answer: 'sec(theta)^2', displayAnswer: '$\\sec^2\\theta$', name: 'Pythagorean identity',
      explanation: 'Divide $\\sin^2\\theta + \\cos^2\\theta = 1$ by $\\cos^2\\theta$: $\\tan^2\\theta + 1 = \\sec^2\\theta$.' },
    { display: '$\\sin(90° - \\theta) = \\;?$', answer: 'cos(theta)', displayAnswer: '$\\cos\\theta$', name: 'cofunction identity',
      explanation: 'The two acute angles of a right triangle are complementary, so the side opposite one is adjacent to the other: $\\sin(90° - \\theta) = \\cos\\theta$.' },
    { display: '$\\cos(90° - \\theta) = \\;?$', answer: 'sin(theta)', displayAnswer: '$\\sin\\theta$', name: 'cofunction identity',
      explanation: 'The two acute angles of a right triangle are complementary, so the side adjacent to one is opposite the other: $\\cos(90° - \\theta) = \\sin\\theta$.' },
  ];

  const chosen = randChoice(identities);

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-identities',
    problemText: `Complete the identity: ${chosen.display}\n(Use θ or "theta".)`,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    displayAnswer: chosen.displayAnswer,
    explanationPrompt: chosen.explanation,
    hint: `This is a ${chosen.name}.`,
  };
};

const generateTrigEquationsProblem = (): Problem => {
  const angle = randChoice([30, 45, 60] as const);
  const ratio = randChoice(['sin', 'cos', 'tan'] as const);
  const exact = SPECIAL_TRIG[angle][ratio];

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-equations',
    problemText: `Solve for $\\theta$ in degrees ($0° \\leq \\theta \\leq 90°$): $\\${ratio}(\\theta) = ${exact.latex}$`,
    answerType: 'numeric',
    correctAnswer: angle,
    displayAnswer: `$${angle}°$`,
    explanationPrompt: `$\\${ratio}(${angle}°) = ${exact.latex}$, and $\\${ratio}$ takes each value only once on $[0°, 90°]$, so $\\theta = ${angle}°$.`,
    hint: 'Think about special angles: 30°, 45°, 60°.',
  };
};

const generateInverseTrigProblem = (): Problem => {
  const values: { func: 'sin' | 'cos' | 'tan'; angle: 30 | 45 | 60; range: string }[] = [
    { func: 'sin', angle: 30, range: '[-90°, 90°]' },
    { func: 'sin', angle: 45, range: '[-90°, 90°]' },
    { func: 'sin', angle: 60, range: '[-90°, 90°]' },
    { func: 'cos', angle: 60, range: '[0°, 180°]' },
    { func: 'cos', angle: 45, range: '[0°, 180°]' },
    { func: 'cos', angle: 30, range: '[0°, 180°]' },
    { func: 'tan', angle: 45, range: '(-90°, 90°)' },
  ];

  const chosen = randChoice(values);
  const exact = SPECIAL_TRIG[chosen.angle][chosen.func];

  return {
    id: crypto.randomUUID(),
    topicId: 'inverse-trig',
    problemText: `Evaluate in degrees: $\\${chosen.func}^{-1}\\left(${exact.latex}\\right)$`,
    answerType: 'numeric',
    correctAnswer: chosen.angle,
    displayAnswer: `$${chosen.angle}°$`,
    explanationPrompt: `$\\${chosen.func}(${chosen.angle}°) = ${exact.latex}$ and $${chosen.angle}°$ lies in the principal range $${chosen.range}$ of $\\${chosen.func}^{-1}$, so $\\${chosen.func}^{-1}\\left(${exact.latex}\\right) = ${chosen.angle}°$.`,
    hint: `Which special angle has ${chosen.func} = ${exact.text}?`,
  };
};

// ===========================
// ALGEBRA 2 (ADDITIONAL)
// ===========================

const generateRationalExpressionsProblem = (): Problem => {
  // Simplify (ax)/(bx) = a/b
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const gcdVal = gcd(a, b);
  const simplified = simplifyFraction(a, b);

  return {
    id: crypto.randomUUID(),
    topicId: 'rational-expressions',
    problemText: `Simplify: $\\frac{${a}x}{${b}x}$. What is the simplified numerator?`,
    answerType: 'numeric',
    correctAnswer: simplified.numerator,
    explanationPrompt: `Cancel the common factor $x$ (for $x \\neq 0$): $\\frac{${a}x}{${b}x} = \\frac{${a}}{${b}}${gcdVal > 1 ? ` = ${latexFrac(simplified.numerator, simplified.denominator)}` : ''}$. The simplified numerator is $${simplified.numerator}$.`,
    hint: 'Cancel common factors in the numerator and denominator.',
  };
};

// ===========================
// PRE-CALCULUS
// ===========================

const generateFunctionsProblem = (): Problem => {
  const a = randInt(2, 5);
  const b = randInt(1, 8);
  const x = randInt(-5, 5);
  const result = a * x + b;

  return {
    id: crypto.randomUUID(),
    topicId: 'functions',
    problemText: `If $f(x) = ${a}x + ${b}$, find $f(${x})$`,
    answerType: 'numeric',
    correctAnswer: result,
    explanationPrompt: `$f(${x}) = ${a}(${x}) + ${b} = ${a * x} + ${b} = ${result}$`,
    hint: `Substitute ${x} for x in the function.`,
  };
};

const generatePolynomialFunctionsProblem = (): Problem => {
  // Find roots of (x-a)(x-b)
  const a = randInt(-5, 5);
  const b = randInt(-5, 5);
  const sum = -(a + b);
  const product = a * b;

  return {
    id: crypto.randomUUID(),
    topicId: 'polynomial-functions',
    problemText: `Find a root of: $x^2 ${latexTerm(sum)}x ${latexTerm(product)} = 0$`,
    answerType: 'numeric',
    correctAnswer: a,
    acceptableAnswers: a !== b ? [b] : undefined,
    explanationPrompt: `Factor: $x^2 ${latexTerm(sum)}x ${latexTerm(product)} = (x ${latexTerm(-a)})(x ${latexTerm(-b)})$, so the roots are $x = ${a}$${a !== b ? ` and $x = ${b}$` : ' (a double root)'}.`,
    hint: 'Factor the polynomial or use the quadratic formula.',
  };
};

const generateRationalFunctionsProblem = (): Problem => {
  // Vertical asymptote at x = a for 1/(x-a)
  const a = randInt(-8, 8);

  return {
    id: crypto.randomUUID(),
    topicId: 'rational-functions',
    problemText: `Find the vertical asymptote of $f(x) = \\frac{1}{x ${a >= 0 ? '-' : '+'}${Math.abs(a)}}$`,
    answerType: 'numeric',
    correctAnswer: a,
    explanationPrompt: `The numerator is never zero, so the vertical asymptote is where the denominator vanishes: $x ${a >= 0 ? '-' : '+'} ${Math.abs(a)} = 0 \\Rightarrow x = ${a}$.`,
    hint: 'Set the denominator equal to zero.',
  };
};

const generateExponentialFunctionsProblem = (): Problem => {
  // Growth: P(t) = P₀ * 2^t
  const initialValue = randInt(100, 500);
  const time = randInt(1, 4);
  const finalValue = initialValue * Math.pow(2, time);

  return {
    id: crypto.randomUUID(),
    topicId: 'exponential-functions',
    problemText: `A population starts at $${initialValue}$ and doubles every period. What is the population after $${time}$ period(s)?`,
    answerType: 'numeric',
    correctAnswer: finalValue,
    explanationPrompt: `$P(${time}) = ${initialValue} \\cdot 2^{${time}} = ${initialValue} \\cdot ${Math.pow(2, time)} = ${finalValue}$`,
    hint: `Use the formula $P(t) = P_0 \\cdot 2^t$`,
  };
};

const generateConicSectionsProblem = (): Problem => {
  const r = randInt(3, 10);
  const h = randInt(-5, 5);
  const k = randInt(-5, 5);

  const circleLatex = `(x${h >= 0 ? '-' : '+'}${Math.abs(h)})^2 + (y${k >= 0 ? '-' : '+'}${Math.abs(k)})^2 = ${r * r}`;
  const problemTypes = [
    {
      type: 'circle-radius',
      text: `Find the radius of the circle: $${circleLatex}$`,
      answer: r,
    },
    {
      type: 'circle-center-x',
      text: `Find the $x$-coordinate of the center: $${circleLatex}$`,
      answer: h,
    },
  ];

  const chosen = randChoice(problemTypes);

  return {
    id: crypto.randomUUID(),
    topicId: 'conic-sections',
    problemText: chosen.text,
    answerType: 'numeric',
    correctAnswer: chosen.answer,
    explanationPrompt: `Compare with $(x-h)^2 + (y-k)^2 = r^2$: $h = ${h}$, $k = ${k}$, $r^2 = ${r * r}$ so $r = ${r}$.`,
    hint: `Standard form: $(x-h)^2 + (y-k)^2 = r^2$, center $(h,k)$, radius $r$`,
  };
};

// ===========================
// CALCULUS 2
// ===========================

// Indefinite-integral banks. `answer` is a canonical, parser-ready antiderivative
// used ONLY as the grading reference (any antiderivative differing by a constant
// is accepted); `display` is the LaTeX shown to the student.
interface AntiderivativeItem { text: string; answer: string; display: string; hint: string; explanation: string }

const antiderivativeProblem = (topicId: TopicId, chosen: AntiderivativeItem): Problem => ({
  id: crypto.randomUUID(),
  topicId,
  problemText: chosen.text,
  answerType: 'expression',
  correctAnswer: chosen.answer,
  equivalence: 'up-to-constant',
  displayAnswer: chosen.display,
  explanationPrompt: chosen.explanation,
  hint: chosen.hint,
});

const generateIntegrationByPartsProblem = (): Problem => {
  const problems: AntiderivativeItem[] = [
    {
      text: '$\\displaystyle\\int x \\cdot e^x\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x*e^x-e^x',
      display: '$xe^x - e^x + C$',
      hint: 'Let $u = x$, $dv = e^x\\,dx$. Then $du = dx$, $v = e^x$.',
      explanation: 'With $u = x$, $dv = e^x\\,dx$: $uv - \\int v\\,du = xe^x - \\int e^x\\,dx = xe^x - e^x + C$.',
    },
    {
      text: '$\\displaystyle\\int x \\cdot \\cos(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x*sin(x)+cos(x)',
      display: '$x\\sin(x) + \\cos(x) + C$',
      hint: 'Let $u = x$, $dv = \\cos(x)\\,dx$.',
      explanation: 'With $u = x$, $dv = \\cos(x)\\,dx$: $x\\sin(x) - \\int \\sin(x)\\,dx = x\\sin(x) + \\cos(x) + C$.',
    },
    {
      text: '$\\displaystyle\\int x \\cdot \\sin(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: '-x*cos(x)+sin(x)',
      display: '$-x\\cos(x) + \\sin(x) + C$',
      hint: 'Let $u = x$, $dv = \\sin(x)\\,dx$.',
      explanation: 'With $u = x$, $dv = \\sin(x)\\,dx$: $-x\\cos(x) + \\int \\cos(x)\\,dx = -x\\cos(x) + \\sin(x) + C$.',
    },
    {
      text: '$\\displaystyle\\int \\ln(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x*log(x)-x',
      display: '$x\\ln(x) - x + C$',
      hint: 'Let $u = \\ln(x)$, $dv = dx$.',
      explanation: 'With $u = \\ln(x)$, $dv = dx$: $x\\ln(x) - \\int x \\cdot \\frac{1}{x}\\,dx = x\\ln(x) - x + C$.',
    },
  ];

  return antiderivativeProblem('integration-by-parts', randChoice(problems));
};

const generateTrigIntegralsProblem = (): Problem => {
  const problems: AntiderivativeItem[] = [
    {
      text: '$\\displaystyle\\int \\sin^2(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x/2-sin(2x)/4',
      display: '$\\frac{x}{2} - \\frac{\\sin(2x)}{4} + C$',
      hint: 'Use the identity $\\sin^2(x) = \\frac{1 - \\cos(2x)}{2}$',
      explanation: '$\\sin^2(x) = \\frac{1 - \\cos(2x)}{2}$, so $\\int \\sin^2(x)\\,dx = \\frac{x}{2} - \\frac{\\sin(2x)}{4} + C$.',
    },
    {
      text: '$\\displaystyle\\int \\cos^2(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x/2+sin(2x)/4',
      display: '$\\frac{x}{2} + \\frac{\\sin(2x)}{4} + C$',
      hint: 'Use the identity $\\cos^2(x) = \\frac{1 + \\cos(2x)}{2}$',
      explanation: '$\\cos^2(x) = \\frac{1 + \\cos(2x)}{2}$, so $\\int \\cos^2(x)\\,dx = \\frac{x}{2} + \\frac{\\sin(2x)}{4} + C$.',
    },
    {
      text: '$\\displaystyle\\int \\sin(x)\\cos(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'sin(x)^2/2',
      display: '$\\frac{\\sin^2(x)}{2} + C$ (equivalently $-\\frac{\\cos^2(x)}{2} + C$ or $-\\frac{\\cos(2x)}{4} + C$)',
      hint: 'Use $u$-substitution with $u = \\sin(x)$, or the identity $\\sin(2x) = 2\\sin(x)\\cos(x)$',
      explanation: 'Let $u = \\sin(x)$, $du = \\cos(x)\\,dx$: $\\int u\\,du = \\frac{u^2}{2} = \\frac{\\sin^2(x)}{2} + C$. The forms $-\\frac{\\cos^2(x)}{2}$ and $-\\frac{\\cos(2x)}{4}$ differ from this only by a constant.',
    },
    {
      text: '$\\displaystyle\\int \\tan(x)\\,dx$\nWhat is the result? (omit $+C$; use absolute values where needed)',
      answer: '-log(abs(cos(x)))',
      display: '$-\\ln|\\cos(x)| + C = \\ln|\\sec(x)| + C$',
      hint: 'Rewrite $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ and use substitution.',
      explanation: '$\\int \\frac{\\sin(x)}{\\cos(x)}\\,dx$ with $u = \\cos(x)$, $du = -\\sin(x)\\,dx$ gives $-\\int \\frac{du}{u} = -\\ln|u| = -\\ln|\\cos(x)| + C$. The absolute value is required: $\\cos(x)$ is negative on part of the domain of $\\tan$, where $\\ln(\\cos x)$ is undefined.',
    },
    {
      text: '$\\displaystyle\\int \\sec^2(x)\\tan(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'tan(x)^2/2',
      display: '$\\frac{\\tan^2(x)}{2} + C$ (equivalently $\\frac{\\sec^2(x)}{2} + C$)',
      hint: 'Let $u = \\tan(x)$, then $du = \\sec^2(x)\\,dx$',
      explanation: 'Let $u = \\tan(x)$, $du = \\sec^2(x)\\,dx$: $\\int u\\,du = \\frac{u^2}{2} = \\frac{\\tan^2(x)}{2} + C$. Since $\\sec^2 = 1 + \\tan^2$, $\\frac{\\sec^2(x)}{2}$ differs by the constant $\\frac{1}{2}$.',
    },
  ];

  return antiderivativeProblem('trig-integrals', randChoice(problems));
};

const generatePartialFractionsProblem = (): Problem => {
  const problemType = randChoice(['distinct-linear', 'repeated-linear', 'quadratic']);

  if (problemType === 'distinct-linear') {
    const a = randInt(1, 5);
    const b = randInt(-5, -1);
    const diff = a - b;
    const askA = randChoice([true, false]);

    if (askA) {
      return {
        id: crypto.randomUUID(),
        topicId: 'partial-fractions',
        problemText: `Decompose into partial fractions:\n$\\frac{1}{(x - ${a})(x + ${Math.abs(b)})} = \\frac{A}{x - ${a}} + \\frac{B}{x + ${Math.abs(b)}}$\nWhat is $A$? (enter a fraction)`,
        answerType: 'numeric',
        correctAnswer: 1 / diff,
        displayAnswer: `$${latexFrac(1, diff)}$`,
        explanationPrompt: `Multiply through by $(x - ${a})(x + ${Math.abs(b)})$: $1 = A(x + ${Math.abs(b)}) + B(x - ${a})$. Set $x = ${a}$: $1 = A(${a} + ${Math.abs(b)}) = ${diff}A$, so $A = ${latexFrac(1, diff)}$.`,
        hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
      };
    } else {
      return {
        id: crypto.randomUUID(),
        topicId: 'partial-fractions',
        problemText: `Decompose into partial fractions:\n$\\frac{1}{(x - ${a})(x + ${Math.abs(b)})} = \\frac{A}{x - ${a}} + \\frac{B}{x + ${Math.abs(b)}}$\nWhat is $B$? (enter a fraction)`,
        answerType: 'numeric',
        correctAnswer: -1 / diff,
        displayAnswer: `$-${latexFrac(1, diff)}$`,
        explanationPrompt: `Multiply through by $(x - ${a})(x + ${Math.abs(b)})$: $1 = A(x + ${Math.abs(b)}) + B(x - ${a})$. Set $x = ${b}$: $1 = B(${b} - ${a}) = -${diff}B$, so $B = -${latexFrac(1, diff)}$.`,
        hint: `Multiply both sides by $(x + ${Math.abs(b)})$ and set $x = ${b}$.`,
      };
    }
  } else if (problemType === 'repeated-linear') {
    const a = randInt(1, 4);
    const n = randInt(2, 5);
    // n/((x-a)^2) = A/(x-a) + B/(x-a)^2. Multiply by (x-a)^2: n = A(x-a) + B
    // Set x=a: B = n. Compare coefficients: A = 0.
    return {
      id: crypto.randomUUID(),
      topicId: 'partial-fractions',
      problemText: `Decompose: $\\frac{${n}}{(x - ${a})^2} = \\frac{A}{x - ${a}} + \\frac{B}{(x - ${a})^2}$\nWhat is $B$?`,
      answerType: 'numeric',
      correctAnswer: n,
      explanationPrompt: `Multiply both sides by $(x-${a})^2$: $${n} = A(x-${a}) + B$. Set $x = ${a}$: $B = ${n}$. (Comparing $x$ coefficients gives $A = 0$.)`,
      hint: `Multiply both sides by $(x - ${a})^2$ and set $x = ${a}$.`,
    };
  } else {
    // Irreducible quadratic: 1/((x-a)(x^2+1)) = A/(x-a) + (Bx+C)/(x^2+1)
    const a = randInt(1, 3);
    const denom = a * a + 1;
    // Multiply by (x-a): at x=a, 1/(a^2+1) = A
    const answerNum = 1;
    const answerDen = denom;
    return {
      id: crypto.randomUUID(),
      topicId: 'partial-fractions',
      problemText: `Decompose: $\\frac{1}{(x - ${a})(x^2 + 1)} = \\frac{A}{x - ${a}} + \\frac{Bx + C}{x^2 + 1}$\nWhat is $A$? (enter a fraction)`,
      answerType: 'numeric',
      correctAnswer: answerNum / answerDen,
      displayAnswer: `$${latexFrac(answerNum, answerDen)}$`,
      explanationPrompt: `Multiply by $(x-${a})$ and set $x = ${a}$: $A = \\frac{1}{${a}^2 + 1} = ${latexFrac(1, answerDen)}$.`,
      hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
    };
  }
};

const generateImproperIntegralsProblem = (): Problem => {
  const problems: { text: string; answer: string | number; type: 'numeric' | 'expression'; alts?: string[]; hint: string; explanation: string; tolerance?: number }[] = [
    {
      text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x^2}\\,dx$\nEvaluate (enter a number or "diverges")',
      answer: 1,
      type: 'numeric',
      hint: '$\\int x^{-2}\\,dx = -x^{-1}$. Evaluate the limit as $b \\to \\infty$.',
      explanation: '$\\int_1^b x^{-2}\\,dx = \\left[-\\frac{1}{x}\\right]_1^b = 1 - \\frac{1}{b} \\to 1$ as $b \\to \\infty$.',
    },
    {
      text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x}\\,dx$\nDoes this converge or diverge?',
      answer: 'diverges',
      type: 'expression',
      alts: ['diverge', 'divergent', 'infinity', 'inf'],
      hint: '$\\int \\frac{1}{x}\\,dx = \\ln|x|$. What happens as $x \\to \\infty$?',
      explanation: '$\\int_1^b \\frac{1}{x}\\,dx = \\ln(b) \\to \\infty$ as $b \\to \\infty$, so the integral diverges.',
    },
    {
      text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x^3}\\,dx$\nEvaluate (enter an exact number or fraction)',
      answer: 0.5,
      type: 'numeric',
      hint: '$\\int x^{-3}\\,dx = \\frac{x^{-2}}{-2}$. Evaluate the limit.',
      explanation: '$\\int_1^b x^{-3}\\,dx = \\left[-\\frac{1}{2x^2}\\right]_1^b = -\\frac{1}{2b^2} + \\frac{1}{2} \\to \\frac{1}{2}$ as $b \\to \\infty$.',
    },
    {
      text: '$\\displaystyle\\int_0^{\\infty} e^{-x}\\,dx$\nEvaluate (enter a number)',
      answer: 1,
      type: 'numeric',
      hint: '$\\int e^{-x}\\,dx = -e^{-x}$. What is $e^{-x}$ as $x \\to \\infty$?',
      explanation: '$\\int_0^b e^{-x}\\,dx = \\left[-e^{-x}\\right]_0^b = 1 - e^{-b} \\to 1$ as $b \\to \\infty$.',
    },
    {
      text: 'For the $p$-series test: $\\displaystyle\\int_1^{\\infty} \\frac{1}{x^p}\\,dx$ converges when $p$ is ___?\n(Enter an inequality like $p > 1$)',
      answer: 'p>1',
      type: 'expression',
      alts: ['p > 1', 'p>1'],
      hint: 'Think about the antiderivative $\\frac{x^{1-p}}{1-p}$ and when the limit exists.',
      explanation: 'The integral converges when p > 1 and diverges when p ≤ 1.',
    },
  ];

  const chosen = randChoice(problems);

  if (chosen.type === 'numeric') {
    return {
      id: crypto.randomUUID(),
      topicId: 'improper-integrals',
      problemText: chosen.text,
      answerType: 'numeric',
      correctAnswer: chosen.answer as number,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'improper-integrals',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer as string,
    acceptableAnswers: chosen.alts,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

const generateSequencesProblem = (): Problem => {
  const problemType = randChoice(['arithmetic', 'geometric', 'convergence', 'bounded-monotone']);

  if (problemType === 'arithmetic') {
    const a1 = randInt(1, 10);
    const d = randInt(2, 7);
    const n = randInt(5, 15);
    // a_n = a1 + (n-1)d
    const answer = a1 + (n - 1) * d;

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences',
      problemText: `Find the $${n}$th term of the arithmetic sequence:\n$a_1 = ${a1}$, $d = ${d}$`,
      answerType: 'numeric',
      correctAnswer: answer,
      explanationPrompt: `Use $a_n = a_1 + (n-1)d = ${a1} + (${n}-1)(${d}) = ${answer}$`,
      hint: `Formula: $a_n = a_1 + (n-1)d$`,
    };
  } else if (problemType === 'geometric') {
    const a1 = randInt(2, 5);
    const r = randInt(2, 3);
    const n = randInt(3, 6);
    // a_n = a1 * r^(n-1)
    const answer = a1 * Math.pow(r, n - 1);

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences',
      problemText: `Find the $${n}$th term of the geometric sequence:\n$a_1 = ${a1}$, $r = ${r}$`,
      answerType: 'numeric',
      correctAnswer: answer,
      explanationPrompt: `Use $a_n = a_1 \\cdot r^{n-1} = ${a1} \\cdot ${r}^{${n - 1}} = ${answer}$`,
      hint: `Formula: $a_n = a_1 \\cdot r^{n-1}$`,
    };
  } else if (problemType === 'bounded-monotone') {
    const seqs: { text: string; answer: string; alts: string[]; hint: string; explanation: string }[] = [
      {
        text: 'The sequence $a_n = \\frac{n}{n+1}$ is increasing and bounded above by $1$.\nBy the Monotone Convergence Theorem, does it converge? If so, to what?',
        answer: '1',
        alts: ['converges to 1', 'converges', 'yes'],
        hint: 'A bounded, monotonically increasing sequence must converge. Find the limit.',
        explanation: 'lim(n→∞) n/(n+1) = 1. The sequence is increasing and bounded above by 1, so by the MCT it converges to 1.',
      },
      {
        text: 'The sequence $a_n = \\frac{1}{n!}$ is decreasing and bounded below by $0$.\nBy the Monotone Convergence Theorem, does it converge? If so, to what?',
        answer: '0',
        alts: ['converges to 0', 'converges', 'yes'],
        hint: 'A bounded, monotonically decreasing sequence must converge.',
        explanation: 'The sequence is decreasing (n! grows) and bounded below by 0. By MCT it converges. lim 1/n! = 0.',
      },
      {
        text: 'Is the sequence $a_n = (-1)^n \\cdot \\frac{1}{n}$ monotonic?',
        answer: 'no',
        alts: ['not monotonic', 'no it is not', 'neither'],
        hint: 'Check: does $a_{n+1} \\geq a_n$ always, or $a_{n+1} \\leq a_n$ always?',
        explanation: 'Starting at $n = 1$ the terms are $-1, \\frac{1}{2}, -\\frac{1}{3}, \\frac{1}{4}, \\ldots$ — they alternate in sign, so the sequence is neither increasing nor decreasing and the MCT does not apply directly (it still converges to 0).',
      },
    ];

    const chosen = randChoice(seqs);

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences',
      problemText: chosen.text,
      answerType: 'expression',
      correctAnswer: chosen.answer,
      acceptableAnswers: chosen.alts,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  } else {
    // Convergence of sequences
    const seqs: { text: string; answer: string; alts: string[]; hint: string; explanation: string }[] = [
      {
        text: 'Does the sequence $a_n = \\frac{1}{n}$ converge or diverge?\nIf converges, what is the limit?',
        answer: '0',
        alts: ['converges to 0', 'converges'],
        hint: 'As $n \\to \\infty$, what happens to $\\frac{1}{n}$?',
        explanation: 'lim(n→∞) 1/n = 0, so the sequence converges to 0.',
      },
      {
        text: 'Does the sequence $a_n = \\frac{n+1}{n}$ converge or diverge?\nIf converges, what is the limit?',
        answer: '1',
        alts: ['converges to 1', 'converges'],
        hint: 'Divide numerator and denominator by $n$.',
        explanation: 'lim(n→∞) (n+1)/n = lim(n→∞) (1 + 1/n) = 1.',
      },
      {
        text: 'Does the sequence $a_n = (-1)^n$ converge or diverge?',
        answer: 'diverges',
        alts: ['diverge', 'divergent'],
        hint: 'The terms alternate between $-1$ and $1$.',
        explanation: 'The sequence oscillates between -1 and 1, so it diverges.',
      },
      {
        text: 'Does the sequence $a_n = n^2$ converge or diverge?',
        answer: 'diverges',
        alts: ['diverge', 'divergent', 'infinity'],
        hint: 'As $n$ gets larger, does $n^2$ approach a finite value?',
        explanation: 'lim(n→∞) n² = ∞, so the sequence diverges.',
      },
    ];

    const chosen = randChoice(seqs);

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences',
      problemText: chosen.text,
      answerType: 'expression',
      correctAnswer: chosen.answer,
      acceptableAnswers: chosen.alts,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  }
};

const generateSeriesConvergenceProblem = (): Problem => {
  const problems: { text: string; answer: string | number; type: 'numeric' | 'expression'; alts?: string[]; hint: string; explanation: string; tolerance?: number }[] = [
    {
      text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{1}{2}\\right)^n$\nWhat is the sum?',
      answer: 2,
      type: 'numeric',
      hint: 'Geometric series $\\sum r^n = \\frac{1}{1-r}$ when $|r| < 1$.',
      explanation: 'Σ(1/2)ⁿ = 1/(1 - 1/2) = 1/(1/2) = 2',
    },
    {
      text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{1}{3}\\right)^n$\nWhat is the sum? (exact: a fraction or decimal)',
      answer: 1.5,
      type: 'numeric',
      hint: 'Geometric series $\\sum r^n = \\frac{1}{1-r}$ when $|r| < 1$.',
      explanation: '$\\sum (1/3)^n = \\frac{1}{1 - 1/3} = \\frac{1}{2/3} = \\frac{3}{2} = 1.5$',
    },
    {
      text: 'Does $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n}$ converge or diverge?\n(This is the harmonic series)',
      answer: 'diverges',
      type: 'expression',
      alts: ['diverge', 'divergent'],
      hint: 'This is a $p$-series with $p = 1$.',
      explanation: 'The harmonic series Σ 1/n diverges (p-series with p=1 ≤ 1).',
    },
    {
      text: 'Does $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$ converge or diverge?',
      answer: 'converges',
      type: 'expression',
      alts: ['converge', 'convergent'],
      hint: 'This is a $p$-series with $p = 2$.',
      explanation: 'p-series with p=2 > 1, so it converges (to π²/6).',
    },
    {
      text: 'Use the Ratio Test on $\\displaystyle\\sum_{n=0}^{\\infty} \\frac{n!}{2^n}$.\nDoes it converge or diverge?',
      answer: 'diverges',
      type: 'expression',
      alts: ['diverge', 'divergent'],
      hint: 'Find $\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|$. If $> 1$, diverges.',
      explanation: '|aₙ₊₁/aₙ| = (n+1)/2 → ∞ > 1, diverges.',
    },
    {
      text: 'Does the alternating series $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n}$ converge or diverge?',
      answer: 'converges',
      type: 'expression',
      alts: ['converge', 'convergent'],
      hint: 'Check the Alternating Series Test: is $\\frac{1}{n}$ decreasing and $\\to 0$?',
      explanation: 'By the AST: bₙ = 1/n is decreasing and lim bₙ = 0, so it converges.',
    },
    {
      text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{3}{2}\\right)^n$.\nDoes it converge or diverge?',
      answer: 'diverges',
      type: 'expression',
      alts: ['diverge', 'divergent'],
      hint: 'For a geometric series, check if $|r| < 1$.',
      explanation: '|r| = 3/2 > 1, so the geometric series diverges.',
    },
    {
      text: 'Apply the Nth-Term Test: $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{n}{n+1}$.\nDoes it converge or diverge?',
      answer: 'diverges',
      type: 'expression',
      alts: ['diverge', 'divergent'],
      hint: 'Find $\\lim_{n \\to \\infty} a_n$. If it is not $0$, the series diverges.',
      explanation: 'lim n/(n+1) = 1 ≠ 0, so by the Nth-Term Test, the series diverges.',
    },
    {
      text: 'Apply the Nth-Term Test: $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$.\nDoes the Nth-Term Test tell us it converges?',
      answer: 'no',
      type: 'expression',
      alts: ['no', 'inconclusive', 'not enough info'],
      hint: '$\\lim a_n = 0$, but does that guarantee convergence?',
      explanation: 'lim 1/n² = 0. The Nth-Term Test is inconclusive when lim=0. (It does converge, but by the p-series test, not the NTT.)',
    },
  ];

  const chosen = randChoice(problems);

  if (chosen.type === 'numeric') {
    return {
      id: crypto.randomUUID(),
      topicId: 'series-convergence',
      problemText: chosen.text,
      answerType: 'numeric',
      correctAnswer: chosen.answer as number,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'series-convergence',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer as string,
    acceptableAnswers: chosen.alts,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

const generatePowerSeriesProblem = (): Problem => {
  const problems: { text: string; answer: number | string; type: 'numeric' | 'expression'; alts?: string[]; hint: string; explanation: string }[] = [
    {
      text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}$',
      answer: 'infinity',
      type: 'expression',
      alts: ['inf', '∞', 'infinite'],
      hint: 'Use the Ratio Test: $\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{|x|}{n+1}$.',
      explanation: 'Ratio Test: lim |x|/(n+1) = 0 < 1 for all x, so R = ∞ (this is eˣ).',
    },
    {
      text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} x^n$',
      answer: 1,
      type: 'numeric',
      hint: 'This is a geometric series with ratio $x$.',
      explanation: 'Geometric series converges when |x| < 1, so R = 1.',
    },
    {
      text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} nx^n$',
      answer: 1,
      type: 'numeric',
      hint: 'Use the Ratio Test: $\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{(n+1)|x|}{n}$.',
      explanation: 'Ratio Test: lim (n+1)|x|/n = |x|, converges when |x| < 1, R = 1.',
    },
    {
      text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} \\frac{x^n}{2^n}$',
      answer: 2,
      type: 'numeric',
      hint: 'Rewrite as $\\sum \\left(\\frac{x}{2}\\right)^n$ — geometric series.',
      explanation: 'This is Σ (x/2)ⁿ, converges when |x/2| < 1, i.e. |x| < 2, so R = 2.',
    },
    {
      text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=1}^{\\infty} \\frac{x^n}{n}$',
      answer: 1,
      type: 'numeric',
      hint: 'Use the Ratio Test: $\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{n|x|}{n+1}$.',
      explanation: 'Ratio Test: lim n|x|/(n+1) = |x|, converges when |x| < 1, R = 1.',
    },
  ];

  const chosen = randChoice(problems);

  if (chosen.type === 'numeric') {
    return {
      id: crypto.randomUUID(),
      topicId: 'power-series',
      problemText: chosen.text,
      answerType: 'numeric',
      correctAnswer: chosen.answer as number,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'power-series',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer as string,
    acceptableAnswers: chosen.alts,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

const generateTaylorMaclaurinProblem = (): Problem => {
  type Item =
    | { kind: 'expression'; text: string; answer: string; display: string; hint: string; explanation: string }
    | { kind: 'numeric'; text: string; answer: number; display: string; roundTo?: number; hint: string; explanation: string };
  const problems: Item[] = [
    {
      kind: 'expression',
      text: 'What is the Maclaurin series for $e^x$?\n(Write the first 4 terms)',
      answer: '1+x+x^2/2+x^3/6',
      display: '$1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!}$',
      hint: 'All derivatives of $e^x$ equal $e^x$, and $f(0) = 1$.',
      explanation: '$e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots$',
    },
    {
      kind: 'expression',
      text: 'What is the Maclaurin series for $\\sin(x)$?\n(Write the first 3 non-zero terms)',
      answer: 'x-x^3/6+x^5/120',
      display: '$x - \\frac{x^3}{3!} + \\frac{x^5}{5!}$',
      hint: '$\\sin(x)$ has only odd powers of $x$ in its series.',
      explanation: '$\\sin(x) = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\cdots = x - \\frac{x^3}{6} + \\frac{x^5}{120} - \\cdots$',
    },
    {
      kind: 'expression',
      text: 'What is the Maclaurin series for $\\cos(x)$?\n(Write the first 3 non-zero terms)',
      answer: '1-x^2/2+x^4/24',
      display: '$1 - \\frac{x^2}{2!} + \\frac{x^4}{4!}$',
      hint: '$\\cos(x)$ has only even powers of $x$ in its series.',
      explanation: '$\\cos(x) = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots = 1 - \\frac{x^2}{2} + \\frac{x^4}{24} - \\cdots$',
    },
    {
      kind: 'expression',
      text: 'What is the Maclaurin series for $\\frac{1}{1-x}$?\n(Write the first 4 terms)',
      answer: '1+x+x^2+x^3',
      display: '$1 + x + x^2 + x^3$',
      hint: 'This is a geometric series!',
      explanation: '$\\frac{1}{1-x} = \\sum_{n=0}^{\\infty} x^n = 1 + x + x^2 + x^3 + \\cdots$ for $|x| < 1$.',
    },
    {
      kind: 'numeric',
      text: 'What is the coefficient of $x^2$ in the Maclaurin series for $e^x$?\n(Enter an exact value: a fraction or decimal)',
      answer: 0.5,
      display: '$\\frac{1}{2}$',
      hint: 'The coefficient of $x^n$ in $e^x$ is $\\frac{1}{n!}$',
      explanation: '$e^x = \\sum \\frac{x^n}{n!}$, so the coefficient of $x^2$ is $\\frac{1}{2!} = \\frac{1}{2}$.',
    },
    {
      kind: 'numeric',
      // |R_3(0.5)| <= M (0.5)^4 / 4! with M = max e^c on [0, 0.5] = e^{0.5}
      text: 'Using the Lagrange error bound, find the maximum error when approximating $e^x$ by its 3rd-degree Maclaurin polynomial at $x = 0.5$.\n(Round to 4 decimal places)',
      answer: Math.exp(0.5) * Math.pow(0.5, 4) / 24,
      display: '$\\frac{e^{0.5}(0.5)^4}{4!} \\approx 0.0043$',
      roundTo: 4,
      hint: 'The Lagrange remainder: $|R_n(x)| \\leq \\frac{M|x|^{n+1}}{(n+1)!}$ where $M = \\max|f^{(n+1)}(c)|$ on $[0, x]$.',
      explanation: 'All derivatives of $e^x$ are $e^x$, which is increasing, so on $[0, 0.5]$ the maximum is $M = e^{0.5} \\approx 1.6487$ (using $M = 1$ would NOT be a valid bound, since $e^c > 1$ for $c > 0$). Then $|R_3(0.5)| \\leq \\frac{e^{0.5}(0.5)^4}{4!} = \\frac{1.6487 \\cdot 0.0625}{24} \\approx 0.0043$. The actual error $e^{0.5} - P_3(0.5) \\approx 0.0029$ is indeed below this bound.',
    },
    {
      kind: 'numeric',
      text: 'The alternating series $\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n}$ is approximated by its first 4 terms.\nWhat is the bound on the error given by the Alternating Series Remainder? (exact value)',
      answer: 0.2,
      display: '$\\frac{1}{5} = 0.2$',
      hint: 'For an alternating series, the error is bounded by the absolute value of the first omitted term.',
      explanation: 'The first 4 terms are $1 - \\frac{1}{2} + \\frac{1}{3} - \\frac{1}{4}$. The first omitted term is $\\frac{1}{5}$, so by the Alternating Series Remainder $|\\text{error}| \\leq \\frac{1}{5} = 0.2$.',
    },
  ];

  const chosen = randChoice(problems);

  if (chosen.kind === 'numeric') {
    return {
      id: crypto.randomUUID(),
      topicId: 'taylor-maclaurin',
      problemText: chosen.text,
      answerType: chosen.roundTo !== undefined ? 'decimal-tolerance' : 'numeric',
      correctAnswer: chosen.answer,
      roundTo: chosen.roundTo,
      displayAnswer: chosen.display,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'taylor-maclaurin',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    displayAnswer: chosen.display,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

const generateParametricEquationsProblem = (): Problem => {
  const problemType = randChoice(['eliminate', 'dydx', 'point']);

  if (problemType === 'eliminate') {
    // x = t + a, y = t² + b → y = (x-a)² + b
    const a = randInt(1, 5);
    const b = randInt(-3, 3);

    return {
      id: crypto.randomUUID(),
      topicId: 'parametric-equations',
      problemText: `Given $x = t + ${a}$, $y = t^2${b >= 0 ? ' + ' + b : ' - ' + Math.abs(b)}$\nEliminate the parameter. What is $y$ in terms of $x$?`,
      answerType: 'expression',
      correctAnswer: `(x-${a})^2${b >= 0 ? '+' + b : '-' + Math.abs(b)}`,
      displayAnswer: `$y = (x - ${a})^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}$`,
      explanationPrompt: `From $x = t + ${a}$, $t = x - ${a}$. Substitute: $y = (x - ${a})^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}$.`,
      hint: 'Solve the x equation for t, then substitute into the y equation.',
    };
  } else if (problemType === 'dydx') {
    // x = t², y = t³ → dy/dx = (dy/dt)/(dx/dt) = 3t²/(2t) = 3t/2
    // Evaluate at a specific t
    const t = randInt(2, 5);
    const answer = (3 * t) / 2;

    return {
      id: crypto.randomUUID(),
      topicId: 'parametric-equations',
      problemText: `Given $x = t^2$, $y = t^3$\nFind $\\frac{dy}{dx}$ at $t = ${t}$. (exact: a fraction or decimal)`,
      answerType: 'numeric',
      correctAnswer: answer,
      displayAnswer: `$${latexFrac(3 * t, 2)} = ${answer}$`,
      explanationPrompt: `$\\frac{dy}{dx} = \\frac{dy/dt}{dx/dt} = \\frac{3t^2}{2t} = \\frac{3t}{2}$ (for $t \\neq 0$). At $t = ${t}$: $\\frac{dy}{dx} = ${latexFrac(3 * t, 2)} = ${answer}$.`,
      hint: 'dy/dx = (dy/dt) / (dx/dt). Find each derivative separately.',
    };
  } else {
    // Find a point on the curve
    const t = randInt(1, 4);
    const a = randInt(2, 4);
    const x = a * t;
    const y = t * t;

    return {
      id: crypto.randomUUID(),
      topicId: 'parametric-equations',
      problemText: `Given $x = ${a}t$, $y = t^2$\nWhat is the $y$-coordinate when $t = ${t}$?`,
      answerType: 'numeric',
      correctAnswer: y,
      explanationPrompt: `Substitute $t = ${t}$: $y = ${t}^2 = ${y}$.`,
      hint: 'Just substitute the value of t into the y equation.',
    };
  }
};

const generatePolarCoordinatesProblem = (): Problem => {
  const problemType = randChoice(['cartesian-to-polar-r', 'cartesian-to-polar-theta', 'polar-to-cartesian-x', 'polar-to-cartesian-y', 'identify-curve']);

  if (problemType === 'cartesian-to-polar-r') {
    const x = randInt(3, 8);
    const y = randInt(3, 8);
    const r = Math.sqrt(x * x + y * y);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert $(${x}, ${y})$ from Cartesian to polar.\nWhat is $r$? (round to 2 decimal places)`,
      answerType: 'decimal-tolerance',
      correctAnswer: r,
      roundTo: 2,
      displayAnswer: `$\\sqrt{${x * x + y * y}} \\approx ${r.toFixed(2)}$`,
      explanationPrompt: `$r = \\sqrt{x^2 + y^2} = \\sqrt{${x}^2 + ${y}^2} = \\sqrt{${x * x + y * y}} \\approx ${r.toFixed(2)}$`,
      hint: '$r = \\sqrt{x^2 + y^2}$',
    };
  } else if (problemType === 'cartesian-to-polar-theta') {
    // Use simple angles: (1,1) → 45°, (0,r) → 90°, (r,0) → 0°. The angle is
    // only unique once an interval is fixed, so the text states [0°, 360°).
    const cases = [
      { x: 1, y: 1, theta: 45, explanation: '$x > 0$, so $\\theta = \\arctan\\left(\\frac{y}{x}\\right) = \\arctan(1) = 45°$ (first quadrant, no adjustment needed).' },
      { x: 0, y: 5, theta: 90, explanation: '$x = 0$ and $y > 0$: the point lies on the positive $y$-axis, so $\\theta = 90°$. ($\\arctan(y/x)$ is undefined here — the formula does not apply when $x = 0$.)' },
      { x: 3, y: 0, theta: 0, explanation: '$y = 0$ and $x > 0$: the point lies on the positive $x$-axis, so $\\theta = 0°$.' },
    ];
    const chosen = randChoice(cases);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert $(${chosen.x}, ${chosen.y})$ from Cartesian to polar.\nWhat is $\\theta$ in degrees, with $0° \\leq \\theta < 360°$?`,
      answerType: 'numeric',
      correctAnswer: chosen.theta,
      displayAnswer: `$${chosen.theta}°$`,
      explanationPrompt: chosen.explanation,
      hint: 'Use the signs of $x$ and $y$ to find the quadrant. $\\arctan(y/x)$ alone is only correct when $x > 0$, and is undefined when $x = 0$.',
    };
  } else if (problemType === 'polar-to-cartesian-x') {
    // r=R, θ=angle → x = R·cos(θ)
    const cases = [
      { r: 4, theta: 60, x: 2, cosLatex: '\\frac{1}{2}', desc: '60°' },
      { r: 6, theta: 0, x: 6, cosLatex: '1', desc: '0°' },
      { r: 2, theta: 90, x: 0, cosLatex: '0', desc: '90°' },
      { r: 4, theta: 45, x: 2 * Math.SQRT2, cosLatex: '\\frac{\\sqrt{2}}{2}', desc: '45°' },
    ];
    const chosen = randChoice(cases);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert polar $(r=${chosen.r},\\; \\theta=${chosen.desc})$ to Cartesian.\nWhat is $x$? (round to 2 decimal places)`,
      answerType: 'decimal-tolerance',
      correctAnswer: chosen.x,
      roundTo: 2,
      displayAnswer: `$${Number.isInteger(chosen.x) ? chosen.x : `2\\sqrt{2} \\approx ${chosen.x.toFixed(2)}`}$`,
      explanationPrompt: `$x = r\\cos(\\theta) = ${chosen.r}\\cos(${chosen.desc}) = ${chosen.r} \\cdot ${chosen.cosLatex} = ${Number.isInteger(chosen.x) ? chosen.x : `2\\sqrt{2} \\approx ${chosen.x.toFixed(2)}`}$`,
      hint: '$x = r\\cos(\\theta)$',
    };
  } else if (problemType === 'polar-to-cartesian-y') {
    const cases = [
      { r: 4, theta: 30, y: 2, desc: '30°' },
      { r: 6, theta: 90, y: 6, desc: '90°' },
      { r: 2, theta: 0, y: 0, desc: '0°' },
    ];
    const chosen = randChoice(cases);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert polar $(r=${chosen.r},\\; \\theta=${chosen.desc})$ to Cartesian.\nWhat is $y$?`,
      answerType: 'numeric',
      correctAnswer: chosen.y,
      explanationPrompt: `$y = r\\sin(\\theta) = ${chosen.r}\\sin(${chosen.desc}) = ${chosen.r} \\cdot ${chosen.theta === 30 ? '\\frac{1}{2}' : chosen.theta === 90 ? '1' : '0'} = ${chosen.y}$`,
      hint: '$y = r\\sin(\\theta)$',
    };
  } else {
    // Identify polar curves
    const curves: { eq: string; answer: string; alts: string[]; hint: string }[] = [
      { eq: '$r = 5$', answer: 'circle', alts: ['a circle'], hint: '$r = $ constant means all points are the same distance from the origin.' },
      { eq: '$\\theta = \\frac{\\pi}{4}$', answer: 'line', alts: ['a line', 'ray'], hint: '$\\theta = $ constant is a ray/line from the origin.' },
      { eq: '$r = 2\\cos(\\theta)$', answer: 'circle', alts: ['a circle'], hint: '$r = a\\cos(\\theta)$ is a circle passing through the origin.' },
      { eq: '$r = 3\\sin(\\theta)$', answer: 'circle', alts: ['a circle'], hint: '$r = a\\sin(\\theta)$ is a circle passing through the origin.' },
    ];
    const chosen = randChoice(curves);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `What type of curve is ${chosen.eq}?`,
      answerType: 'expression',
      correctAnswer: chosen.answer,
      acceptableAnswers: chosen.alts,
      explanationPrompt: `The polar equation ${chosen.eq} represents a ${chosen.answer}.`,
      hint: chosen.hint,
    };
  }
};

const generateIntegrationApplicationsProblem = (): Problem => {
  const problemType = randChoice(['disk', 'washer', 'shell', 'arc-length', 'surface-area']);

  // correctAnswer holds the exact value; grading accepts anything within half a
  // unit of the last requested decimal place (see roundTo).
  if (problemType === 'disk') {
    const a = randInt(2, 5);
    const vol = Math.PI * Math.pow(a, 3) / 3;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the volume of the solid formed by revolving $y = x$ around the x-axis from $x = 0$ to $x = ${a}$.\n(Use the disk method. Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: vol,
      roundTo: 2,
      displayAnswer: `$\\frac{${a * a * a}\\pi}{3} \\approx ${vol.toFixed(2)}$`,
      explanationPrompt: `$V = \\pi\\int_0^{${a}} x^2\\,dx = \\pi\\left[\\frac{x^3}{3}\\right]_0^{${a}} = \\frac{${a * a * a}\\pi}{3} \\approx ${vol.toFixed(2)}$`,
      hint: 'Disk method: $V = \\pi \\int_a^b [f(x)]^2\\,dx$. Here $f(x) = x$.',
    };
  } else if (problemType === 'washer') {
    const vol = 2 * Math.PI / 15;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the volume of the solid formed by revolving the region between $y = x$ and $y = x^2$ (from $x=0$ to $x=1$) around the x-axis.\n(Round to 3 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: vol,
      roundTo: 3,
      displayAnswer: `$\\frac{2\\pi}{15} \\approx ${vol.toFixed(3)}$`,
      explanationPrompt: `On $[0,1]$, $x \\geq x^2$, so the outer radius is $x$. $V = \\pi\\int_0^1 (x^2 - x^4)\\,dx = \\pi\\left[\\frac{x^3}{3} - \\frac{x^5}{5}\\right]_0^1 = \\pi\\left(\\frac{1}{3} - \\frac{1}{5}\\right) = \\frac{2\\pi}{15} \\approx ${vol.toFixed(3)}$`,
      hint: 'Washer method: $V = \\pi \\int [R(x)]^2 - [r(x)]^2\\,dx$. Which function is farther from the x-axis on $[0,1]$?',
    };
  } else if (problemType === 'shell') {
    const a = randInt(1, 3);
    const vol = Math.PI * Math.pow(a, 4) / 2;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Use the shell method to find the volume when $y = x^2$ (from $x=0$ to $x=${a}$) is revolved around the y-axis.\n(Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: vol,
      roundTo: 2,
      displayAnswer: `$\\frac{${Math.pow(a, 4)}\\pi}{2} \\approx ${vol.toFixed(2)}$`,
      explanationPrompt: `$V = 2\\pi\\int_0^{${a}} x \\cdot x^2\\,dx = 2\\pi\\left[\\frac{x^4}{4}\\right]_0^{${a}} = \\frac{${Math.pow(a, 4)}\\pi}{2} \\approx ${vol.toFixed(2)}$`,
      hint: 'Shell method: $V = 2\\pi \\int_a^b x \\cdot f(x)\\,dx$. Here $f(x) = x^2$.',
    };
  } else if (problemType === 'arc-length') {
    const a = randInt(2, 6);
    const answer = a * Math.SQRT2;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the arc length of $y = x$ from $x = 0$ to $x = ${a}$.\n(Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      roundTo: 2,
      displayAnswer: `$${a}\\sqrt{2} \\approx ${answer.toFixed(2)}$`,
      explanationPrompt: `$L = \\int_0^{${a}} \\sqrt{1 + [f'(x)]^2}\\,dx = \\int_0^{${a}} \\sqrt{1 + 1}\\,dx = ${a}\\sqrt{2} \\approx ${answer.toFixed(2)}$`,
      hint: 'Arc length: $L = \\int_a^b \\sqrt{1 + [f\'(x)]^2}\\,dx$. Find $f\'(x)$ first.',
    };
  } else {
    const a = randInt(2, 4);
    const answer = Math.PI * Math.SQRT2 * a * a;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the surface area when $y = x$ from $x = 0$ to $x = ${a}$ is revolved around the x-axis.\n(Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      roundTo: 2,
      displayAnswer: `$${a * a}\\sqrt{2}\\pi \\approx ${answer.toFixed(2)}$`,
      explanationPrompt: `Here $f(x) = x \\geq 0$ on $[0, ${a}]$. $S = 2\\pi\\int_0^{${a}} x\\sqrt{1 + 1}\\,dx = 2\\sqrt{2}\\pi\\left[\\frac{x^2}{2}\\right]_0^{${a}} = ${a * a}\\sqrt{2}\\pi \\approx ${answer.toFixed(2)}$`,
      hint: 'Surface area: $S = 2\\pi \\int f(x)\\sqrt{1 + [f\'(x)]^2}\\,dx$ (for $f(x) \\geq 0$).',
    };
  }
};

const generateTrigSubstitutionProblem = (): Problem => {
  type Item =
    | { kind: 'expression'; text: string; answer: string; alts: string[]; display: string; hint: string; explanation: string }
    | { kind: 'numeric'; text: string; answer: number; display: string; hint: string; explanation: string };
  // Substitution answers are equations "x = a·f(θ)". Any parameter name is
  // accepted (θ, t, u, ...), and the co-function substitution is listed as a
  // valid alternative since it works with a suitable parameter interval.
  const problems: Item[] = [
    {
      kind: 'expression',
      text: 'For $\\displaystyle\\int \\sqrt{4 - x^2}\\,dx$, what trigonometric substitution should you use?\n(Answer as an equation, e.g. "x = ...")',
      answer: 'x=2sin(theta)',
      alts: ['x=2cos(theta)'],
      display: '$x = 2\\sin\\theta$ (or $x = 2\\cos\\theta$)',
      hint: 'The integrand has the form $\\sqrt{a^2 - x^2}$ with $a = 2$.',
      explanation: 'For $\\sqrt{a^2 - x^2}$ use $x = a\\sin\\theta$ with $-\\frac{\\pi}{2} \\leq \\theta \\leq \\frac{\\pi}{2}$, so $\\sqrt{4 - 4\\sin^2\\theta} = 2\\cos\\theta$. Here $a = 2$: $x = 2\\sin\\theta$. ($x = 2\\cos\\theta$ with $0 \\leq \\theta \\leq \\pi$ also works.)',
    },
    {
      kind: 'expression',
      text: 'For $\\displaystyle\\int \\frac{dx}{\\sqrt{x^2 + 9}}$, what trigonometric substitution should you use?\n(Answer as an equation, e.g. "x = ...")',
      answer: 'x=3tan(theta)',
      alts: ['x=3cot(theta)'],
      display: '$x = 3\\tan\\theta$',
      hint: 'The integrand has the form $\\sqrt{x^2 + a^2}$ with $a = 3$.',
      explanation: 'For $\\sqrt{x^2 + a^2}$ use $x = a\\tan\\theta$ with $-\\frac{\\pi}{2} < \\theta < \\frac{\\pi}{2}$, so $\\sqrt{9\\tan^2\\theta + 9} = 3\\sec\\theta$. Here $a = 3$: $x = 3\\tan\\theta$.',
    },
    {
      kind: 'expression',
      text: 'For $\\displaystyle\\int \\frac{dx}{x^2\\sqrt{x^2 - 16}}$, what trigonometric substitution should you use?\n(Answer as an equation, e.g. "x = ...")',
      answer: 'x=4sec(theta)',
      alts: ['x=4csc(theta)'],
      display: '$x = 4\\sec\\theta$',
      hint: 'The integrand has the form $\\sqrt{x^2 - a^2}$ with $a = 4$.',
      explanation: 'For $\\sqrt{x^2 - a^2}$ use $x = a\\sec\\theta$ with $0 \\leq \\theta < \\frac{\\pi}{2}$ (for $x \\geq a$), so $\\sqrt{16\\sec^2\\theta - 16} = 4\\tan\\theta$. Here $a = 4$: $x = 4\\sec\\theta$.',
    },
    {
      kind: 'numeric',
      text: 'Evaluate exactly: $\\displaystyle\\int_0^1 \\sqrt{1 - x^2}\\,dx$\n(This is a quarter-circle area. You may type "pi/4".)',
      answer: Math.PI / 4,
      display: '$\\frac{\\pi}{4} \\approx 0.7854$',
      hint: 'Substitute $x = \\sin(\\theta)$, or recognize this as the area of a quarter unit circle.',
      explanation: '$\\int_0^1 \\sqrt{1 - x^2}\\,dx$ is the area under the upper unit semicircle for $0 \\leq x \\leq 1$: a quarter circle of radius 1, so it equals $\\frac{\\pi}{4} \\approx 0.7854$.',
    },
  ];

  const chosen = randChoice(problems);

  if (chosen.kind === 'numeric') {
    return {
      id: crypto.randomUUID(),
      topicId: 'trig-substitution',
      problemText: chosen.text,
      answerType: 'numeric',
      correctAnswer: chosen.answer,
      displayAnswer: chosen.display,
      explanationPrompt: chosen.explanation,
      hint: chosen.hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-substitution',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    acceptableAnswers: chosen.alts,
    displayAnswer: chosen.display,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

// ===========================
// MAIN GENERATOR FUNCTION
// ===========================

export const generateProblem = (topicId: TopicId, numberRange?: { min: number; max: number }, allowNegatives?: boolean): Problem => {
  const opts: NumberRangeOptions = { numberRange, allowNegatives };
  switch (topicId) {
    // Basic Arithmetic
    case 'addition':
      return generateAdditionProblem(opts);
    case 'subtraction':
      return generateSubtractionProblem(opts);
    case 'multiplication':
      return generateMultiplicationProblem(opts);
    case 'division':
      return generateDivisionProblem(opts);

    // Pre-Algebra
    case 'simple-linear-equations':
      return generateSimpleLinearEquationProblem();
    case 'fractions-basic':
      return generateFractionsBasicProblem();
    case 'decimals':
      return generateDecimalsProblem();
    case 'order-of-operations':
      return generateOrderOfOperationsProblem();
    case 'integers':
      return generateIntegersProblem();

    // Algebra 1
    case 'multi-step-equations':
      return generateMultiStepEquationProblem();
    case 'inequalities':
      return generateInequalitiesProblem();
    case 'systems-of-equations':
      return generateSystemsOfEquationsProblem();
    case 'exponents':
      return generateExponentsProblem();
    case 'polynomials':
      return generatePolynomialsProblem();
    case 'factoring':
      return generateFactoringProblem();
    case 'quadratic-equations':
      return generateQuadraticEquationsProblem();

    // Geometry
    case 'angles':
      return generateAnglesProblem();
    case 'triangles':
      return generateTrianglesProblem();
    case 'pythagorean-theorem':
      return generatePythagoreanTheoremProblem();
    case 'area-perimeter':
      return generateAreaPerimeterProblem();
    case 'circles':
      return generateCirclesProblem();
    case 'volume-surface-area':
      return generateVolumeSurfaceAreaProblem();

    // Algebra 2
    case 'complex-numbers':
      return generateComplexNumbersProblem();
    case 'rational-expressions':
      return generateRationalExpressionsProblem();
    case 'radicals':
      return generateRadicalsProblem();
    case 'logarithms':
      return generateLogarithmsProblem();
    case 'sequences-series':
      return generateSequencesSeriesProblem();

    // Trigonometry
    case 'trig-ratios':
      return generateTrigRatiosProblem();
    case 'trig-special-angles':
      return generateTrigSpecialAnglesProblem();
    case 'trig-identities':
      return generateTrigIdentitiesProblem();
    case 'trig-equations':
      return generateTrigEquationsProblem();
    case 'inverse-trig':
      return generateInverseTrigProblem();

    // Pre-Calculus
    case 'functions':
      return generateFunctionsProblem();
    case 'polynomial-functions':
      return generatePolynomialFunctionsProblem();
    case 'rational-functions':
      return generateRationalFunctionsProblem();
    case 'exponential-functions':
      return generateExponentialFunctionsProblem();
    case 'conic-sections':
      return generateConicSectionsProblem();

    // Calculus
    case 'limits':
      return generateLimitsProblem();
    case 'derivatives-basic':
      return generateDerivativesBasicProblem();
    case 'derivatives-product-quotient':
      return generateDerivativesProductQuotientProblem();
    case 'chain-rule':
      return generateChainRuleProblem();
    case 'integrals-basic':
      return generateIntegralsBasicProblem();
    case 'integration-substitution':
      return generateIntegrationSubstitutionProblem();

    // Calculus 2
    case 'integration-by-parts':
      return generateIntegrationByPartsProblem();
    case 'trig-integrals':
      return generateTrigIntegralsProblem();
    case 'partial-fractions':
      return generatePartialFractionsProblem();
    case 'improper-integrals':
      return generateImproperIntegralsProblem();
    case 'sequences':
      return generateSequencesProblem();
    case 'series-convergence':
      return generateSeriesConvergenceProblem();
    case 'power-series':
      return generatePowerSeriesProblem();
    case 'taylor-maclaurin':
      return generateTaylorMaclaurinProblem();
    case 'parametric-equations':
      return generateParametricEquationsProblem();
    case 'polar-coordinates':
      return generatePolarCoordinatesProblem();
    case 'integration-applications':
      return generateIntegrationApplicationsProblem();
    case 'trig-substitution':
      return generateTrigSubstitutionProblem();

    default:
      throw new Error(`Problem generator not yet implemented for topic: ${topicId}`);
  }
};

// ===========================
// ANSWER VALIDATION
// ===========================

// Numeric alternates listed in acceptableAnswers (ignores non-numeric entries).
const numericCandidates = (problem: Problem): number[] => {
  const out: number[] = [];
  if (typeof problem.correctAnswer === 'number') out.push(problem.correctAnswer);
  for (const alt of problem.acceptableAnswers ?? []) {
    if (typeof alt === 'number') out.push(alt);
  }
  return out;
};

/**
 * Grading contract:
 *  - numeric: exact value (floating-point margin only). Fractions and constant
 *    expressions ("3/5", "sqrt(3)/2", "pi/4") are accepted as input.
 *  - decimal-tolerance: |input - value| <= tolerance, where tolerance is the
 *    explicit `tolerance`, else half a unit in the last place requested by
 *    `roundTo`, else 0.01. correctAnswer / numeric acceptableAnswers are the
 *    reference values.
 *  - fraction: equivalent fraction (any representation), or an integer when the
 *    reduced denominator is 1.
 *  - expression: equivalence decided by the expression grader (see
 *    expressionGrader.ts); `equivalence: 'up-to-constant'` for antiderivatives.
 *    acceptableAnswers are graded with the same engine, not by spelling.
 */
export const validateAnswer = (problem: Problem, userAnswer: string): boolean => {
  switch (problem.answerType) {
    case 'numeric': {
      const user = parseNumericInput(userAnswer);
      if (user === null) return false;
      return numericCandidates(problem).some(c => numbersEqual(user, c));
    }

    case 'decimal-tolerance': {
      const user = parseNumericInput(userAnswer);
      if (user === null) return false;
      const tolerance = problem.tolerance !== undefined
        ? problem.tolerance
        : problem.roundTo !== undefined
          ? roundingTolerance(problem.roundTo)
          : 0.01;
      return numericCandidates(problem).some(c => Math.abs(user - c) <= tolerance);
    }

    case 'fraction': {
      const correctFraction = problem.correctAnswer as FractionAnswer;
      const trimmed = userAnswer.trim();
      const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
      if (!fractionMatch) {
        // A whole number is fine when the reduced answer is an integer.
        const whole = trimmed.match(/^(-?\d+)$/);
        return !!whole && correctFraction.denominator === 1 && parseInt(whole[1], 10) === correctFraction.numerator;
      }
      const userNumerator = parseInt(fractionMatch[1], 10);
      const userDenominator = parseInt(fractionMatch[2], 10);
      if (userDenominator === 0) return false;
      const userSimplified = simplifyFraction(userNumerator, userDenominator);
      return (
        userSimplified.numerator === correctFraction.numerator &&
        userSimplified.denominator === correctFraction.denominator
      );
    }

    case 'expression': {
      const mode = problem.equivalence ?? 'exact';
      if (expressionsEquivalent(userAnswer, String(problem.correctAnswer), mode)) return true;
      return (problem.acceptableAnswers ?? []).some(alt => expressionsEquivalent(userAnswer, String(alt), mode));
    }

    case 'multiple-choice':
      return userAnswer.trim() === problem.correctAnswer;

    case 'coordinate': {
      // Parse "(x, y)" format
      const coordMatch = userAnswer.match(/^\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?$/);
      if (!coordMatch) return false;

      const userX = parseFloat(coordMatch[1]);
      const userY = parseFloat(coordMatch[2]);
      const correctCoord = problem.correctAnswer as { x: number; y: number };

      return numbersEqual(userX, correctCoord.x) && numbersEqual(userY, correctCoord.y);
    }

    default:
      return false;
  }
};
