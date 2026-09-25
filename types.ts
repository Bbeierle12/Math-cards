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
  'polar-coordinates' |
  // Calculus 2 - Additional
  'integration-applications' |
  'trig-substitution';

export type AnswerType =
  | 'numeric'           // Single number: 42
  | 'fraction'          // Fraction: 3/4
  | 'expression'        // Algebraic expression: 2x+3
  | 'multiple-choice'   // Choose from options
  | 'decimal-tolerance' // Number with tolerance
  | 'coordinate'        // Point (x, y)
  | 'interval'          // Interval notation
  | 'multipart';        // Several typed parts, graded all-or-nothing (see `parts`)

/**
 * One component of a multipart answer.
 *  - 'choice': one of `options` (normalized word match), e.g. converges / diverges.
 *  - 'number': a numeric value (same input rules as a 'numeric' answer).
 * `answer: null` means the part does not apply to the correct answer (e.g. the
 * limit of a divergent sequence). `when` makes a part conditional on an
 * earlier choice: it is shown and graded only when that choice is selected.
 */
export interface AnswerPart {
  label: string;
  kind: 'choice' | 'number';
  options?: string[];
  answer: string | number | null;
  when?: { part: number; equals: string };
}

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
  tolerance?: number; // For decimal-tolerance answers: explicit absolute tolerance
  /**
   * For decimal-tolerance answers: the number of decimal places the problem
   * text asks for. correctAnswer holds the EXACT value; grading accepts any
   * input within half a unit of the last requested place (i.e. every input
   * that rounds to the correctly rounded value, and more precise inputs).
   * Ignored when `tolerance` is set explicitly.
   */
  roundTo?: number;
  /**
   * For expression answers: 'exact' (default) requires the submitted
   * expression to be the same partial function as the stored one;
   * 'antiderivative' requires the submission to be an antiderivative of
   * `integrand` on the integrand's domain (checked by differentiation, with
   * correctAnswer as an independent second vote).
   */
  equivalence?: 'exact' | 'antiderivative';
  /** For 'antiderivative' answers: the integrand f(x), in parser syntax. */
  integrand?: string;
  /**
   * Declared arbitrary parameters that a student may rename (e.g. ['theta']
   * in x = 2 sin θ, so x = 2 sin t is the same substitution). Variables not
   * listed here keep their identity.
   */
  parameters?: string[];
  /**
   * Required written form of numeric answers. 'evaluated' (arithmetic-fluency
   * topics) rejects answers that restate the arithmetic, such as 7+5.
   * Default 'any': any exact expression for the value is accepted.
   */
  requiredForm?: 'any' | 'evaluated';
  /** For 'multipart' answers: the typed components, graded all-or-nothing. */
  parts?: AnswerPart[];
  /**
   * Human-readable (MathText/LaTeX) rendering of the correct answer for
   * feedback. When absent the UI formats correctAnswer directly.
   */
  displayAnswer?: string;
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