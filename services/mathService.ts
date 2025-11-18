import { TopicId, Problem } from '../types';

// Helper function to get a random integer
const randInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper to format negative numbers for display
const formatNum = (n: number) => (n < 0 ? `(${n})` : n);

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
  };
};

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
    };
};


export const generateProblem = (topicId: TopicId): Problem => {
  switch (topicId) {
    case 'addition':
      return generateAdditionProblem();
    case 'subtraction':
      return generateSubtractionProblem();
    case 'multiplication':
      return generateMultiplicationProblem();
    case 'division':
      return generateDivisionProblem();
    case 'simple-linear-equations':
        return generateSimpleLinearEquationProblem();
    default:
      throw new Error(`Unknown topic ID: ${topicId}`);
  }
};

export const validateAnswer = (problem: Problem, userAnswer: string): boolean => {
  if (problem.answerType === 'numeric') {
    const userAnswerNum = parseFloat(userAnswer);
    return userAnswerNum === problem.correctAnswer;
  }
  return false;
};