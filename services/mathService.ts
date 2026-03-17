import { TopicId, Problem, ProblemAnswer, FractionAnswer } from '../types';
import { PYTHAGOREAN_TRIPLES, SPECIAL_ANGLES } from '../constants';
import { parse, simplify, evaluate, MathNode } from 'mathjs';

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

// Helper to format negative numbers for display
const formatNum = (n: number) => (n < 0 ? `(${n})` : n);

// Helper to format a constant term with sign (e.g., + 5 or - 5)
const formatTerm = (n: number): string => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);

// LaTeX formatting helpers
const latexNum = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const latexTerm = (n: number): string => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);
const latexSignedCoeff = (n: number, varName: string): string => {
  if (n === 1) return `+ ${varName}`;
  if (n === -1) return `- ${varName}`;
  return n >= 0 ? `+ ${n}${varName}` : `- ${Math.abs(n)}${varName}`;
};
const latexFrac = (num: number, den: number): string => `\\frac{${num}}{${den}}`;

// Helper to format a number, stripping unnecessary trailing ".0"
const formatDecimal = (n: number): string => {
  const s = n.toFixed(1);
  return s.endsWith('.0') ? String(Math.round(n)) : s;
};

// Normalize expression string for mathjs parsing
const normalizeMathExpr = (s: string): string =>
  s.replace(/\s/g, '')
   .replace(/[²]/g, '^2').replace(/[³]/g, '^3').replace(/[⁴]/g, '^4').replace(/[⁵]/g, '^5')
   .replace(/\|([^|]+)\|/g, 'abs($1)')    // |x| → abs(x)
   .replace(/·/g, '*');                     // · → *

// Check if two math expressions are algebraically equal using mathjs.
// Uses symbolic simplification and numeric spot-checking.
const expressionsAlgebraicallyEqual = (userExpr: string, correctExpr: string): boolean => {
  try {
    const normUser = normalizeMathExpr(userExpr);
    const normCorrect = normalizeMathExpr(correctExpr);

    // Skip non-math text answers (convergence, divergence, etc.)
    if (/^[a-z]+$/i.test(normUser) || /^[a-z]+$/i.test(normCorrect)) return false;

    // Try symbolic simplification: simplify(user - correct) === 0
    try {
      const diff = simplify(`(${normUser}) - (${normCorrect})`);
      const diffStr = diff.toString();
      if (diffStr === '0') return true;
    } catch { /* symbolic simplification may fail on some expressions */ }

    // Numeric spot-check: evaluate both expressions at several x values
    const testPoints = [0.5, 1, 1.5, 2, 2.7, 3.1];
    let allMatch = true;
    let anyEvaluated = false;

    for (const x of testPoints) {
      try {
        const userVal = evaluate(normUser, { x });
        const correctVal = evaluate(normCorrect, { x });
        if (typeof userVal === 'number' && typeof correctVal === 'number') {
          anyEvaluated = true;
          if (Math.abs(userVal - correctVal) > 0.001) {
            allMatch = false;
            break;
          }
        }
      } catch { /* some points may cause evaluation errors (division by zero, etc.) */ }
    }

    if (anyEvaluated && allMatch) return true;
  } catch { /* if parsing fails entirely, fall through */ }

  return false;
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
  const min = opts?.allowNegatives === false ? Math.max(0, opts?.numberRange?.min ?? 0) : (opts?.numberRange?.min ?? -10);
  const max = opts?.numberRange?.max ?? 10;
  const a = randInt(min, max);
  const b = randInt(min, max);
  return {
    id: crypto.randomUUID(),
    topicId: 'addition',
    problemText: `$${a} + ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: a + b,
    explanationPrompt: `Explain step-by-step how to solve ${a} + ${b}.`,
    hint: a < 0 && b < 0 ? 'Adding two negative numbers gives a negative result.' : undefined,
  };
};

const generateSubtractionProblem = (opts?: NumberRangeOptions): Problem => {
  const min = opts?.allowNegatives === false ? Math.max(0, opts?.numberRange?.min ?? 0) : (opts?.numberRange?.min ?? -10);
  const max = opts?.numberRange?.max ?? 10;
  const a = randInt(min, max);
  const b = randInt(min, max);
  return {
    id: crypto.randomUUID(),
    topicId: 'subtraction',
    problemText: `$${a} - ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: a - b,
    explanationPrompt: `Explain step-by-step how to solve ${a} - ${b}.`,
    hint: b < 0 ? 'Remember: subtracting a negative is the same as adding a positive.' : 'Subtract the second number from the first.',
  };
};

const generateMultiplicationProblem = (opts?: NumberRangeOptions): Problem => {
  const min = opts?.allowNegatives === false ? Math.max(0, opts?.numberRange?.min ?? 0) : (opts?.numberRange?.min ?? -10);
  const max = opts?.numberRange?.max ?? 10;
  const a = randInt(min, max);
  const b = randInt(min, max);
  return {
    id: crypto.randomUUID(),
    topicId: 'multiplication',
    problemText: `$${a} \\times ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: a * b,
    explanationPrompt: `Explain step-by-step how to solve ${a} * ${b}.`,
    hint: (a < 0 && b < 0) ? 'A negative times a negative gives a positive!' : (a < 0 || b < 0) ? 'A positive times a negative gives a negative.' : 'Multiply the two numbers together.',
  };
};

const generateDivisionProblem = (opts?: NumberRangeOptions): Problem => {
  const min = opts?.allowNegatives === false ? Math.max(1, opts?.numberRange?.min ?? 1) : (opts?.numberRange?.min ?? -10);
  const max = opts?.numberRange?.max ?? 10;
  // Guard against range that can only produce 0 (e.g., [0,0])
  if (min === 0 && max === 0) {
    return {
      id: crypto.randomUUID(),
      topicId: 'division',
      problemText: `$0 \\div 1 = \\;?$`,
      answerType: 'numeric',
      correctAnswer: 0,
      explanationPrompt: `Explain step-by-step how to solve 0 / 1.`,
      hint: 'Zero divided by any non-zero number is zero.',
    };
  }
  let b = 0;
  while (b === 0) {
    b = randInt(min, max);
  }
  const result = randInt(min, max);
  const a = b * result;
  return {
    id: crypto.randomUUID(),
    topicId: 'division',
    problemText: `$${a} \\div ${latexNum(b)} = \\;?$`,
    answerType: 'numeric',
    correctAnswer: result,
    explanationPrompt: `Explain step-by-step how to solve ${a} / ${b}.`,
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
    explanationPrompt: `Explain step-by-step how to solve for x in the equation ${a}x + ${b} = ${c}.`,
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

  return {
    id: crypto.randomUUID(),
    topicId: 'fractions-basic',
    problemText: `$${latexFrac(num1, den1)} ${op === '×' ? '\\times' : op === '÷' ? '\\div' : op} ${latexFrac(num2, den2)} = \\;?$`,
    answerType: 'fraction',
    correctAnswer: simplified,
    explanationPrompt: `Explain how to ${op === '+' ? 'add' : op === '-' ? 'subtract' : op === '×' ? 'multiply' : 'divide'} these fractions: ${num1}/${den1} ${op} ${num2}/${den2}.`,
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

  return {
    id: crypto.randomUUID(),
    topicId: 'decimals',
    problemText: `$${a} ${op === '×' ? '\\times' : op} ${b} = \\;?$`,
    answerType: 'decimal-tolerance',
    correctAnswer: Math.round(answer * 100) / 100,
    explanationPrompt: `Explain how to ${op === '+' ? 'add' : op === '-' ? 'subtract' : 'multiply'} ${a} ${op} ${b}.`,
    tolerance: 0.01,
    hint: 'Line up the decimal points when adding or subtracting.',
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

  switch (problemType) {
    case 1:
      // a + b × c
      problemText = `$${a} + ${b} \\times ${c}$`;
      answer = a + b * c;
      break;
    case 2:
      // (a + b) × c
      problemText = `$(${a} + ${b}) \\times ${c}$`;
      answer = (a + b) * c;
      break;
    case 3:
      // a × b + c × d
      problemText = `$${a} \\times ${b} + ${c} \\times ${d}$`;
      answer = a * b + c * d;
      break;
    default:
      problemText = `$${a} + ${b}$`;
      answer = a + b;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'order-of-operations',
    problemText: `${problemText} $= \\;?$`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Explain the order of operations (PEMDAS) for this problem.`,
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
    explanationPrompt: `Explain how to work with negative numbers: ${formatNum(a)} ${op} ${formatNum(b)}.`,
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
    explanationPrompt: `Solve for x: ${a}x ${formatTerm(b)} = ${c}x ${formatTerm(d)}.`,
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
    explanationPrompt: `Solve the inequality: ${a}x + ${b} ${op} ${c}.`,
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
    explanationPrompt: `Solve this system of equations for x:\n${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}`,
    hint: 'Try using substitution or elimination method.',
  };
};

const generateExponentsProblem = (): Problem => {
  const base = randInt(2, 5);
  const exp1 = randInt(2, 4);
  const exp2 = randInt(2, 4);

  const problemTypes = [
    { text: `$${base}^{${exp1}} \\times ${base}^{${exp2}}$`, answer: exp1 + exp2, rule: 'multiplication', question: 'What is the simplified exponent?' },
    { text: `$${base}^{${exp1 + exp2}} \\div ${base}^{${exp2}}$`, answer: exp1, rule: 'division', question: 'What is the simplified exponent?' },
    { text: `$(${base}^{${exp1}})^{${exp2}}$`, answer: exp1 * exp2, rule: 'power', question: 'What is the simplified exponent?' },
  ];

  const chosen = randChoice(problemTypes);

  return {
    id: crypto.randomUUID(),
    topicId: 'exponents',
    problemText: `Simplify: ${chosen.text}\n${chosen.question} (The answer is $${base}^{?}$)`,
    answerType: 'numeric',
    correctAnswer: chosen.answer,
    explanationPrompt: `Explain the exponent rule for ${chosen.text}.`,
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
    explanationPrompt: `Explain how to ${operation === '+' ? 'add' : 'subtract'} these polynomials.`,
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
    explanationPrompt: `Explain how to factor this quadratic.`,
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
    explanationPrompt: `Solve this quadratic by factoring or using the quadratic formula.`,
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
    explanationPrompt: `Explain what ${chosen.question} angles are and how to find the ${chosen.question} of ${angle1}°.`,
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
    explanationPrompt: `Explain how to find the missing angle in a triangle with angles ${angle1}° and ${angle2}°.`,
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

  if (missing === 0) {
    problemText = `A right triangle has leg $b = ${b}$ and hypotenuse $c = ${c}$. Find leg $a$.`;
    answer = a;
  } else if (missing === 1) {
    problemText = `A right triangle has leg $a = ${a}$ and hypotenuse $c = ${c}$. Find leg $b$.`;
    answer = b;
  } else {
    problemText = `A right triangle has legs $a = ${a}$ and $b = ${b}$. Find the hypotenuse $c$.`;
    answer = c;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'pythagorean-theorem',
    problemText,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Use the Pythagorean theorem to solve this problem.`,
    hint: 'Pythagorean theorem: $a^2 + b^2 = c^2$, where $c$ is the hypotenuse.',
  };
};

const generateAreaPerimeterProblem = (): Problem => {
  const shape = randChoice(['rectangle', 'square', 'triangle', 'circle']);
  const measurement = randChoice(['area', 'perimeter']);

  let problemText: string;
  let answer: number;
  let hint: string;
  let usesPI = false;

  switch (shape) {
    case 'rectangle':
      const length = randInt(5, 15);
      const width = randInt(3, 10);
      if (measurement === 'area') {
        problemText = `Find the area of a rectangle with length $${length}$ and width $${width}$.`;
        answer = length * width;
        hint = '$A = l \\times w$';
      } else {
        problemText = `Find the perimeter of a rectangle with length $${length}$ and width $${width}$.`;
        answer = 2 * (length + width);
        hint = '$P = 2(l + w)$';
      }
      break;
    case 'square':
      const side = randInt(5, 15);
      if (measurement === 'area') {
        problemText = `Find the area of a square with side length $${side}$.`;
        answer = side * side;
        hint = '$A = s^2$';
      } else {
        problemText = `Find the perimeter of a square with side length $${side}$.`;
        answer = 4 * side;
        hint = '$P = 4s$';
      }
      break;
    case 'triangle': {
      const base = randInt(6, 12);
      const height = randInt(4, 10);
      if (measurement === 'area') {
        // Use even base*height to guarantee integer answer
        const adjustedBase = base % 2 === 1 && height % 2 === 1 ? base + 1 : base;
        problemText = `Find the area of a triangle with base $${adjustedBase}$ and height $${height}$.`;
        answer = (adjustedBase * height) / 2;
        hint = '$A = \\frac{1}{2}bh$';
      } else {
        // Generate a triangle with three known sides for perimeter
        const side1 = randInt(5, 12);
        const side2 = randInt(5, 12);
        const side3 = randInt(Math.abs(side1 - side2) + 1, side1 + side2 - 1); // triangle inequality
        problemText = `Find the perimeter of a triangle with sides $${side1}$, $${side2}$, and $${side3}$.`;
        answer = side1 + side2 + side3;
        hint = '$P = a + b + c$';
      }
      break;
    }
    case 'circle':
      const radius = randInt(3, 10);
      usesPI = true;
      if (measurement === 'area') {
        problemText = `Find the area of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$)`;
        answer = Math.round(3.14 * radius * radius * 100) / 100;
        hint = '$A = \\pi r^2$';
      } else {
        problemText = `Find the circumference of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$)`;
        answer = Math.round(2 * 3.14 * radius * 100) / 100;
        hint = '$C = 2\\pi r$';
      }
      break;
    default:
      problemText = '';
      answer = 0;
      hint = '';
  }

  // Use exact numeric matching for integer answers, tolerance only for π-based
  if (usesPI) {
    return {
      id: crypto.randomUUID(),
      topicId: 'area-perimeter',
      problemText,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      tolerance: 0.5,
      explanationPrompt: `Explain how to find the ${measurement} of a ${shape}.`,
      hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'area-perimeter',
    problemText,
    answerType: Number.isInteger(answer) ? 'numeric' : 'decimal-tolerance',
    correctAnswer: answer,
    tolerance: Number.isInteger(answer) ? undefined : 0.1,
    explanationPrompt: `Explain how to find the ${measurement} of a ${shape}.`,
    hint,
  };
};

const generateCirclesProblem = (): Problem => {
  const radius = randInt(3, 10);
  const problemType = randChoice(['circumference', 'area', 'diameter']);

  let problemText: string;
  let answer: number;
  let hint: string;

  switch (problemType) {
    case 'circumference':
      problemText = `Find the circumference of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$)`;
      answer = Math.round(2 * 3.14 * radius * 100) / 100;
      hint = '$C = 2\\pi r$';
      break;
    case 'area':
      problemText = `Find the area of a circle with radius $${radius}$. (Use $\\pi \\approx 3.14$)`;
      answer = Math.round(3.14 * radius * radius * 100) / 100;
      hint = '$A = \\pi r^2$';
      break;
    case 'diameter':
      problemText = `A circle has radius $${radius}$. What is its diameter?`;
      answer = 2 * radius;
      hint = '$d = 2r$';
      break;
    default:
      problemText = '';
      answer = 0;
      hint = '';
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'circles',
    problemText,
    answerType: 'decimal-tolerance',
    correctAnswer: answer,
    tolerance: 0.5,
    explanationPrompt: `Explain how to find the ${problemType} of a circle.`,
    hint,
  };
};

const generateVolumeSurfaceAreaProblem = (): Problem => {
  const shape = randChoice(['cube', 'rectangular-prism', 'cylinder', 'sphere']);
  const measurement = randChoice(['volume', 'surface-area']);

  let problemText: string;
  let answer: number;
  let hint: string;
  let usesPI = false;

  switch (shape) {
    case 'cube':
      const side = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a cube with side length $${side}$.`;
        answer = side * side * side;
        hint = '$V = s^3$';
      } else {
        problemText = `Find the surface area of a cube with side length $${side}$.`;
        answer = 6 * side * side;
        hint = '$SA = 6s^2$';
      }
      break;
    case 'rectangular-prism':
      const l = randInt(4, 10);
      const w = randInt(3, 8);
      const h = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a rectangular prism: $l=${l}$, $w=${w}$, $h=${h}$.`;
        answer = l * w * h;
        hint = '$V = lwh$';
      } else {
        problemText = `Find the surface area of a rectangular prism: $l=${l}$, $w=${w}$, $h=${h}$.`;
        answer = 2 * (l * w + l * h + w * h);
        hint = '$SA = 2(lw + lh + wh)$';
      }
      break;
    case 'cylinder':
      const r = randInt(3, 7);
      const height = randInt(5, 12);
      usesPI = true;
      if (measurement === 'volume') {
        problemText = `Find the volume of a cylinder with $r=${r}$, $h=${height}$. (Use $\\pi \\approx 3.14$)`;
        answer = Math.round(3.14 * r * r * height * 100) / 100;
        hint = '$V = \\pi r^2 h$';
      } else {
        problemText = `Find the surface area of a cylinder with $r=${r}$, $h=${height}$. (Use $\\pi \\approx 3.14$)`;
        answer = Math.round(2 * 3.14 * r * (r + height) * 100) / 100;
        hint = '$SA = 2\\pi r(r + h)$';
      }
      break;
    case 'sphere':
      const radius = randInt(3, 8);
      usesPI = true;
      if (measurement === 'volume') {
        problemText = `Find the volume of a sphere with radius $${radius}$. (Use $\\pi \\approx 3.14$)`;
        answer = Math.round((4 / 3) * 3.14 * radius * radius * radius * 100) / 100;
        hint = '$V = \\frac{4}{3}\\pi r^3$';
      } else {
        problemText = `Find the surface area of a sphere with radius $${radius}$. (Use $\\pi \\approx 3.14$)`;
        answer = Math.round(4 * 3.14 * radius * radius * 100) / 100;
        hint = '$SA = 4\\pi r^2$';
      }
      break;
    default:
      problemText = '';
      answer = 0;
      hint = '';
  }

  // Use exact numeric matching for integer answers, tolerance only for π-based
  if (usesPI) {
    return {
      id: crypto.randomUUID(),
      topicId: 'volume-surface-area',
      problemText,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      tolerance: 0.5,
      explanationPrompt: `Explain how to find the ${measurement} of a ${shape}.`,
      hint,
    };
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'volume-surface-area',
    problemText,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Explain how to find the ${measurement} of a ${shape}.`,
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
    explanationPrompt: `Explain how to ${operation === '+' ? 'add' : 'subtract'} complex numbers.`,
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
    explanationPrompt: `Explain how to simplify √${radicand}.`,
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
    explanationPrompt: `Explain how to evaluate log₍${base}₎(${value}).`,
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
      explanationPrompt: `Explain how to find the ${n}th term of an arithmetic sequence.`,
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
      explanationPrompt: `Explain how to find the ${n}th term of a geometric sequence.`,
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

  const ratio = randChoice(['sin', 'cos', 'tan']);
  const anglePosition = randChoice(['opposite-a', 'opposite-b']);

  let problemText: string;
  let answer: number;

  if (anglePosition === 'opposite-a') {
    // Angle opposite to side a
    switch (ratio) {
      case 'sin':
        problemText = `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\sin(\\theta)$ where $\\theta$ is opposite to side $${a}$.`;
        answer = Math.round((a / c) * 1000) / 1000;
        break;
      case 'cos':
        problemText = `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\cos(\\theta)$ where $\\theta$ is opposite to side $${a}$.`;
        answer = Math.round((b / c) * 1000) / 1000;
        break;
      case 'tan':
        problemText = `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\tan(\\theta)$ where $\\theta$ is opposite to side $${a}$.`;
        answer = Math.round((a / b) * 1000) / 1000;
        break;
      default:
        problemText = '';
        answer = 0;
    }
  } else {
    // Angle opposite to side b
    switch (ratio) {
      case 'sin':
        problemText = `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\sin(\\theta)$ where $\\theta$ is opposite to side $${b}$.`;
        answer = Math.round((b / c) * 1000) / 1000;
        break;
      case 'cos':
        problemText = `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\cos(\\theta)$ where $\\theta$ is opposite to side $${b}$.`;
        answer = Math.round((a / c) * 1000) / 1000;
        break;
      case 'tan':
        problemText = `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\tan(\\theta)$ where $\\theta$ is opposite to side $${b}$.`;
        answer = Math.round((b / a) * 1000) / 1000;
        break;
      default:
        problemText = '';
        answer = 0;
    }
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-ratios',
    problemText,
    answerType: 'decimal-tolerance',
    correctAnswer: answer,
    tolerance: 0.01,
    explanationPrompt: `Explain how to find ${ratio}(θ) in a right triangle.`,
    hint: 'SOH-CAH-TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent',
  };
};

const generateTrigSpecialAnglesProblem = (): Problem => {
  const angles = [30, 45, 60];
  const angle = randChoice(angles);
  const ratio = randChoice(['sin', 'cos', 'tan']);

  const values: { [key: string]: { [key: string]: number } } = {
    '30': { sin: 0.5, cos: 0.866, tan: 0.577 },
    '45': { sin: 0.707, cos: 0.707, tan: 1 },
    '60': { sin: 0.866, cos: 0.5, tan: 1.732 },
  };

  const answer = values[angle.toString()][ratio];

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-special-angles',
    problemText: `Evaluate $\\${ratio}(${angle}°)$. Round to 3 decimal places.`,
    answerType: 'decimal-tolerance',
    correctAnswer: answer,
    tolerance: 0.01,
    explanationPrompt: `Explain the exact value of ${ratio}(${angle}°).`,
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
    explanationPrompt: `Explain how to evaluate the limit as x approaches ${x} of ${a}x ${formatTerm(b)}.`,
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
    explanationPrompt: `Explain how to find this derivative using the power rule.`,
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
    return {
      id: crypto.randomUUID(),
      topicId: 'derivatives-product-quotient',
      problemText: `Find $\\frac{d}{dx}\\left[x^{${a}} \\cdot x^{${b}}\\right]$. What is the new exponent?`,
      answerType: 'numeric',
      correctAnswer: a + b - 1,
      explanationPrompt: `Explain how to find this derivative.`,
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
      explanationPrompt: `Explain how to find this derivative.`,
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
    problemText: `Find $\\frac{d}{dx}\\left[(${inner_coeff}x + ${inner_const})^{${outer}}\\right]$. What is the coefficient?`,
    answerType: 'numeric',
    correctAnswer: derivativeCoeff,
    explanationPrompt: `Explain how to use the chain rule for this problem.`,
    hint: `Chain rule: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$`,
  };
};

const generateIntegralsBasicProblem = (): Problem => {
  const coefficient = randInt(2, 10);
  const exponent = randInt(1, 4);

  const integralExp = exponent + 1;

  return {
    id: crypto.randomUUID(),
    topicId: 'integrals-basic',
    problemText: `$\\displaystyle\\int ${coefficient}x^{${exponent}}\\,dx$. What is the new exponent?`,
    answerType: 'numeric',
    correctAnswer: integralExp,
    explanationPrompt: `Explain how to integrate this expression.`,
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
    acceptableAnswers: [`x²+${c}`, `x^2 + ${c}`, `x² + ${c}`],
    explanationPrompt: `Explain how to use u-substitution for this integral.`,
    hint: 'Look for a function whose derivative is also in the integrand.',
  };
};

// ===========================
// MORE TRIGONOMETRY
// ===========================

const generateTrigIdentitiesProblem = (): Problem => {
  const identities: { question: string; display: string; answer: string; name: string; alts?: string[] }[] = [
    { question: 'sin²θ + cos²θ = ?', display: '$\\sin^2\\theta + \\cos^2\\theta = \\;?$', answer: '1', name: 'Pythagorean identity' },
    { question: 'tan θ = ?', display: '$\\tan\\theta = \\;?$', answer: 'sinθ/cosθ', name: 'tangent identity', alts: ['sin(θ)/cos(θ)', 'sin θ/cos θ'] },
    { question: '1 + tan²θ = ?', display: '$1 + \\tan^2\\theta = \\;?$', answer: 'sec^2θ', name: 'Pythagorean identity', alts: ['sec²θ', 'sec^2(θ)'] },
    { question: 'sin(90° - θ) = ?', display: '$\\sin(90° - \\theta) = \\;?$', answer: 'cosθ', name: 'cofunction identity', alts: ['cos θ', 'cos(θ)'] },
    { question: 'cos(90° - θ) = ?', display: '$\\cos(90° - \\theta) = \\;?$', answer: 'sinθ', name: 'cofunction identity', alts: ['sin θ', 'sin(θ)'] },
  ];

  const chosen = randChoice(identities);

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-identities',
    problemText: `Complete the identity: ${chosen.display}`,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    acceptableAnswers: chosen.alts,
    explanationPrompt: `Explain the ${chosen.name}: ${chosen.question}`,
    hint: `This is a ${chosen.name}.`,
  };
};

const generateTrigEquationsProblem = (): Problem => {
  const angle = randChoice([30, 45, 60]);
  const ratio = randChoice(['sin', 'cos', 'tan']);

  const values: { [key: string]: { [key: string]: number } } = {
    '30': { sin: 0.5, cos: 0.866, tan: 0.577 },
    '45': { sin: 0.707, cos: 0.707, tan: 1 },
    '60': { sin: 0.866, cos: 0.5, tan: 1.732 },
  };

  const value = values[angle.toString()][ratio];

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-equations',
    problemText: `Solve for $\\theta$ ($0° \\leq \\theta \\leq 90°$): $\\${ratio}(\\theta) = ${value.toFixed(3)}$`,
    answerType: 'numeric',
    correctAnswer: angle,
    explanationPrompt: `Solve the equation ${ratio}(θ) = ${value.toFixed(3)}.`,
    hint: 'Think about special angles: 30°, 45°, 60°.',
  };
};

const generateInverseTrigProblem = (): Problem => {
  const values = [
    { value: 0.5, func: 'sin', angle: 30 },
    { value: 0.707, func: 'sin', angle: 45 },
    { value: 0.866, func: 'sin', angle: 60 },
    { value: 0.5, func: 'cos', angle: 60 },
    { value: 0.707, func: 'cos', angle: 45 },
    { value: 0.866, func: 'cos', angle: 30 },
    { value: 1, func: 'tan', angle: 45 },
  ];

  const chosen = randChoice(values);

  return {
    id: crypto.randomUUID(),
    topicId: 'inverse-trig',
    problemText: `Evaluate: $\\${chosen.func}^{-1}(${chosen.value.toFixed(3)})$ in degrees`,
    answerType: 'numeric',
    correctAnswer: chosen.angle,
    explanationPrompt: `Explain how to find ${chosen.func}⁻¹(${chosen.value.toFixed(3)}).`,
    hint: `Which angle has ${chosen.func} = ${chosen.value.toFixed(3)}?`,
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
    explanationPrompt: `Explain how to simplify (${a}x)/(${b}x).`,
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
    explanationPrompt: `Explain how to evaluate f(${x}) when f(x) = ${a}x + ${b}.`,
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
    explanationPrompt: `Find the roots of x² ${sum >= 0 ? '+' : ''}${sum}x ${product >= 0 ? '+' : ''}${product} = 0.`,
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
    explanationPrompt: `Explain how to find vertical asymptotes of rational functions.`,
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
    explanationPrompt: `Explain exponential growth for this problem.`,
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
    explanationPrompt: `Explain the standard form of a circle equation.`,
    hint: `Standard form: $(x-h)^2 + (y-k)^2 = r^2$, center $(h,k)$, radius $r$`,
  };
};

// ===========================
// CALCULUS 2
// ===========================

const generateIntegrationByPartsProblem = (): Problem => {
  // Problems of the form ∫ x·e^x dx, ∫ x·cos(x) dx, ∫ x·sin(x) dx, ∫ x·ln(x) dx
  const problems: { text: string; answer: string; alts: string[]; hint: string; explanation: string }[] = [
    {
      text: '$\\displaystyle\\int x \\cdot e^x\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'xe^x-e^x',
      alts: ['xe^x - e^x', 'x*e^x - e^x', '(x-1)e^x', '(x-1)*e^x', 'e^x(x-1)'],
      hint: 'Let $u = x$, $dv = e^x\\,dx$. Then $du = dx$, $v = e^x$.',
      explanation: 'Using IBP: u=x, dv=eˣdx → uv - ∫v du = xeˣ - ∫eˣdx = xeˣ - eˣ + C',
    },
    {
      text: '$\\displaystyle\\int x \\cdot \\cos(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'xsin(x)+cos(x)',
      alts: ['x*sin(x) + cos(x)', 'xsin(x) + cos(x)', 'x·sin(x)+cos(x)'],
      hint: 'Let $u = x$, $dv = \\cos(x)\\,dx$.',
      explanation: 'Using IBP: u=x, dv=cos(x)dx → xsin(x) - ∫sin(x)dx = xsin(x) + cos(x) + C',
    },
    {
      text: '$\\displaystyle\\int x \\cdot \\sin(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: '-xcos(x)+sin(x)',
      alts: ['sin(x) - xcos(x)', '-x*cos(x) + sin(x)', 'sin(x)-xcos(x)'],
      hint: 'Let $u = x$, $dv = \\sin(x)\\,dx$.',
      explanation: 'Using IBP: u=x, dv=sin(x)dx → -xcos(x) + ∫cos(x)dx = -xcos(x) + sin(x) + C',
    },
    {
      text: '$\\displaystyle\\int \\ln(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'xln(x)-x',
      alts: ['x*ln(x) - x', 'x·ln(x)-x', 'x(ln(x)-1)', 'x·ln(x) - x'],
      hint: 'Let $u = \\ln(x)$, $dv = dx$.',
      explanation: 'Using IBP: u=ln(x), dv=dx → xln(x) - ∫x·(1/x)dx = xln(x) - x + C',
    },
  ];

  const chosen = randChoice(problems);

  return {
    id: crypto.randomUUID(),
    topicId: 'integration-by-parts',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    acceptableAnswers: chosen.alts,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

const generateTrigIntegralsProblem = (): Problem => {
  const problems: { text: string; answer: string; alts: string[]; hint: string; explanation: string }[] = [
    {
      text: '$\\displaystyle\\int \\sin^2(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x/2-sin(2x)/4',
      alts: ['x/2 - sin(2x)/4', '(x - sin(2x)/2)/2', '(2x-sin(2x))/4'],
      hint: 'Use the identity $\\sin^2(x) = \\frac{1 - \\cos(2x)}{2}$',
      explanation: 'sin²(x) = (1-cos(2x))/2, so ∫ = x/2 - sin(2x)/4 + C',
    },
    {
      text: '$\\displaystyle\\int \\cos^2(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'x/2+sin(2x)/4',
      alts: ['x/2 + sin(2x)/4', '(x + sin(2x)/2)/2', '(2x+sin(2x))/4'],
      hint: 'Use the identity $\\cos^2(x) = \\frac{1 + \\cos(2x)}{2}$',
      explanation: 'cos²(x) = (1+cos(2x))/2, so ∫ = x/2 + sin(2x)/4 + C',
    },
    {
      text: '$\\displaystyle\\int \\sin(x)\\cos(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'sin^2(x)/2',
      alts: ['sin²(x)/2', 'sin(x)^2/2', '-cos^2(x)/2', '-cos²(x)/2', '-cos(2x)/4'],
      hint: 'Use $u$-substitution with $u = \\sin(x)$, or the identity $\\sin(2x) = 2\\sin(x)\\cos(x)$',
      explanation: 'Let u=sin(x), du=cos(x)dx → ∫u du = u²/2 = sin²(x)/2 + C',
    },
    {
      text: '$\\displaystyle\\int \\tan(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: '-ln|cos(x)|',
      alts: ['ln|sec(x)|', 'ln|secx|', '-ln|cosx|', 'ln(sec(x))', '-ln(cos(x))'],
      hint: 'Rewrite $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ and use substitution.',
      explanation: '∫ sin(x)/cos(x) dx, let u=cos(x) → -∫du/u = -ln|cos(x)| = ln|sec(x)| + C',
    },
    {
      text: '$\\displaystyle\\int \\sec^2(x)\\tan(x)\\,dx$\nWhat is the result? (omit $+C$)',
      answer: 'tan^2(x)/2',
      alts: ['tan²(x)/2', 'tan(x)^2/2', 'sec^2(x)/2', 'sec²(x)/2'],
      hint: 'Let $u = \\tan(x)$, then $du = \\sec^2(x)\\,dx$',
      explanation: 'Let u=tan(x), du=sec²(x)dx → ∫u du = u²/2 = tan²(x)/2 + C',
    },
  ];

  const chosen = randChoice(problems);

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-integrals',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    acceptableAnswers: chosen.alts,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
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
        problemText: `Decompose into partial fractions:\n$\\frac{1}{(x - ${a})(x + ${Math.abs(b)})} = \\frac{A}{x - ${a}} + \\frac{B}{x + ${Math.abs(b)}}$\nWhat is $A$? (as a fraction like $\\frac{1}{${diff}}$)`,
        answerType: 'expression',
        correctAnswer: `1/${diff}`,
        acceptableAnswers: [`1/${diff}`],
        explanationPrompt: `Set x = ${a}: 1/(${a} − (${b})) = A → A = 1/${diff}`,
        hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
      };
    } else {
      return {
        id: crypto.randomUUID(),
        topicId: 'partial-fractions',
        problemText: `Decompose into partial fractions:\n$\\frac{1}{(x - ${a})(x + ${Math.abs(b)})} = \\frac{A}{x - ${a}} + \\frac{B}{x + ${Math.abs(b)}}$\nWhat is $B$?`,
        answerType: 'expression',
        correctAnswer: `-1/${diff}`,
        acceptableAnswers: [`-1/${diff}`],
        explanationPrompt: `Set x = ${b}: 1/(${b} − ${a}) = B → B = -1/${diff}`,
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
      explanationPrompt: `Multiply both sides by (x-${a})²: ${n} = A(x-${a}) + B. Set x=${a}: B = ${n}.`,
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
      problemText: `Decompose: $\\frac{1}{(x - ${a})(x^2 + 1)} = \\frac{A}{x - ${a}} + \\frac{Bx + C}{x^2 + 1}$\nWhat is $A$? (as a fraction)`,
      answerType: 'expression',
      correctAnswer: `1/${answerDen}`,
      acceptableAnswers: [`1/${answerDen}`],
      explanationPrompt: `Multiply by (x-${a}), set x=${a}: 1/(${a}²+1) = A → A = 1/${answerDen}`,
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
      explanation: '∫₁^b x⁻² dx = [-1/x]₁^b = -1/b + 1 → 1 as b→∞',
    },
    {
      text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x}\\,dx$\nDoes this converge or diverge?',
      answer: 'diverges',
      type: 'expression',
      alts: ['diverge', 'divergent', 'infinity', 'inf'],
      hint: '$\\int \\frac{1}{x}\\,dx = \\ln|x|$. What happens as $x \\to \\infty$?',
      explanation: '∫₁^b 1/x dx = ln(b) → ∞ as b→∞, so it diverges.',
    },
    {
      text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x^3}\\,dx$\nEvaluate (enter a number)',
      answer: 0.5,
      type: 'numeric',
      hint: '$\\int x^{-3}\\,dx = \\frac{x^{-2}}{-2}$. Evaluate the limit.',
      explanation: '∫₁^b x⁻³ dx = [-1/(2x²)]₁^b = -1/(2b²) + 1/2 → 1/2 as b→∞',
      tolerance: 0.01,
    },
    {
      text: '$\\displaystyle\\int_0^{\\infty} e^{-x}\\,dx$\nEvaluate (enter a number)',
      answer: 1,
      type: 'numeric',
      hint: '$\\int e^{-x}\\,dx = -e^{-x}$. What is $e^{-x}$ as $x \\to \\infty$?',
      explanation: '∫₀^b e⁻ˣ dx = [-e⁻ˣ]₀^b = -e⁻ᵇ + 1 → 1 as b→∞',
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
      answerType: chosen.tolerance ? 'decimal-tolerance' : 'numeric',
      correctAnswer: chosen.answer as number,
      tolerance: chosen.tolerance,
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
        explanation: 'The terms alternate sign: 1, -1/2, 1/3, -1/4, ... This is not monotonically increasing or decreasing, so the MCT does not apply directly.',
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
      text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{1}{3}\\right)^n$\nWhat is the sum?',
      answer: 1.5,
      type: 'numeric',
      hint: 'Geometric series $\\sum r^n = \\frac{1}{1-r}$ when $|r| < 1$.',
      explanation: 'Σ(1/3)ⁿ = 1/(1 - 1/3) = 1/(2/3) = 3/2 = 1.5',
      tolerance: 0.01,
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
      answerType: chosen.tolerance ? 'decimal-tolerance' : 'numeric',
      correctAnswer: chosen.answer as number,
      tolerance: chosen.tolerance,
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
  const problems: { text: string; answer: string; alts: string[]; hint: string; explanation: string }[] = [
    {
      text: 'What is the Maclaurin series for $e^x$?\n(Write first 4 terms)',
      answer: '1+x+x^2/2+x^3/6',
      alts: ['1 + x + x^2/2 + x^3/6', '1+x+x²/2+x³/6', '1 + x + x²/2 + x³/6', '1+x+x^2/2!+x^3/3!'],
      hint: 'All derivatives of $e^x$ equal $e^x$, and $f(0) = 1$.',
      explanation: 'eˣ = Σ xⁿ/n! = 1 + x + x²/2! + x³/3! + ...',
    },
    {
      text: 'What is the Maclaurin series for $\\sin(x)$?\n(Write first 3 non-zero terms)',
      answer: 'x-x^3/6+x^5/120',
      alts: ['x - x^3/6 + x^5/120', 'x-x³/6+x⁵/120', 'x - x^3/3! + x^5/5!'],
      hint: '$\\sin(x)$ has only odd powers of $x$ in its series.',
      explanation: 'sin(x) = x - x³/3! + x⁵/5! - ... = x - x³/6 + x⁵/120 - ...',
    },
    {
      text: 'What is the Maclaurin series for $\\cos(x)$?\n(Write first 3 non-zero terms)',
      answer: '1-x^2/2+x^4/24',
      alts: ['1 - x^2/2 + x^4/24', '1-x²/2+x⁴/24', '1 - x^2/2! + x^4/4!'],
      hint: '$\\cos(x)$ has only even powers of $x$ in its series.',
      explanation: 'cos(x) = 1 - x²/2! + x⁴/4! - ... = 1 - x²/2 + x⁴/24 - ...',
    },
    {
      text: 'What is the Maclaurin series for $\\frac{1}{1-x}$?\n(Write first 4 terms)',
      answer: '1+x+x^2+x^3',
      alts: ['1 + x + x^2 + x^3', '1+x+x²+x³'],
      hint: 'This is a geometric series!',
      explanation: '1/(1-x) = Σ xⁿ = 1 + x + x² + x³ + ... for |x| < 1',
    },
    {
      text: 'What is the coefficient of $x^2$ in the Maclaurin series for $e^x$?',
      answer: '1/2',
      alts: ['0.5', '1/2!'],
      hint: 'The coefficient of $x^n$ in $e^x$ is $\\frac{1}{n!}$',
      explanation: 'eˣ = Σ xⁿ/n!, so coefficient of x² is 1/2! = 1/2.',
    },
    {
      text: 'Using the Lagrange error bound, estimate the max error when approximating $e^x$ by its 3rd-degree Maclaurin polynomial at $x = 0.5$.\n(Round to 4 decimal places)',
      answer: '0.0043',
      alts: ['0.004', '0.00429'],
      hint: 'The Lagrange remainder: $|R_n(x)| \\leq \\frac{M|x|^{n+1}}{(n+1)!}$ where $M = \\max|f^{(n+1)}(c)|$ on $[0, x]$.',
      explanation: 'For eˣ, all derivatives are eˣ. M = max|e^c| on [0, 0.5] = e^0.5 ≈ 1.649. |R₃(0.5)| ≤ 1.649·(0.5)⁴/4! = 1.649·0.0625/24 ≈ 0.0043.',
    },
    {
      text: 'The alternating series $\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n}$ is approximated by its first 4 terms.\nWhat is the maximum error?',
      answer: '0.2',
      alts: ['1/5', '0.2'],
      hint: 'For an alternating series, the error is bounded by the absolute value of the first omitted term.',
      explanation: 'First 4 terms sum: 1 - 1/2 + 1/3 - 1/4. The first omitted term is 1/5 = 0.2. By the Alternating Series Remainder, |error| ≤ 1/5 = 0.2.',
    },
  ];

  const chosen = randChoice(problems);

  return {
    id: crypto.randomUUID(),
    topicId: 'taylor-maclaurin',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    acceptableAnswers: chosen.alts,
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
      acceptableAnswers: [
        `(x-${a})^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`,
        `(x - ${a})^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`,
        b === 0 ? `(x-${a})^2` : undefined,
      ].filter(Boolean) as string[],
      explanationPrompt: `From x = t + ${a}, t = x − ${a}. Substitute: y = (x−${a})² ${b >= 0 ? '+' + b : '−' + Math.abs(b)}.`,
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
      problemText: `Given $x = t^2$, $y = t^3$\nFind $\\frac{dy}{dx}$ at $t = ${t}$.`,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      tolerance: 0.01,
      explanationPrompt: `dy/dx = (dy/dt)/(dx/dt) = 3t²/(2t) = 3t/2. At t=${t}: dy/dx = ${answer}.`,
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
      explanationPrompt: `Substitute t = ${t}: y = ${t}² = ${y}.`,
      hint: 'Just substitute the value of t into the y equation.',
    };
  }
};

const generatePolarCoordinatesProblem = (): Problem => {
  const problemType = randChoice(['cartesian-to-polar-r', 'cartesian-to-polar-theta', 'polar-to-cartesian-x', 'polar-to-cartesian-y', 'identify-curve']);

  if (problemType === 'cartesian-to-polar-r') {
    const x = randInt(3, 8);
    const y = randInt(3, 8);
    const r = Math.round(Math.sqrt(x * x + y * y) * 100) / 100;

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert $(${x}, ${y})$ from Cartesian to polar.\nWhat is $r$? (round to 2 decimal places)`,
      answerType: 'decimal-tolerance',
      correctAnswer: r,
      tolerance: 0.02,
      explanationPrompt: `$r = \\sqrt{x^2 + y^2} = \\sqrt{${x}^2 + ${y}^2} = \\sqrt{${x * x + y * y}} \\approx ${r}$`,
      hint: '$r = \\sqrt{x^2 + y^2}$',
    };
  } else if (problemType === 'cartesian-to-polar-theta') {
    // Use simple angles: (1,1) → 45°, (0,r) → 90°, (r,0) → 0°
    const cases = [
      { x: 1, y: 1, theta: 45 },
      { x: 0, y: 5, theta: 90 },
      { x: 3, y: 0, theta: 0 },
    ];
    const chosen = randChoice(cases);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert $(${chosen.x}, ${chosen.y})$ from Cartesian to polar.\nWhat is $\\theta$ in degrees?`,
      answerType: 'numeric',
      correctAnswer: chosen.theta,
      explanationPrompt: `$\\theta = \\arctan\\left(\\frac{y}{x}\\right) = \\arctan\\left(\\frac{${chosen.y}}{${chosen.x}}\\right) = ${chosen.theta}°$`,
      hint: '$\\theta = \\arctan\\left(\\frac{y}{x}\\right)$. Watch for special cases where $x$ or $y$ is $0$.',
    };
  } else if (problemType === 'polar-to-cartesian-x') {
    // r=R, θ=angle → x = R·cos(θ)
    const cases = [
      { r: 4, theta: 60, x: 2, desc: '60°' },
      { r: 6, theta: 0, x: 6, desc: '0°' },
      { r: 2, theta: 90, x: 0, desc: '90°' },
      { r: 4, theta: 45, x: 2.83, desc: '45°' },
    ];
    const chosen = randChoice(cases);

    return {
      id: crypto.randomUUID(),
      topicId: 'polar-coordinates',
      problemText: `Convert polar $(r=${chosen.r},\\; \\theta=${chosen.desc})$ to Cartesian.\nWhat is $x$? (round to 2 decimal places)`,
      answerType: 'decimal-tolerance',
      correctAnswer: chosen.x,
      tolerance: 0.02,
      explanationPrompt: `$x = r\\cos(\\theta) = ${chosen.r}\\cos(${chosen.desc}) = ${chosen.x}$`,
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
      explanationPrompt: `$y = r\\sin(\\theta) = ${chosen.r}\\sin(${chosen.desc}) = ${chosen.y}$`,
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

  if (problemType === 'disk') {
    const a = randInt(2, 5);
    const vol = Math.round((Math.PI * Math.pow(a, 3) / 3) * 100) / 100;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the volume of the solid formed by revolving $y = x$ around the x-axis from $x = 0$ to $x = ${a}$.\n(Use the disk method. Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: vol,
      tolerance: 0.1,
      explanationPrompt: `V = π∫₀^${a} x² dx = π[x³/3]₀^${a} = ${a * a * a}π/3 ≈ ${vol}`,
      hint: 'Disk method: $V = \\pi \\int_a^b [f(x)]^2\\,dx$. Here $f(x) = x$.',
    };
  } else if (problemType === 'washer') {
    const vol = Math.round((2 * Math.PI / 15) * 1000) / 1000;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the volume of the solid formed by revolving the region between $y = x$ and $y = x^2$ (from $x=0$ to $x=1$) around the x-axis.\n(Round to 3 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: vol,
      tolerance: 0.01,
      explanationPrompt: `Washer: V = π∫₀¹ (x² − x⁴)dx = π[x³/3 − x⁵/5]₀¹ = π(1/3 − 1/5) = 2π/15 ≈ ${vol}`,
      hint: 'Washer method: $V = \\pi \\int [R(x)]^2 - [r(x)]^2\\,dx$. Which function is farther from the x-axis on $[0,1]$?',
    };
  } else if (problemType === 'shell') {
    const a = randInt(1, 3);
    const vol = Math.round((Math.PI * Math.pow(a, 4) / 2) * 100) / 100;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Use the shell method to find the volume when $y = x^2$ (from $x=0$ to $x=${a}$) is revolved around the y-axis.\n(Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: vol,
      tolerance: 0.1,
      explanationPrompt: `Shell: V = 2π∫₀^${a} x·x² dx = 2π[x⁴/4]₀^${a} = π·${Math.pow(a, 4)}/2 ≈ ${vol}`,
      hint: 'Shell method: $V = 2\\pi \\int_a^b x \\cdot f(x)\\,dx$. Here $f(x) = x^2$.',
    };
  } else if (problemType === 'arc-length') {
    const a = randInt(2, 6);
    const answer = Math.round(a * Math.sqrt(2) * 100) / 100;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the arc length of $y = x$ from $x = 0$ to $x = ${a}$.\n(Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      tolerance: 0.05,
      explanationPrompt: `L = ∫₀^${a} √(1 + [f'(x)]²) dx = ∫₀^${a} √(1+1) dx = ${a}√2 ≈ ${answer}`,
      hint: 'Arc length: $L = \\int_a^b \\sqrt{1 + [f\'(x)]^2}\\,dx$. Find $f\'(x)$ first.',
    };
  } else {
    const a = randInt(2, 4);
    const answer = Math.round(Math.PI * Math.sqrt(2) * a * a * 100) / 100;
    return {
      id: crypto.randomUUID(),
      topicId: 'integration-applications',
      problemText: `Find the surface area when $y = x$ from $x = 0$ to $x = ${a}$ is revolved around the x-axis.\n(Round to 2 decimal places.)`,
      answerType: 'decimal-tolerance',
      correctAnswer: answer,
      tolerance: 0.5,
      explanationPrompt: `S = 2π∫₀^${a} x√(1+1) dx = 2π√2·[x²/2]₀^${a} = π√2·${a * a} ≈ ${answer}`,
      hint: 'Surface area: $S = 2\\pi \\int f(x)\\sqrt{1 + [f\'(x)]^2}\\,dx$.',
    };
  }
};

const generateTrigSubstitutionProblem = (): Problem => {
  const problems: { text: string; answer: string; alts: string[]; hint: string; explanation: string }[] = [
    {
      text: 'For $\\displaystyle\\int \\sqrt{4 - x^2}\\,dx$, what substitution should you use?',
      answer: 'x=2sin(theta)',
      alts: ['x = 2sin(θ)', 'x=2sin(θ)', 'x = 2sinθ', 'x=2sinθ', 'x = 2 sin(theta)', 'x = 2*sin(theta)'],
      hint: 'The integrand has the form $\\sqrt{a^2 - x^2}$ with $a = 2$.',
      explanation: 'For √(a²−x²), use x = a sin(θ). Here a = 2, so x = 2sin(θ).',
    },
    {
      text: 'For $\\displaystyle\\int \\frac{dx}{\\sqrt{x^2 + 9}}$, what substitution should you use?',
      answer: 'x=3tan(theta)',
      alts: ['x = 3tan(θ)', 'x=3tan(θ)', 'x = 3tanθ', 'x=3tanθ', 'x = 3 tan(theta)', 'x = 3*tan(theta)'],
      hint: 'The integrand has the form $\\sqrt{x^2 + a^2}$ with $a = 3$.',
      explanation: 'For √(x²+a²), use x = a tan(θ). Here a = 3, so x = 3tan(θ).',
    },
    {
      text: 'For $\\displaystyle\\int \\frac{dx}{x^2\\sqrt{x^2 - 16}}$, what substitution should you use?',
      answer: 'x=4sec(theta)',
      alts: ['x = 4sec(θ)', 'x=4sec(θ)', 'x = 4secθ', 'x=4secθ', 'x = 4 sec(theta)', 'x = 4*sec(theta)'],
      hint: 'The integrand has the form $\\sqrt{x^2 - a^2}$ with $a = 4$.',
      explanation: 'For √(x²−a²), use x = a sec(θ). Here a = 4, so x = 4sec(θ).',
    },
    {
      text: 'Evaluate: $\\displaystyle\\int_0^1 \\sqrt{1 - x^2}\\,dx$\n(This is a quarter-circle area)',
      answer: 'pi/4',
      alts: ['π/4', 'pi/4', '0.785', '0.7854'],
      hint: 'Substitute $x = \\sin(\\theta)$, or recognize this as the area of a quarter unit circle.',
      explanation: '∫₀¹ √(1−x²) dx = area of quarter circle of radius 1 = π/4 ≈ 0.7854.',
    },
  ];

  const chosen = randChoice(problems);

  return {
    id: crypto.randomUUID(),
    topicId: 'trig-substitution',
    problemText: chosen.text,
    answerType: 'expression',
    correctAnswer: chosen.answer,
    acceptableAnswers: chosen.alts,
    explanationPrompt: chosen.explanation,
    hint: chosen.hint,
  };
};

// ===========================
// MAIN GENERATOR FUNCTION
// ===========================

interface NumberRangeOptions {
  numberRange?: { min: number; max: number };
  allowNegatives?: boolean;
}

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

export const validateAnswer = (problem: Problem, userAnswer: string): boolean => {
  switch (problem.answerType) {
    case 'numeric':
      const userNum = parseFloat(userAnswer);
      if (isNaN(userNum)) return false;
      if (userNum === (problem.correctAnswer as number)) return true;
      // Check additional acceptable answers
      if (problem.acceptableAnswers) {
        return problem.acceptableAnswers.some(alt => userNum === (alt as number));
      }
      return false;

    case 'decimal-tolerance':
      const userDec = parseFloat(userAnswer);
      if (isNaN(userDec)) return false;
      const correctNum = problem.correctAnswer as number;
      const tolerance = problem.tolerance || 0.01;
      return Math.abs(userDec - correctNum) <= tolerance;

    case 'fraction':
      // Parse user input like "3/4" or separate fields
      const fractionMatch = userAnswer.match(/^(-?\d+)\/(-?\d+)$/);
      if (!fractionMatch) return false;

      const userNumerator = parseInt(fractionMatch[1]);
      const userDenominator = parseInt(fractionMatch[2]);
      const userSimplified = simplifyFraction(userNumerator, userDenominator);

      const correctFraction = problem.correctAnswer as FractionAnswer;
      return (
        userSimplified.numerator === correctFraction.numerator &&
        userSimplified.denominator === correctFraction.denominator
      );

    case 'expression': {
      const normalizeExpr = (s: string) =>
        s.replace(/\s/g, '').toLowerCase()
         .replace(/\.0(?!\d)/g, '')   // strip trailing .0
         .replace(/[θ]/g, 'theta');   // normalize theta symbol

      // For inequalities, also check equivalent forms (e.g., "x < 2" === "2 > x")
      const flipOperator = (op: string): string => {
        const flips: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '<=': '>=', '>=': '<=' };
        return flips[op] || op;
      };
      const parseInequality = (s: string): { lhs: string; op: string; rhs: string } | null => {
        const match = s.match(/^(.+?)(<=|>=|≤|≥|<|>)(.+)$/);
        if (!match) return null;
        return { lhs: match[1], op: match[2], rhs: match[3] };
      };

      const cleanUser = normalizeExpr(userAnswer);
      const cleanCorrect = normalizeExpr(problem.correctAnswer as string);
      if (cleanUser === cleanCorrect) return true;

      // Check flipped inequality: "x < 2" should match "2 > x"
      const parsedCorrect = parseInequality(cleanCorrect);
      const parsedUser = parseInequality(cleanUser);
      if (parsedCorrect && parsedUser) {
        // Direct match already checked above; check flipped form
        if (parsedUser.lhs === parsedCorrect.rhs &&
            parsedUser.rhs === parsedCorrect.lhs &&
            parsedUser.op === flipOperator(parsedCorrect.op)) {
          return true;
        }
      }

      // Check additional acceptable answers
      if (problem.acceptableAnswers) {
        const matched = problem.acceptableAnswers.some(alt => {
          const cleanAlt = normalizeExpr(String(alt));
          if (cleanAlt === cleanUser) return true;
          const parsedAlt = parseInequality(cleanAlt);
          if (parsedAlt && parsedUser) {
            return (parsedUser.lhs === parsedAlt.rhs &&
                    parsedUser.rhs === parsedAlt.lhs &&
                    parsedUser.op === flipOperator(parsedAlt.op));
          }
          return false;
        });
        if (matched) return true;
      }

      // mathjs algebraic equivalence: try to simplify (user - correct) to 0,
      // or evaluate both at several random points and compare
      if (expressionsAlgebraicallyEqual(userAnswer, problem.correctAnswer as string)) {
        return true;
      }

      return false;
    }

    case 'multiple-choice':
      return userAnswer === problem.correctAnswer;

    case 'coordinate':
      // Parse "(x, y)" format
      const coordMatch = userAnswer.match(/^\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?$/);
      if (!coordMatch) return false;

      const userX = parseFloat(coordMatch[1]);
      const userY = parseFloat(coordMatch[2]);
      const correctCoord = problem.correctAnswer as { x: number; y: number };

      return userX === correctCoord.x && userY === correctCoord.y;

    default:
      return false;
  }
};
