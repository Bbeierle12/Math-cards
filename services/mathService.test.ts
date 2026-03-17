import { describe, it, expect } from 'vitest';
import { generateProblem, validateAnswer, gcd, simplifyFraction } from './mathService';
import { TopicId, Problem, FractionAnswer } from '../types';

// ===========================
// UTILITY FUNCTIONS
// ===========================

describe('gcd', () => {
  it('returns the GCD of two positive numbers', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(15, 5)).toBe(5);
    expect(gcd(7, 3)).toBe(1);
  });

  it('handles negative numbers', () => {
    expect(gcd(-12, 8)).toBe(4);
    expect(gcd(12, -8)).toBe(4);
    expect(gcd(-12, -8)).toBe(4);
  });

  it('handles zero', () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(5, 0)).toBe(5);
  });

  it('handles equal numbers', () => {
    expect(gcd(6, 6)).toBe(6);
  });
});

describe('simplifyFraction', () => {
  it('simplifies a basic fraction', () => {
    expect(simplifyFraction(4, 8)).toEqual({ numerator: 1, denominator: 2 });
    expect(simplifyFraction(6, 9)).toEqual({ numerator: 2, denominator: 3 });
  });

  it('returns already-simplified fractions as-is', () => {
    expect(simplifyFraction(3, 7)).toEqual({ numerator: 3, denominator: 7 });
  });

  it('handles negative fractions', () => {
    const result = simplifyFraction(-4, 8);
    expect(result.numerator).toBe(-1);
    expect(result.denominator).toBe(2);
  });

  it('handles negative denominator by normalizing sign', () => {
    const result = simplifyFraction(4, -8);
    expect(result.numerator).toBe(-1);
    expect(result.denominator).toBe(2);
  });

  it('handles double negative by normalizing to positive', () => {
    const result = simplifyFraction(-4, -8);
    expect(result.numerator).toBe(1);
    expect(result.denominator).toBe(2);
  });
});

// ===========================
// ANSWER VALIDATION
// ===========================

describe('validateAnswer', () => {
  describe('numeric', () => {
    const problem: Problem = {
      id: 'test',
      topicId: 'addition',
      problemText: '2 + 3 = ?',
      answerType: 'numeric',
      correctAnswer: 5,
      explanationPrompt: '',
    };

    it('accepts correct numeric answer', () => {
      expect(validateAnswer(problem, '5')).toBe(true);
    });

    it('rejects incorrect numeric answer', () => {
      expect(validateAnswer(problem, '6')).toBe(false);
    });

    it('rejects non-numeric input', () => {
      expect(validateAnswer(problem, 'abc')).toBe(false);
    });

    it('accepts negative correct answers', () => {
      const negProblem: Problem = { ...problem, correctAnswer: -3 };
      expect(validateAnswer(negProblem, '-3')).toBe(true);
      expect(validateAnswer(negProblem, '3')).toBe(false);
    });
  });

  describe('decimal-tolerance', () => {
    const problem: Problem = {
      id: 'test',
      topicId: 'decimals',
      problemText: '1.1 + 2.2 = ?',
      answerType: 'decimal-tolerance',
      correctAnswer: 3.3,
      tolerance: 0.01,
      explanationPrompt: '',
    };

    it('accepts answer within tolerance', () => {
      expect(validateAnswer(problem, '3.3')).toBe(true);
      expect(validateAnswer(problem, '3.305')).toBe(true);
      expect(validateAnswer(problem, '3.295')).toBe(true);
    });

    it('rejects answer outside tolerance', () => {
      expect(validateAnswer(problem, '3.5')).toBe(false);
      expect(validateAnswer(problem, '3.0')).toBe(false);
    });

    it('uses default tolerance of 0.01 when not specified', () => {
      const noTolProblem: Problem = { ...problem, tolerance: undefined };
      expect(validateAnswer(noTolProblem, '3.3')).toBe(true);
      expect(validateAnswer(noTolProblem, '3.305')).toBe(true);
    });

    it('rejects non-numeric input', () => {
      expect(validateAnswer(problem, 'abc')).toBe(false);
    });
  });

  describe('fraction', () => {
    const problem: Problem = {
      id: 'test',
      topicId: 'fractions-basic',
      problemText: '1/2 + 1/4 = ?',
      answerType: 'fraction',
      correctAnswer: { numerator: 3, denominator: 4 } as FractionAnswer,
      explanationPrompt: '',
    };

    it('accepts correct fraction', () => {
      expect(validateAnswer(problem, '3/4')).toBe(true);
    });

    it('accepts equivalent fraction', () => {
      expect(validateAnswer(problem, '6/8')).toBe(true);
    });

    it('rejects incorrect fraction', () => {
      expect(validateAnswer(problem, '2/4')).toBe(false);
    });

    it('rejects malformed input', () => {
      expect(validateAnswer(problem, '3')).toBe(false);
      expect(validateAnswer(problem, 'abc')).toBe(false);
    });

    it('handles negative fractions', () => {
      const negProblem: Problem = {
        ...problem,
        correctAnswer: { numerator: -1, denominator: 2 } as FractionAnswer,
      };
      expect(validateAnswer(negProblem, '-1/2')).toBe(true);
      expect(validateAnswer(negProblem, '-2/4')).toBe(true);
      expect(validateAnswer(negProblem, '1/2')).toBe(false);
    });
  });

  describe('expression', () => {
    const problem: Problem = {
      id: 'test',
      topicId: 'inequalities',
      problemText: 'Solve: 2x + 1 < 5',
      answerType: 'expression',
      correctAnswer: 'x < 2',
      explanationPrompt: '',
    };

    it('accepts correct expression', () => {
      expect(validateAnswer(problem, 'x < 2')).toBe(true);
    });

    it('ignores whitespace differences', () => {
      expect(validateAnswer(problem, 'x<2')).toBe(true);
      expect(validateAnswer(problem, ' x < 2 ')).toBe(true);
    });

    it('rejects incorrect expression', () => {
      expect(validateAnswer(problem, 'x > 2')).toBe(false);
    });
  });

  describe('multiple-choice', () => {
    const problem: Problem = {
      id: 'test',
      topicId: 'addition',
      problemText: 'Which is correct?',
      answerType: 'multiple-choice',
      correctAnswer: 'B',
      explanationPrompt: '',
    };

    it('accepts correct choice', () => {
      expect(validateAnswer(problem, 'B')).toBe(true);
    });

    it('rejects incorrect choice', () => {
      expect(validateAnswer(problem, 'A')).toBe(false);
    });
  });

  describe('coordinate', () => {
    const problem: Problem = {
      id: 'test',
      topicId: 'conic-sections',
      problemText: 'Find the center',
      answerType: 'coordinate',
      correctAnswer: { x: 2, y: 3 },
      explanationPrompt: '',
    };

    it('accepts correct coordinate with parens', () => {
      expect(validateAnswer(problem, '(2, 3)')).toBe(true);
    });

    it('accepts correct coordinate without parens', () => {
      expect(validateAnswer(problem, '2, 3')).toBe(true);
    });

    it('rejects incorrect coordinate', () => {
      expect(validateAnswer(problem, '(3, 2)')).toBe(false);
    });

    it('rejects malformed input', () => {
      expect(validateAnswer(problem, 'abc')).toBe(false);
    });
  });
});

// ===========================
// PROBLEM GENERATION
// ===========================

// All topics that have generators (excluding reference-only topics like unit-circle, calculus-formulas, multiplication-tables)
const generatableTopics: TopicId[] = [
  // Basic Arithmetic
  'addition', 'subtraction', 'multiplication', 'division',
  // Pre-Algebra
  'simple-linear-equations', 'fractions-basic', 'decimals', 'order-of-operations', 'integers',
  // Algebra 1
  'multi-step-equations', 'inequalities', 'systems-of-equations', 'exponents',
  'polynomials', 'factoring', 'quadratic-equations',
  // Geometry
  'angles', 'triangles', 'pythagorean-theorem', 'area-perimeter', 'circles', 'volume-surface-area',
  // Algebra 2
  'complex-numbers', 'rational-expressions', 'radicals', 'logarithms', 'sequences-series',
  // Trigonometry
  'trig-ratios', 'trig-special-angles', 'trig-identities', 'trig-equations', 'inverse-trig',
  // Pre-Calculus
  'functions', 'polynomial-functions', 'rational-functions', 'exponential-functions', 'conic-sections',
  // Calculus 1
  'limits', 'derivatives-basic', 'derivatives-product-quotient', 'chain-rule',
  'integrals-basic', 'integration-substitution',
  // Calculus 2
  'integration-by-parts', 'trig-integrals', 'partial-fractions', 'improper-integrals',
  'sequences', 'series-convergence', 'power-series', 'taylor-maclaurin',
  'parametric-equations', 'polar-coordinates', 'integration-applications', 'trig-substitution',
];

describe('generateProblem', () => {
  for (const topicId of generatableTopics) {
    it(`generates a valid problem for "${topicId}"`, () => {
      const problem = generateProblem(topicId);

      expect(problem).toBeDefined();
      expect(problem.id).toBeTruthy();
      expect(problem.topicId).toBe(topicId);
      expect(problem.problemText).toBeTruthy();
      expect(problem.answerType).toBeTruthy();
      expect(problem.correctAnswer !== undefined).toBe(true);
      expect(problem.explanationPrompt).toBeTruthy();
    });
  }

  it('throws for unknown topic', () => {
    expect(() => generateProblem('nonexistent' as TopicId)).toThrow();
  });

  it('generates different problems on repeated calls (randomness)', () => {
    // Run 10 times and check we get at least 2 different problems
    const problems = Array.from({ length: 10 }, () => generateProblem('addition'));
    const texts = new Set(problems.map(p => p.problemText));
    expect(texts.size).toBeGreaterThan(1);
  });
});

// ===========================
// EDGE CASES
// ===========================

describe('edge cases', () => {
  it('division never divides by zero', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateProblem('division');
      // The problem text should not contain "÷ 0"
      expect(p.problemText).not.toMatch(/÷\s*\(?\s*0\s*\)?/);
    }
  });

  it('fraction problems produce valid fractions', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('fractions-basic');
      expect(p.answerType).toBe('fraction');
      const answer = p.correctAnswer as FractionAnswer;
      expect(answer.denominator).not.toBe(0);
      expect(typeof answer.numerator).toBe('number');
      expect(typeof answer.denominator).toBe('number');
    }
  });

  it('decimal tolerance answers are rounded properly', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('decimals');
      const answer = p.correctAnswer as number;
      // Should have at most 2 decimal places
      const decimalPlaces = (answer.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    }
  });
});

// ===========================
// ARITHMETIC CORRECTNESS: verify answers match the actual math
// ===========================

describe('arithmetic correctness', () => {
  it('multi-step equations: stored answer actually solves the displayed equation', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateProblem('multi-step-equations');
      // Parse "ax + b = cx + d" from problem text
      // Format: "$${a}x + ${b} = ${c}x + ${d}$" (with latexTerm signs)
      const match = p.problemText.match(/\$(\d+)x\s*([+-])\s*(\d+)\s*=\s*(\d+)x\s*([+-])\s*(\d+)\$/);
      if (!match) throw new Error(`Could not parse multi-step equation: ${p.problemText}`);
      const a = parseInt(match[1]);
      const bSign = match[2] === '+' ? 1 : -1;
      const b = bSign * parseInt(match[3]);
      const c = parseInt(match[4]);
      const dSign = match[5] === '+' ? 1 : -1;
      const d = dSign * parseInt(match[6]);
      // Solve: (a-c)x = d - b → x = (d - b) / (a - c)
      const solved = (d - b) / (a - c);
      expect(solved).toBe(p.correctAnswer as number);
    }
  });

  it('simple linear equations: stored answer actually solves the displayed equation', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateProblem('simple-linear-equations');
      // Parse "ax + b = c"
      const match = p.problemText.match(/\$(\d+)x\s*\+\s*(\d+)\s*=\s*(\d+)\$/);
      if (!match) throw new Error(`Could not parse linear equation: ${p.problemText}`);
      const a = parseInt(match[1]);
      const b = parseInt(match[2]);
      const c = parseInt(match[3]);
      const solved = (c - b) / a;
      expect(solved).toBe(p.correctAnswer as number);
    }
  });

  it('addition: a + b = stored answer', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('addition');
      // Parse the two operands from the LaTeX
      const match = p.problemText.match(/\$(-?\d+)\s*\+\s*\(?(-?\d+)\)?\s*=/);
      if (!match) throw new Error(`Could not parse: ${p.problemText}`);
      expect(parseInt(match[1]) + parseInt(match[2])).toBe(p.correctAnswer as number);
    }
  });

  it('subtraction: a - b = stored answer', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('subtraction');
      const match = p.problemText.match(/\$(-?\d+)\s*-\s*\(?(-?\d+)\)?\s*=/);
      if (!match) throw new Error(`Could not parse: ${p.problemText}`);
      expect(parseInt(match[1]) - parseInt(match[2])).toBe(p.correctAnswer as number);
    }
  });

  it('multiplication: a * b = stored answer', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('multiplication');
      const match = p.problemText.match(/\$(-?\d+)\s*\\times\s*\(?(-?\d+)\)?\s*=/);
      if (!match) throw new Error(`Could not parse: ${p.problemText}`);
      expect(parseInt(match[1]) * parseInt(match[2])).toBe(p.correctAnswer as number);
    }
  });

  it('division: a / b = stored answer', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('division');
      const match = p.problemText.match(/\$(-?\d+)\s*\\div\s*\(?(-?\d+)\)?\s*=/);
      if (!match) throw new Error(`Could not parse: ${p.problemText}`);
      const quotient = parseInt(match[1]) / parseInt(match[2]);
      // Use == to treat -0 and 0 as equal (Object.is distinguishes them)
      expect(quotient == (p.correctAnswer as number) && Math.abs(quotient - (p.correctAnswer as number)) === 0).toBe(true);
    }
  });

  it('quadratic equations: stored answer is a root of the displayed equation', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateProblem('quadratic-equations');
      // Parse "x^2 + sx + p = 0"
      const match = p.problemText.match(/x\^2\s*([+-])\s*(\d+)x\s*([+-])\s*(\d+)\s*=\s*0/);
      if (!match) throw new Error(`Could not parse quadratic: ${p.problemText}`);
      const sSign = match[1] === '+' ? 1 : -1;
      const s = sSign * parseInt(match[2]);
      const pSign = match[3] === '+' ? 1 : -1;
      const prod = pSign * parseInt(match[4]);
      const x = p.correctAnswer as number;
      // x should satisfy x² + s*x + prod = 0
      expect(x * x + s * x + prod).toBe(0);
    }
  });

  it('factoring: stored answer is a valid factor constant', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateProblem('factoring');
      // Parse "x^2 + sx + p"
      const match = p.problemText.match(/x\^2\s*([+-])\s*(\d+)x\s*([+-])\s*(\d+)/);
      if (!match) throw new Error(`Could not parse factoring: ${p.problemText}`);
      const sSign = match[1] === '+' ? 1 : -1;
      const sum = sSign * parseInt(match[2]);
      const pSign = match[3] === '+' ? 1 : -1;
      const product = pSign * parseInt(match[4]);
      const k = p.correctAnswer as number;
      // k should be one of the factors: k + other = sum, k * other = product
      const other = sum - k;
      expect(k * other).toBe(product);
    }
  });
});

// ===========================
// SELF-VALIDATION: generated answers must pass validateAnswer
// ===========================

// Helper to format a generated answer into a user-input string
function formatAnswerForInput(problem: ReturnType<typeof generateProblem>): string {
  const answer = problem.correctAnswer;
  switch (problem.answerType) {
    case 'numeric':
    case 'decimal-tolerance':
      return String(answer);
    case 'fraction': {
      const f = answer as FractionAnswer;
      return `${f.numerator}/${f.denominator}`;
    }
    case 'expression':
      return String(answer);
    case 'coordinate': {
      const c = answer as { x: number; y: number };
      return `(${c.x}, ${c.y})`;
    }
    case 'multiple-choice':
      return String(answer);
    default:
      return String(answer);
  }
}

describe('self-validation: generated answers pass validateAnswer', () => {
  for (const topicId of generatableTopics) {
    it(`correct answer validates for "${topicId}" (10 runs)`, () => {
      for (let i = 0; i < 10; i++) {
        const problem = generateProblem(topicId);
        const input = formatAnswerForInput(problem);
        const result = validateAnswer(problem, input);
        if (!result) {
          // Provide helpful error message on failure
          throw new Error(
            `Self-validation failed for "${topicId}":\n` +
            `  Problem: ${problem.problemText}\n` +
            `  Answer type: ${problem.answerType}\n` +
            `  Correct answer: ${JSON.stringify(problem.correctAnswer)}\n` +
            `  Formatted input: "${input}"`
          );
        }
      }
    });
  }
});
