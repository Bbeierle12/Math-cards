/**
 * Numeric evaluation at sample points.
 *
 * Two point streams:
 *  - PRIMARY points depend only on the problem (a seed key derived from the
 *    reference and CHECKER_VERSION, or an explicit problem seed). Every
 *    spelling of the same answer is tested at exactly these points, so
 *    verdicts are reproducible from the problem alone.
 *  - CONFIRMATION points are keyed by the submission. They can only ever turn
 *    an "equal" verdict into "unequal": a genuine identity holds at every
 *    point, so a correct answer is never affected. They exist so that a
 *    polynomial built to vanish on the published primary points cannot be
 *    added to a transcendental reference.
 *
 * Domain rule (same partial function): at each point either both expressions
 * are undefined, or both are finite reals and equal. A point where exactly one
 * side is defined is a mismatch.
 */
import { parse } from 'mathjs';

export const CHECKER_VERSION = 3;

/** Critical values (where x/x, x²/x, (x²−1)/(x−1) … are undefined) plus spread-out irregular values. */
export const FIXED_SAMPLE_POINTS = [0, 1, -1, 2, -2, 0.5, -0.5, 0.37, 0.91, 1.43, 2.17, 2.86, 3.52, 4.31,
  -0.64, -1.77, -2.93, 5.09, -4.23];
const PRIMARY_RANDOM_COUNT = 16;
const CONFIRMATION_COUNT = 8;
export const MIN_VALID_POINTS = 6;
export const REL_TOL = 1e-8;

export { fnv1a, mulberry32 } from '../random';
import { fnv1a, mulberry32 } from '../random';

const randomPoints = (seedText: string, count: number, radius: number): number[] => {
  const rng = mulberry32(fnv1a(seedText));
  return Array.from({ length: count }, () => (rng() * 2 - 1) * radius);
};

/** Seed key for a reference expression when the problem supplies none. */
export const referenceSeedKey = (normalizedReference: string): string =>
  `v${CHECKER_VERSION}|${normalizedReference}`;

/** Primary points: fixed critical values + problem-seeded pseudorandom values. */
export const primaryPoints = (seedKey: string): number[] =>
  [...FIXED_SAMPLE_POINTS, ...randomPoints(`primary|${seedKey}`, PRIMARY_RANDOM_COUNT, 6)];

/** Confirmation points, keyed by the submission. Only ever used to reject. */
export const confirmationPoints = (normalizedSubmission: string): number[] =>
  randomPoints(`confirm|${normalizedSubmission}`, CONFIRMATION_COUNT, 7);

export interface Compiled { evaluate: (scope?: Record<string, number>) => unknown }

export const compile = (normalized: string): Compiled | null => {
  try {
    return parse(normalized).compile() as Compiled;
  } catch {
    return null;
  }
};

/** Finite real value, or null for undefined / complex / NaN / ±Infinity / errors. */
export const evalReal = (c: Compiled, scope: Record<string, number>): number | null => {
  try {
    const v = c.evaluate({ ...scope });
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
};

/**
 * Variable order used to assign coordinates. Reference variables come first
 * (sorted) so their coordinates never depend on what the student typed;
 * extra submission variables follow (sorted).
 */
export const orderVariables = (referenceVars: string[], submissionVars: string[] = []): string[] => {
  const ref = [...new Set(referenceVars)].sort();
  const extra = [...new Set(submissionVars)].filter(v => !ref.includes(v)).sort();
  return [...ref, ...extra];
};

/** Scope for point index i: each variable gets a distinct, shifted coordinate. */
export const scopeAt = (vars: string[], pts: number[], i: number, fixed: Record<string, number> = {}): Record<string, number> => {
  const scope: Record<string, number> = {};
  vars.forEach((v, k) => { scope[v] = pts[(i + 5 * k) % pts.length] * (1 + 0.137 * k); });
  return { ...scope, ...fixed };
};

export type PointVerdict = 'equal' | 'unequal' | 'insufficient';

export interface ComparisonOptions {
  /** Treat submission − reference = constant as equal (antiderivative second vote). */
  upToConstant?: boolean;
  /** Only compare at points where this predicate expression is defined (declared domain). */
  domainGuard?: Compiled | null;
  /**
   * The points are already inside a declared domain: points where the
   * reference is undefined are skipped, and the submission must be defined
   * wherever the reference is. (Implied by `domainGuard`.)
   */
  onDeclaredDomain?: boolean;
  /** Variables fixed to a value at every point (e.g. the constant of integration C = 0). */
  fixed?: Record<string, number>;
}

/**
 * Compare two compiled expressions over the given points with the
 * same-partial-function rule (or on the guard's domain when provided).
 */
export const comparePoints = (
  user: Compiled, reference: Compiled, vars: string[], pts: number[], opts: ComparisonOptions = {},
): PointVerdict => {
  const diffs: number[] = [];
  let scale = 1;
  for (let i = 0; i < pts.length; i++) {
    const scope = vars.length === 0 ? { ...(opts.fixed ?? {}) } : scopeAt(vars, pts, i, opts.fixed);
    if (opts.domainGuard && evalReal(opts.domainGuard, scope) === null) continue;
    const rv = evalReal(reference, scope);
    const uv = evalReal(user, scope);
    if (opts.domainGuard || opts.onDeclaredDomain) {
      // On a declared domain the reference must be defined; the submission must be too.
      if (rv === null) continue;
      if (uv === null) return 'unequal';
    } else {
      if ((rv === null) !== (uv === null)) return 'unequal'; // different domains
      if (rv === null || uv === null) continue;               // both undefined: consistent
    }
    scale = Math.max(scale, Math.abs(rv), Math.abs(uv));
    diffs.push(uv - rv);
    if (vars.length === 0) break;
  }
  if (diffs.length === 0) return 'insufficient';
  if (vars.length > 0 && diffs.length < MIN_VALID_POINTS) return 'insufficient';
  const ok = opts.upToConstant
    ? diffs.every(d => Math.abs(d - diffs[0]) <= REL_TOL * scale)
    : diffs.every(d => Math.abs(d) <= REL_TOL * scale);
  return ok ? 'equal' : 'unequal';
};

/**
 * Equation residuals r_user and r_ref describe the same equation when
 * r_user = λ·r_ref for one nonzero constant λ at every point, with matching
 * zero sets and matching domains.
 */
export const proportionalOnPoints = (
  user: Compiled, reference: Compiled, vars: string[], pts: number[],
): PointVerdict => {
  if (vars.length === 0) return 'insufficient'; // an equation with no unknowns is not an answer
  let ratio: number | null = null;
  let valid = 0;
  let scale = 1;
  for (let i = 0; i < pts.length; i++) {
    const scope = scopeAt(vars, pts, i);
    const rv = evalReal(reference, scope);
    const uv = evalReal(user, scope);
    if ((rv === null) !== (uv === null)) return 'unequal';
    if (rv === null || uv === null) continue;
    valid++;
    scale = Math.max(scale, Math.abs(rv), Math.abs(uv));
    const rZero = Math.abs(rv) <= REL_TOL * scale;
    const uZero = Math.abs(uv) <= REL_TOL * scale;
    if (rZero !== uZero) return 'unequal'; // different solution sets
    if (rZero) continue;                    // both zero: consistent, no ratio information
    const r = uv / rv;
    if (ratio === null) ratio = r;
    else if (Math.abs(r - ratio) > REL_TOL * Math.max(1, Math.abs(ratio))) return 'unequal';
  }
  if (valid < MIN_VALID_POINTS) return 'insufficient';
  if (ratio === null) return 'unequal'; // both residuals vanish identically: 0 = 0 is not the equation
  return 'equal';
};
