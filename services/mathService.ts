/**
 * Public problem API.
 *
 *  - generateProblem(topicId, settings?, seed?): a seeded, replayable problem
 *    from the generator registry (services/generators).
 *  - validateAnswer(problem, input): grade(problem.answer, input), the single
 *    interpreter of the typed answer contract (services/grading/grade.ts).
 */
import type { Problem } from '../types';
import { displayOf, grade } from './grading';
import type { AnswerInput } from './grading';

export { generateProblem, hasGenerator } from './generators';
export { gcd, simplifyFraction, resolveRange } from './generators/context';
export { partIsActive } from './grading';

export const validateAnswer = (problem: Problem, input: AnswerInput): boolean => grade(problem.answer, input);

/** MathText rendering of the correct answer, for feedback. */
export const answerDisplay = (problem: Problem): string => problem.displayAnswer ?? displayOf(problem.answer);
