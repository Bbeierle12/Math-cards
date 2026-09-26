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

/**
 * ANSWER SPECIFICATION
 *
 * Every problem states what mathematical object its answer is, under which
 * notion of equality, on which domain, to which tolerance and in which form.
 * The grader (services/grading/grade.ts) interprets this and nothing else.
 */

/** A real interval; ±Infinity endpoints are always open. */
export interface Interval {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

/**
 * How a numeric answer is compared with the reference value.
 *  - exact: equal up to floating-point noise (the default for exact answers)
 *  - decimalPlaces: the prompt says "round to N decimal places": anything
 *    within half a unit of the last place (every input that rounds correctly,
 *    and more precise ones)
 *  - significantFigures: likewise for "N significant figures"
 *  - absolute / relative: explicit tolerances
 */
export type NumericTolerance =
  | { kind: 'exact' }
  | { kind: 'decimalPlaces'; places: number }
  | { kind: 'significantFigures'; figures: number }
  | { kind: 'absolute'; tol: number }
  | { kind: 'relative'; tol: number };

/**
 * Required written form of a numeric answer.
 *  - any (default): any exact expression denoting the value (0.75, 3/4, sqrt(3)/2)
 *  - evaluated: arithmetic-fluency problems, where + − × ^ on two plain
 *    numbers restates the problem (7+5) and is not an answer
 */
export type NumberForm = 'any' | 'evaluated';

/**
 * Domain of an expression answer. `criticalPoints` are values the author
 * knows matter (zeros of denominators, branch points); they are always
 * sampled.
 */
export interface DomainSpec {
  intervals?: Interval[];
  criticalPoints?: number[];
}

/**
 * What "the same expression" means.
 *  - samePartialFunction (default): at every point both are undefined, or
 *    both finite reals and equal (x/x is not 1)
 *  - onDeclaredDomain: equal at every point of `domain.intervals`; outside
 *    it anything goes (simplify log(x²) for x > 0: 2·log(x) is correct)
 *  - ignoreRemovableSingularities: points where one side has a removable
 *    hole are skipped (x/x counts as 1)
 */
export type DomainPolicy = 'samePartialFunction' | 'onDeclaredDomain' | 'ignoreRemovableSingularities';

/** One component of a multipart answer; `spec: null` means "not asked of the correct answer". */
export interface AnswerPartSpec {
  label: string;
  spec: AnswerSpec | null;
  /** Shown and graded only when part `part` is a choice with value `equals`. */
  when?: { part: number; equals: string };
}

export type AnswerSpec =
  /**
   * A real number. `unit: 'degree'` allows a typed ° after the number.
   * `extended` admits the extended reals: `value` may be ±Infinity and "∞",
   * "inf" or "infinity" are then answers (radius of convergence). The input
   * control is the same whether or not the value is infinite.
   */
  | { kind: 'number'; value: number; tolerance: NumericTolerance; form?: NumberForm; unit?: 'degree'; extended?: boolean }
  /**
   * An exact rational entered as numerator/denominator. Any equivalent
   * fraction is accepted unless `lowestTerms` is set (for "simplify" tasks).
   */
  | { kind: 'fraction'; numerator: number; denominator: number; lowestTerms?: boolean }
  /** An algebraic expression in parser syntax (e.g. "x^2+5"). */
  | {
      kind: 'expression';
      reference: string;
      /** Arbitrary parameters that may be renamed (e.g. ['theta']). */
      parameters?: string[];
      domain?: DomainSpec;
      domainPolicy?: DomainPolicy;
      /** Names the student may assign the expression to: ['u'] accepts "u = x^2+5". */
      assignable?: string[];
      /**
       * Form constraints for "complete the identity" items, where restating
       * the prompt is the same function but not an answer: `functions` may
       * not appear (tan θ = ? forbids tan), and with `simpleArguments` every
       * function must be applied to a bare variable (sin 2θ = ? rejects sin(2θ)).
       */
      forbid?: { functions?: string[]; simpleArguments?: boolean };
    }
  /** An equation lhs = rhs, equal up to a nonzero factor and rearrangement. */
  | { kind: 'equation'; lhs: string; rhs: string; parameters?: string[] }
  /** The solution set of an inequality in one variable, as a union of intervals. */
  | { kind: 'interval'; variable: string; set: Interval[] }
  /** A finite set of real numbers (e.g. all roots). */
  | { kind: 'finiteSet'; elements: number[] }
  /** Any antiderivative of `integrand` on its domain. `reference` is a second vote. */
  | { kind: 'antiderivative'; integrand: string; variable: string; reference?: string }
  /** One of a closed list of options, chosen with buttons. */
  | { kind: 'choice'; options: string[]; answer: string }
  /** A word from a closed vocabulary, typed (e.g. "circle"). */
  | { kind: 'text'; accepted: string[] }
  /** Several parts, graded all-or-nothing. */
  | { kind: 'multipart'; parts: AnswerPartSpec[] }
  /** Any one of several acceptable answers of the same kind. */
  | { kind: 'anyOf'; options: AnswerSpec[] };

export type AnswerKind = AnswerSpec['kind'];

/** A fraction in lowest terms with a positive denominator. */
export interface FractionAnswer {
  numerator: number;
  denominator: number;
}

/**
 * One step of a worked solution, rendered with MathText.
 *  - step: a line of working
 *  - theorem: a named result applied to this problem, with each hypothesis
 *    stated and checked for this instance, then what it gives
 */
export type SolutionStep =
  | { kind: 'step'; text: string }
  | { kind: 'theorem'; name: string; hypotheses: { condition: string; check: string }[]; conclusion: string };

export interface Problem {
  id: string;
  topicId: TopicId;
  problemText: string;
  /** The answer contract: object, equality, domain, tolerance, form. */
  answer: AnswerSpec;
  /**
   * Human-readable (MathText/LaTeX) rendering of the correct answer for
   * feedback. When absent the UI derives one from `answer`.
   */
  displayAnswer?: string;
  explanation: string;
  /** The worked solution, step by step (derived from `explanation` when a generator gives no steps). */
  solution: SolutionStep[];
  hint?: string;
  /**
   * Provenance: the problem is exactly generateProblem(generatorId, settings,
   * seed) at generatorVersion. `templateId` names its structural template.
   */
  generatorId: TopicId;
  generatorVersion: number;
  seed: string;
  templateId: string;
  /** Settings the generator ran with, when any were given. */
  settings?: GeneratorSettings;
}

/** Learner settings a generator may read (operand range for basic arithmetic). */
export interface GeneratorSettings {
  numberRange?: { min: number; max: number };
  allowNegatives?: boolean;
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
// ---------------------------------------------------------------------------
// Learning record (docs/PLAN.md, Phase 3)
// ---------------------------------------------------------------------------

/** One answered problem. The log of these is the source of truth; counters are derived. */
export interface AttemptEvent {
  /** Epoch milliseconds. */
  t: number;
  skillId: TopicId;
  generatorVersion: number;
  templateId: string;
  seed: string;
  /** Hash of the problem's content: repeats of the very same problem are recognised. */
  instance: string;
  correct: boolean;
  /** False for a second try at the same problem (weaker evidence). */
  firstAttempt: boolean;
  hintUsed: boolean;
  timedOut?: boolean;
  responseMs?: number;
}

/** Everything known about one skill, derived by folding its events over a baseline. */
export interface SkillState {
  /** Weighted evidence of proficiency (see services/learning/mastery.ts). */
  evidence: number;
  correct: number;
  attempted: number;
  /** Correct answers per template: proficiency must span templates. */
  templates: Record<string, number>;
  /** Recently seen problem instances (bounded), to discount exact repeats. */
  instances: string[];
  /** Carries counters migrated from the pre-log progress format (no template information). */
  legacy: boolean;
  /** When the skill last became proficient; null while it is not. */
  proficientAt: number | null;
  /** Proficient and has passed a delayed review; reversible on a failed review. */
  mastered: boolean;
  /** Current review interval in days (0 while not scheduled). */
  stability: number;
  dueAt: number | null;
  lastReviewAt: number | null;
  lapses: number;
}

export interface LearningLog {
  version: 1;
  /** State folded out of the event list (old events after compaction, and migrated progress). */
  baseline: {
    skills: Partial<Record<TopicId, SkillState>>;
    attempted: number;
    correct: number;
    currentStreak: number;
    longestStreak: number;
  };
  events: AttemptEvent[];
  /** When the pre-log `userProgress` was migrated (it is left in place, so the migration is reversible). */
  migratedAt?: number;
}
