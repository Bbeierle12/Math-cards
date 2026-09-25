/**
 * Grading engine public API. See README "Grading contract".
 */
export { normalizeMathExpr, freeVariables, isWordAnswer, normalizeWord } from './normalize';
export { expressionsEquivalent, sameExpression, isAntiderivative } from './equivalence';
export type { EquivalenceOptions, AntiderivativeOptions } from './equivalence';
export { parseNumericInput, numbersEqual, roundingTolerance, restatesArithmetic } from './numeric';
export type { NumberForm } from './numeric';
export { toPolynomial, polynomialsEqual, polynomialsProportional, polynomialDegree } from './polynomial';
export { primaryPoints, confirmationPoints, referenceSeedKey, CHECKER_VERSION, FIXED_SAMPLE_POINTS } from './sampling';
