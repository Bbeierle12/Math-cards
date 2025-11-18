import { TopicId, Problem, ProblemAnswer, FractionAnswer } from '../types';
import { PYTHAGOREAN_TRIPLES, SPECIAL_ANGLES } from '../constants';

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

// Helper to simplify fractions (GCD)
const gcd = (a: number, b: number): number => {
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
const simplifyFraction = (num: number, den: number): FractionAnswer => {
  const divisor = gcd(num, den);
  return { numerator: num / divisor, denominator: den / divisor };
};

// ===========================
// BASIC ARITHMETIC
// ===========================

const generateAdditionProblem = (): Problem => {
  const a = randInt(-10, 10);
  const b = randInt(-10, 10);
  return {
    id: crypto.randomUUID(),
    topicId: 'addition',
    problemText: `${a} + ${formatNum(b)} = ?`,
    answerType: 'numeric',
    correctAnswer: a + b,
    explanationPrompt: `Explain step-by-step how to solve ${a} + ${b}.`,
    hint: a < 0 && b < 0 ? 'Adding two negative numbers gives a negative result.' : undefined,
  };
};

const generateSubtractionProblem = (): Problem => {
  const a = randInt(-10, 10);
  const b = randInt(-10, 10);
  return {
    id: crypto.randomUUID(),
    topicId: 'subtraction',
    problemText: `${a} - ${formatNum(b)} = ?`,
    answerType: 'numeric',
    correctAnswer: a - b,
    explanationPrompt: `Explain step-by-step how to solve ${a} - ${b}.`,
    hint: 'Remember: subtracting a negative is the same as adding a positive.',
  };
};

const generateMultiplicationProblem = (): Problem => {
  const a = randInt(-10, 10);
  const b = randInt(-10, 10);
  return {
    id: crypto.randomUUID(),
    topicId: 'multiplication',
    problemText: `${a} × ${formatNum(b)} = ?`,
    answerType: 'numeric',
    correctAnswer: a * b,
    explanationPrompt: `Explain step-by-step how to solve ${a} * ${b}.`,
    hint: 'A negative times a negative gives a positive!',
  };
};

const generateDivisionProblem = (): Problem => {
  let b = 0;
  while (b === 0) {
    b = randInt(-10, 10);
  }
  const result = randInt(-10, 10);
  const a = b * result;
  return {
    id: crypto.randomUUID(),
    topicId: 'division',
    problemText: `${a} ÷ ${formatNum(b)} = ?`,
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
    problemText: `${a}x + ${b} = ${c}`,
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
    problemText: `${num1}/${den1} ${op} ${num2}/${den2} = ?`,
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
    problemText: `${a} ${op} ${b} = ?`,
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
      problemText = `${a} + ${b} × ${c}`;
      answer = a + b * c;
      break;
    case 2:
      // (a + b) × c
      problemText = `(${a} + ${b}) × ${c}`;
      answer = (a + b) * c;
      break;
    case 3:
      // a × b + c × d
      problemText = `${a} × ${b} + ${c} × ${d}`;
      answer = a * b + c * d;
      break;
    default:
      problemText = `${a} + ${b}`;
      answer = a + b;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'order-of-operations',
    problemText: `${problemText} = ?`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Explain the order of operations (PEMDAS) for solving ${problemText}.`,
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
    problemText: `${formatNum(a)} ${op} ${formatNum(b)} = ?`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Explain how to work with negative numbers: ${formatNum(a)} ${op} ${formatNum(b)}.`,
    hint: 'Two negatives make a positive when multiplying, but not when adding!',
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
  const d = (a - c) * x - b;

  return {
    id: crypto.randomUUID(),
    topicId: 'multi-step-equations',
    problemText: `${a}x + ${b} = ${c}x + ${d}`,
    answerType: 'numeric',
    correctAnswer: x,
    explanationPrompt: `Solve for x: ${a}x + ${b} = ${c}x + ${d}.`,
    hint: 'Move all x terms to one side and constants to the other.',
  };
};

const generateInequalitiesProblem = (): Problem => {
  const x = randInt(5, 15);
  const a = randInt(2, 5);
  const b = randInt(1, 10);
  const c = a * x + b + randInt(1, 5); // Ensure inequality is true

  const operators = ['<', '>', '≤', '≥'];
  const op = randChoice(operators);

  return {
    id: crypto.randomUUID(),
    topicId: 'inequalities',
    problemText: `Solve for x: ${a}x + ${b} ${op} ${c}`,
    answerType: 'expression',
    correctAnswer: `x ${op} ${((c - b) / a).toFixed(1)}`,
    explanationPrompt: `Solve the inequality: ${a}x + ${b} ${op} ${c}.`,
    hint: 'Solve like an equation, but remember: flip the sign when multiplying/dividing by a negative!',
  };
};

const generateSystemsOfEquationsProblem = (): Problem => {
  // Generate a system with integer solution
  const x = randInt(2, 8);
  const y = randInt(2, 8);

  const a1 = randInt(1, 5);
  const b1 = randInt(1, 5);
  const c1 = a1 * x + b1 * y;

  const a2 = randInt(1, 5);
  const b2 = randInt(1, 5);
  const c2 = a2 * x + b2 * y;

  return {
    id: crypto.randomUUID(),
    topicId: 'systems-of-equations',
    problemText: `${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}\nFind x:`,
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
    { text: `${base}^${exp1} × ${base}^${exp2}`, answer: Math.pow(base, exp1 + exp2), rule: 'multiplication' },
    { text: `${base}^${exp1 + exp2} ÷ ${base}^${exp2}`, answer: Math.pow(base, exp1), rule: 'division' },
    { text: `(${base}^${exp1})^${exp2}`, answer: Math.pow(base, exp1 * exp2), rule: 'power' },
  ];

  const chosen = randChoice(problemTypes);

  return {
    id: crypto.randomUUID(),
    topicId: 'exponents',
    problemText: `Simplify: ${chosen.text}`,
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

  const poly1 = `${a1}x² ${b1 >= 0 ? '+' : ''}${b1}x ${c1 >= 0 ? '+' : ''}${c1}`;
  const poly2 = `${a2}x² ${b2 >= 0 ? '+' : ''}${b2}x ${c2 >= 0 ? '+' : ''}${c2}`;
  const result = `${resultA}x² ${resultB >= 0 ? '+' : ''}${resultB}x ${resultC >= 0 ? '+' : ''}${resultC}`;

  return {
    id: crypto.randomUUID(),
    topicId: 'polynomials',
    problemText: `(${poly1}) ${operation} (${poly2})\nWhat is the coefficient of x?`,
    answerType: 'numeric',
    correctAnswer: resultB,
    explanationPrompt: `Explain how to ${operation === '+' ? 'add' : 'subtract'} these polynomials.`,
    hint: 'Combine like terms: match x² with x², x with x, and constants with constants.',
  };
};

const generateFactoringProblem = (): Problem => {
  // Generate a factorable quadratic: (x + a)(x + b) = x² + (a+b)x + ab
  const a = randInt(-8, 8);
  const b = randInt(-8, 8);
  const sum = a + b;
  const product = a * b;

  const problemText = `x² ${sum >= 0 ? '+' : ''}${sum}x ${product >= 0 ? '+' : ''}${product}`;

  return {
    id: crypto.randomUUID(),
    topicId: 'factoring',
    problemText: `Factor: ${problemText}\nWhat is the smaller constant in the factors?`,
    answerType: 'numeric',
    correctAnswer: Math.min(a, b),
    explanationPrompt: `Explain how to factor ${problemText}.`,
    hint: `Find two numbers that multiply to ${product} and add to ${sum}.`,
  };
};

const generateQuadraticEquationsProblem = (): Problem => {
  // Generate equation (x - a)(x - b) = 0 with solutions a, b
  const a = randInt(-8, 8);
  const b = randInt(-8, 8);
  const sum = -(a + b);
  const product = a * b;

  const problemText = `x² ${sum >= 0 ? '+' : ''}${sum}x ${product >= 0 ? '+' : ''}${product} = 0`;

  return {
    id: crypto.randomUUID(),
    topicId: 'quadratic-equations',
    problemText: `Solve for x: ${problemText}\nWhat is the larger solution?`,
    answerType: 'numeric',
    correctAnswer: Math.max(a, b),
    explanationPrompt: `Solve ${problemText} by factoring or using the quadratic formula.`,
    hint: 'Try factoring first, or use the quadratic formula: x = (-b ± √(b²-4ac)) / 2a',
  };
};

// ===========================
// GEOMETRY
// ===========================

const generateAnglesProblem = (): Problem => {
  const angle1 = randInt(30, 150);
  const problemTypes = [
    { type: 'complement', angle2: 90 - angle1, question: 'complementary' },
    { type: 'supplement', angle2: 180 - angle1, question: 'supplementary' },
  ];

  const chosen = randChoice(problemTypes);

  return {
    id: crypto.randomUUID(),
    topicId: 'angles',
    problemText: `What is the ${chosen.question} angle of ${angle1}°?`,
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
    problemText: `A triangle has angles of ${angle1}° and ${angle2}°. What is the third angle?`,
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
    problemText = `A right triangle has legs b = ${b} and hypotenuse c = ${c}. Find leg a.`;
    answer = a;
  } else if (missing === 1) {
    problemText = `A right triangle has legs a = ${a} and hypotenuse c = ${c}. Find leg b.`;
    answer = b;
  } else {
    problemText = `A right triangle has legs a = ${a} and b = ${b}. Find the hypotenuse c.`;
    answer = c;
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'pythagorean-theorem',
    problemText,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Use the Pythagorean theorem to solve: ${problemText}`,
    hint: 'Pythagorean theorem: a² + b² = c², where c is the hypotenuse.',
  };
};

const generateAreaPerimeterProblem = (): Problem => {
  const shape = randChoice(['rectangle', 'square', 'triangle', 'circle']);
  const measurement = randChoice(['area', 'perimeter']);

  let problemText: string;
  let answer: number;
  let hint: string;

  switch (shape) {
    case 'rectangle':
      const length = randInt(5, 15);
      const width = randInt(3, 10);
      if (measurement === 'area') {
        problemText = `Find the area of a rectangle with length ${length} and width ${width}.`;
        answer = length * width;
        hint = 'Area = length × width';
      } else {
        problemText = `Find the perimeter of a rectangle with length ${length} and width ${width}.`;
        answer = 2 * (length + width);
        hint = 'Perimeter = 2(length + width)';
      }
      break;
    case 'square':
      const side = randInt(5, 15);
      if (measurement === 'area') {
        problemText = `Find the area of a square with side length ${side}.`;
        answer = side * side;
        hint = 'Area = side²';
      } else {
        problemText = `Find the perimeter of a square with side length ${side}.`;
        answer = 4 * side;
        hint = 'Perimeter = 4 × side';
      }
      break;
    case 'triangle':
      const base = randInt(6, 12);
      const height = randInt(4, 10);
      problemText = `Find the area of a triangle with base ${base} and height ${height}.`;
      answer = (base * height) / 2;
      hint = 'Area = ½ × base × height';
      break;
    case 'circle':
      const radius = randInt(3, 10);
      if (measurement === 'area') {
        problemText = `Find the area of a circle with radius ${radius}. (Use π ≈ 3.14)`;
        answer = Math.round(Math.PI * radius * radius * 100) / 100;
        hint = 'Area = πr²';
      } else {
        problemText = `Find the circumference of a circle with radius ${radius}. (Use π ≈ 3.14)`;
        answer = Math.round(2 * Math.PI * radius * 100) / 100;
        hint = 'Circumference = 2πr';
      }
      break;
    default:
      problemText = '';
      answer = 0;
      hint = '';
  }

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
};

const generateCirclesProblem = (): Problem => {
  const radius = randInt(3, 10);
  const problemType = randChoice(['circumference', 'area', 'diameter']);

  let problemText: string;
  let answer: number;
  let hint: string;

  switch (problemType) {
    case 'circumference':
      problemText = `Find the circumference of a circle with radius ${radius}. (Use π ≈ 3.14)`;
      answer = Math.round(2 * Math.PI * radius * 100) / 100;
      hint = 'C = 2πr';
      break;
    case 'area':
      problemText = `Find the area of a circle with radius ${radius}. (Use π ≈ 3.14)`;
      answer = Math.round(Math.PI * radius * radius * 100) / 100;
      hint = 'A = πr²';
      break;
    case 'diameter':
      problemText = `A circle has radius ${radius}. What is its diameter?`;
      answer = 2 * radius;
      hint = 'Diameter = 2 × radius';
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

  switch (shape) {
    case 'cube':
      const side = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a cube with side length ${side}.`;
        answer = side * side * side;
        hint = 'Volume = side³';
      } else {
        problemText = `Find the surface area of a cube with side length ${side}.`;
        answer = 6 * side * side;
        hint = 'Surface Area = 6 × side²';
      }
      break;
    case 'rectangular-prism':
      const l = randInt(4, 10);
      const w = randInt(3, 8);
      const h = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a rectangular prism with length ${l}, width ${w}, and height ${h}.`;
        answer = l * w * h;
        hint = 'Volume = length × width × height';
      } else {
        problemText = `Find the surface area of a rectangular prism with length ${l}, width ${w}, and height ${h}.`;
        answer = 2 * (l * w + l * h + w * h);
        hint = 'SA = 2(lw + lh + wh)';
      }
      break;
    case 'cylinder':
      const r = randInt(3, 7);
      const height = randInt(5, 12);
      if (measurement === 'volume') {
        problemText = `Find the volume of a cylinder with radius ${r} and height ${height}. (Use π ≈ 3.14)`;
        answer = Math.round(Math.PI * r * r * height * 100) / 100;
        hint = 'Volume = πr²h';
      } else {
        problemText = `Find the surface area of a cylinder with radius ${r} and height ${height}. (Use π ≈ 3.14)`;
        answer = Math.round(2 * Math.PI * r * (r + height) * 100) / 100;
        hint = 'SA = 2πr(r + h)';
      }
      break;
    case 'sphere':
      const radius = randInt(3, 8);
      if (measurement === 'volume') {
        problemText = `Find the volume of a sphere with radius ${radius}. (Use π ≈ 3.14)`;
        answer = Math.round((4 / 3) * Math.PI * radius * radius * radius * 100) / 100;
        hint = 'Volume = (4/3)πr³';
      } else {
        problemText = `Find the surface area of a sphere with radius ${radius}. (Use π ≈ 3.14)`;
        answer = Math.round(4 * Math.PI * radius * radius * 100) / 100;
        hint = 'SA = 4πr²';
      }
      break;
    default:
      problemText = '';
      answer = 0;
      hint = '';
  }

  return {
    id: crypto.randomUUID(),
    topicId: 'volume-surface-area',
    problemText,
    answerType: 'decimal-tolerance',
    correctAnswer: answer,
    tolerance: 1,
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

  const z1 = `${a1} ${b1 >= 0 ? '+' : ''}${b1}i`;
  const z2 = `${a2} ${b2 >= 0 ? '+' : ''}${b2}i`;

  return {
    id: crypto.randomUUID(),
    topicId: 'complex-numbers',
    problemText: `(${z1}) ${operation} (${z2})\nWhat is the imaginary coefficient?`,
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
    problemText: `Simplify √${radicand}. What number is outside the radical?`,
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
    problemText: `log₍${base}₎(${value}) = ?`,
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
      problemText: `An arithmetic sequence starts at ${a1} with common difference ${d}. Find the ${n}th term.`,
      answerType: 'numeric',
      correctAnswer: an,
      explanationPrompt: `Explain how to find the ${n}th term of an arithmetic sequence.`,
      hint: `Use the formula: aₙ = a₁ + (n-1)d`,
    };
  } else {
    const a1 = randInt(2, 5);
    const r = randChoice([2, 3]);
    const n = randInt(4, 6);
    const an = a1 * Math.pow(r, n - 1);

    return {
      id: crypto.randomUUID(),
      topicId: 'sequences-series',
      problemText: `A geometric sequence starts at ${a1} with common ratio ${r}. Find the ${n}th term.`,
      answerType: 'numeric',
      correctAnswer: an,
      explanationPrompt: `Explain how to find the ${n}th term of a geometric sequence.`,
      hint: `Use the formula: aₙ = a₁ × r^(n-1)`,
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
        problemText = `In a right triangle with sides ${a}, ${b}, ${c} (hypotenuse), find sin(θ) where θ is opposite to side ${a}.`;
        answer = Math.round((a / c) * 1000) / 1000;
        break;
      case 'cos':
        problemText = `In a right triangle with sides ${a}, ${b}, ${c} (hypotenuse), find cos(θ) where θ is opposite to side ${a}.`;
        answer = Math.round((b / c) * 1000) / 1000;
        break;
      case 'tan':
        problemText = `In a right triangle with sides ${a}, ${b}, ${c} (hypotenuse), find tan(θ) where θ is opposite to side ${a}.`;
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
        problemText = `In a right triangle with sides ${a}, ${b}, ${c} (hypotenuse), find sin(θ) where θ is opposite to side ${b}.`;
        answer = Math.round((b / c) * 1000) / 1000;
        break;
      case 'cos':
        problemText = `In a right triangle with sides ${a}, ${b}, ${c} (hypotenuse), find cos(θ) where θ is opposite to side ${b}.`;
        answer = Math.round((a / c) * 1000) / 1000;
        break;
      case 'tan':
        problemText = `In a right triangle with sides ${a}, ${b}, ${c} (hypotenuse), find tan(θ) where θ is opposite to side ${b}.`;
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
    problemText: `Evaluate ${ratio}(${angle}°). Round to 3 decimal places.`,
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
    problemText: `Evaluate: lim (x→${x}) [${a}x + ${b}]`,
    answerType: 'numeric',
    correctAnswer: answer,
    explanationPrompt: `Explain how to evaluate the limit as x approaches ${x} of ${a}x + ${b}.`,
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
    problemText: `Find the derivative of ${coefficient}x^${exponent}. What is the coefficient?`,
    answerType: 'numeric',
    correctAnswer: derivativeCoeff,
    explanationPrompt: `Explain how to find the derivative of ${coefficient}x^${exponent} using the power rule.`,
    hint: 'Power rule: d/dx[x^n] = nx^(n-1)',
  };
};

const generateDerivativesProductQuotientProblem = (): Problem => {
  const a = randInt(2, 6);
  const b = randInt(2, 6);

  const problemType = randChoice(['product', 'quotient']);

  if (problemType === 'product') {
    // d/dx[x^a × x^b] = (a+b)x^(a+b-1)
    const derivativeCoeff = a + b;

    return {
      id: crypto.randomUUID(),
      topicId: 'derivatives-product-quotient',
      problemText: `Find d/dx[x^${a} × x^${b}]. What is the new exponent?`,
      answerType: 'numeric',
      correctAnswer: a + b - 1,
      explanationPrompt: `Explain how to find the derivative of x^${a} × x^${b}.`,
      hint: 'Simplify first: x^a × x^b = x^(a+b), then use power rule.',
    };
  } else {
    // d/dx[x^a / x^b] = (a-b)x^(a-b-1)
    return {
      id: crypto.randomUUID(),
      topicId: 'derivatives-product-quotient',
      problemText: `Simplify then find d/dx[x^${a} / x^${b}]. What is the new exponent?`,
      answerType: 'numeric',
      correctAnswer: a - b - 1,
      explanationPrompt: `Explain how to find the derivative of x^${a} / x^${b}.`,
      hint: 'Simplify first: x^a / x^b = x^(a-b), then use power rule.',
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
    problemText: `Find d/dx[(${inner_coeff}x + ${inner_const})^${outer}]. What is the coefficient after applying chain rule?`,
    answerType: 'numeric',
    correctAnswer: derivativeCoeff,
    explanationPrompt: `Explain how to use the chain rule to find d/dx[(${inner_coeff}x + ${inner_const})^${outer}].`,
    hint: 'Chain rule: d/dx[f(g(x))] = f\'(g(x)) × g\'(x)',
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
    problemText: `∫ ${coefficient}x^${exponent} dx. What is the new exponent?`,
    answerType: 'numeric',
    correctAnswer: integralExp,
    explanationPrompt: `Explain how to integrate ${coefficient}x^${exponent}.`,
    hint: 'Power rule for integration: ∫x^n dx = x^(n+1)/(n+1) + C',
  };
};

// ===========================
// MAIN GENERATOR FUNCTION
// ===========================

export const generateProblem = (topicId: TopicId): Problem => {
  switch (topicId) {
    // Basic Arithmetic
    case 'addition':
      return generateAdditionProblem();
    case 'subtraction':
      return generateSubtractionProblem();
    case 'multiplication':
      return generateMultiplicationProblem();
    case 'division':
      return generateDivisionProblem();

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
      return userNum === (problem.correctAnswer as number);

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

    case 'expression':
      // For now, just do string comparison (will improve later)
      const cleanUser = userAnswer.replace(/\s/g, '');
      const cleanCorrect = (problem.correctAnswer as string).replace(/\s/g, '');
      return cleanUser === cleanCorrect;

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
