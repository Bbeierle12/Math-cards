export type TopicId =
  // Basic Arithmetic
  'addition' |
  'subtraction' |
  'multiplication' |
  'division' |
  'multiplication-tables' |
  // Pre-Algebra
  'pre-algebra-formulas' |
  'simple-linear-equations' |
  'fractions-basic' |
  'decimals' |
  'order-of-operations' |
  'integers' |
  // Algebra 1
  'algebra1-formulas' |
  'multi-step-equations' |
  'inequalities' |
  'systems-of-equations' |
  'exponents' |
  'polynomials' |
  'factoring' |
  'quadratic-equations' |
  // Geometry
  'geometry-formulas' |
  'angles' |
  'triangles' |
  'pythagorean-theorem' |
  'area-perimeter' |
  'circles' |
  'volume-surface-area' |
  // Algebra 2
  'algebra2-formulas' |
  'complex-numbers' |
  'rational-expressions' |
  'radicals' |
  'logarithms' |
  'sequences-series' |
  // Trigonometry
  'unit-circle' |
  'trig-ratios' |
  'trig-special-angles' |
  'trig-identities' |
  'trig-equations' |
  'inverse-trig' |
  // Pre-Calculus
  'precalculus-formulas' |
  'functions' |
  'polynomial-functions' |
  'rational-functions' |
  'exponential-functions' |
  'conic-sections' |
  // Calculus 1
  'calculus-formulas' |
  'limits' |
  'derivatives-basic' |
  'derivatives-product-quotient' |
  'chain-rule' |
  'integrals-basic' |
  'integration-substitution' |
  // Calculus 2
  'calc2-formulas' |
  'integration-by-parts' |
  'trig-integrals' |
  'partial-fractions' |
  'improper-integrals' |
  'sequences' |
  'series-convergence' |
  'power-series' |
  'taylor-maclaurin' |
  'parametric-equations' |
  'polar-coordinates';

export type AnswerType =
  | 'numeric'           // Single number: 42
  | 'fraction'          // Fraction: 3/4
  | 'expression'        // Algebraic expression: 2x+3
  | 'multiple-choice'   // Choose from options
  | 'decimal-tolerance' // Number with tolerance
  | 'coordinate'        // Point (x, y)
  | 'interval';         // Interval notation

export interface FractionAnswer {
  numerator: number;
  denominator: number;
}

export interface CoordinateAnswer {
  x: number;
  y: number;
}

export type ProblemAnswer =
  | number
  | string
  | FractionAnswer
  | CoordinateAnswer
  | number[]; // For multiple answers like systems of equations

export interface Problem {
  id: string;
  topicId: TopicId;
  problemText: string;
  answerType: AnswerType;
  correctAnswer: ProblemAnswer;
  explanationPrompt: string;
  hint?: string;
  multipleChoiceOptions?: string[];
  tolerance?: number; // For decimal-tolerance answers
  acceptableAnswers?: ProblemAnswer[]; // Additional correct answers
  diagram?: string;   // SVG or description for geometry
}

export interface Topic {
  id: TopicId;
  title: string;
  description: string;
  type?: 'practice' | 'reference';
}

export interface Level {
  id: string;
  title: string;
  topics: Topic[];
}

export interface TopicProgress {
  correct: number;
  attempted: number;
  mastery: boolean;
}

export interface UserProgress {
  topicProgress: Partial<Record<TopicId, TopicProgress>>;
  totalProblemsAttempted: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: number;
  lastLoginAt: number;
}

export interface UserSettings {
  // Practice Preferences
  practiceMode: 'standard' | 'speed-drill' | 'thoughtful';
  problemsPerSession: number; // 0 = unlimited
  showHintsAutomatically: boolean;
  showExplanationOnIncorrect: boolean;

  // Difficulty & Progression
  masteryThreshold: number;
  numberRange: { min: number; max: number };
  allowNegatives: boolean;
  unlockMode: 'sequential' | 'free';

  // Timer / Speed Drill
  timerEnabled: boolean;
  timerDurationSeconds: number;
  autoAdvanceOnCorrect: boolean;

  // Appearance
  theme: 'dark' | 'light' | 'system';
  animationsEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';

  // Audio & Feedback
  soundEnabled: boolean;
  hapticFeedback: boolean;
}