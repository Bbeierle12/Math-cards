/**
 * Equivalence of submitted answers to reference answers.
 *
 * Decision procedure for two expressions:
 *  1. Both polynomials (rational coefficients, π allowed as an indeterminate):
 *     exact coefficient comparison. Final.
 *  2. Otherwise numeric sampling under the same-partial-function rule at the
 *     problem's primary points, then a submission-keyed confirmation stream
 *     that can only reject.
 *
 * A symbolic `simplify(user − reference) = 0` shortcut is deliberately
 * absent: it would identify x/x with 1 and erase domain differences.
 */
import { derivative, parse, MathNode } from 'mathjs';
import { normalizeMathExpr, freeVariables, freeVariablesOf, isWordAnswer, renameVariables } from './normalize';
import { toPolynomial, comparable, polynomialsEqual, polynomialsProportional } from './polynomial';
import {
  compile, evalReal, comparePoints, proportionalOnPoints, primaryPoints, confirmationPoints,
  referenceSeedKey, orderVariables, scopeAt, MIN_VALID_POINTS, REL_TOL, Compiled,
} from './sampling';

export interface EquivalenceOptions {
  /**
   * Declared arbitrary parameters of the reference (e.g. ['theta'] in
   * x = 2 sin θ). Only these may be renamed: a submission that uses exactly
   * one unknown symbol where exactly one declared parameter is missing has
   * that symbol renamed onto the parameter. Fixed variables keep their names.
   */
  parameters?: string[];
  /** Problem seed for the primary sample points (default: derived from the reference). */
  seedKey?: string;
}

const tryParse = (s: string): MathNode | null => {
  try { return parse(s); } catch { return null; }
};

/** Rename one unknown submission symbol onto one missing declared parameter. */
const alignDeclaredParameters = (user: string, reference: string, parameters: string[] = []): string => {
  if (parameters.length === 0) return user;
  try {
    const refVars = freeVariables(reference);
    const userVars = freeVariables(user);
    const extras = userVars.filter(v => !refVars.includes(v));
    const missing = parameters.filter(p => refVars.includes(p) && !userVars.includes(p));
    if (extras.length === 1 && missing.length === 1) return renameVariables(user, { [extras[0]]: missing[0] });
  } catch { /* unparseable: leave as is and let comparison reject it */ }
  return user;
};

/** Same partial function (or, for polynomials, same polynomial). Inputs are normalized. */
export const sameExpression = (user: string, reference: string, opts: EquivalenceOptions = {}): boolean => {
  if (user === reference) return true;
  const u = alignDeclaredParameters(user, reference, opts.parameters);
  const uNode = tryParse(u);
  const rNode = tryParse(reference);
  if (!uNode || !rNode) return false;

  const up = toPolynomial(uNode);
  const rp = toPolynomial(rNode);
  if (up && rp && comparable(up, rp)) return polynomialsEqual(up, rp);

  const cu = compile(u);
  const cr = compile(reference);
  if (!cu || !cr) return false;
  const vars = orderVariables(freeVariablesOf(rNode), freeVariablesOf(uNode));
  const primary = comparePoints(cu, cr, vars, primaryPoints(opts.seedKey ?? referenceSeedKey(reference)));
  if (primary !== 'equal') return false;
  if (vars.length === 0) return true;
  return comparePoints(cu, cr, vars, confirmationPoints(u)) !== 'unequal';
};

/** Residuals describe the same equation (nonzero scalar multiple, same zero set and domain). */
const sameEquation = (userResidual: string, refResidual: string, opts: EquivalenceOptions): boolean => {
  const u = alignDeclaredParameters(userResidual, refResidual, opts.parameters);
  const uNode = tryParse(u);
  const rNode = tryParse(refResidual);
  if (!uNode || !rNode) return false;

  const up = toPolynomial(uNode);
  const rp = toPolynomial(rNode);
  if (up && rp && comparable(up, rp)) return polynomialsProportional(up, rp);

  const cu = compile(u);
  const cr = compile(refResidual);
  if (!cu || !cr) return false;
  const vars = orderVariables(freeVariablesOf(rNode), freeVariablesOf(uNode));
  const primary = proportionalOnPoints(cu, cr, vars, primaryPoints(opts.seedKey ?? referenceSeedKey(refResidual)));
  if (primary !== 'equal') return false;
  return proportionalOnPoints(cu, cr, vars, confirmationPoints(u)) !== 'unequal';
};

const INEQ_RE = /^(.+?)(≤|≥|<|>)(.+)$/;
const FLIP: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };

const parseInequality = (s: string): { lhs: string; op: string; rhs: string } | null => {
  const m = s.match(INEQ_RE);
  return m ? { lhs: m[1], op: m[2], rhs: m[3] } : null;
};

/** Split "lhs=rhs" (exactly one '='). */
const parseEquation = (s: string): { lhs: string; rhs: string } | null => {
  const parts = s.split('=');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { lhs: parts[0], rhs: parts[1] };
};

/**
 * Decide whether a submitted answer is equivalent to a stored one.
 * Handles words, inequalities (either orientation), equations (up to a
 * nonzero factor, declared parameters renameable), "u = expr" for a bare
 * stored expression, and plain expressions.
 */
export const expressionsEquivalent = (userRaw: string, referenceRaw: string, opts: EquivalenceOptions = {}): boolean => {
  const user = normalizeMathExpr(userRaw);
  const reference = normalizeMathExpr(referenceRaw);
  if (!user || !reference) return false;
  if (user === reference) return true;
  if (isWordAnswer(reference) || isWordAnswer(user)) return false;

  const rIneq = parseInequality(reference);
  const uIneq = parseInequality(user);
  if (rIneq || uIneq) {
    if (!rIneq || !uIneq) return false;
    const same = (a: string, b: string) => sameExpression(a, b, opts);
    if (uIneq.op === rIneq.op && same(uIneq.lhs, rIneq.lhs) && same(uIneq.rhs, rIneq.rhs)) return true;
    return uIneq.op === FLIP[rIneq.op] && same(uIneq.lhs, rIneq.rhs) && same(uIneq.rhs, rIneq.lhs);
  }

  const rEq = parseEquation(reference);
  const uEq = parseEquation(user);
  if (rEq) {
    if (!uEq) return false;
    return sameEquation(`(${uEq.lhs})-(${uEq.rhs})`, `(${rEq.lhs})-(${rEq.rhs})`, opts);
  }
  if (uEq) {
    // "u = x^2 + 5" for a stored "x^2+5": the left side must be a fresh single symbol
    let referenceVars: string[];
    try { referenceVars = freeVariables(reference); } catch { return false; }
    if (!/^[a-z]$/.test(uEq.lhs) || referenceVars.includes(uEq.lhs)) return false;
    return sameExpression(uEq.rhs, reference, opts);
  }

  return sameExpression(user, reference, opts);
};

export interface AntiderivativeOptions {
  /** Variable of integration (default 'x'). */
  variable?: string;
  /** A known antiderivative, used as an independent second vote (constant difference). */
  reference?: string;
  seedKey?: string;
}

const CONSTANT_OF_INTEGRATION = 'c';

/**
 * Is `userRaw` an antiderivative of `integrandRaw` on the integrand's domain?
 *
 *  - F must be defined wherever f is (so −ln(cos x) fails for ∫tan x: it is
 *    undefined where cos x < 0, although its formal derivative is tan x).
 *  - F′ must equal f there (derivative taken symbolically, compared exactly
 *    for polynomials and by sampling otherwise).
 *  - Second vote: F − F_ref is constant on f's domain.
 *  - A constant of integration written as "+ C" is allowed.
 * Points outside f's domain are not compared, so x·ln|x| − x is a correct
 * antiderivative of ln x.
 */
export const isAntiderivative = (userRaw: string, integrandRaw: string, opts: AntiderivativeOptions = {}): boolean => {
  const variable = opts.variable ?? 'x';
  const user = normalizeMathExpr(userRaw);
  const integrand = normalizeMathExpr(integrandRaw);
  if (!user || /[=<>≤≥]/.test(user)) return false;
  const uNode = tryParse(user);
  const fNode = tryParse(integrand);
  if (!uNode || !fNode) return false;

  const fVars = freeVariablesOf(fNode);
  const uVars = freeVariablesOf(uNode);
  const allowed = new Set([...fVars, variable, CONSTANT_OF_INTEGRATION]);
  if (uVars.some(v => !allowed.has(v))) return false;

  let dNode: MathNode | null = null;
  // simplify: false: symbolic simplification is not needed for the numeric
  // comparison and can take unbounded time on large inputs.
  try { dNode = derivative(uNode, variable, { simplify: false }); } catch { dNode = null; }

  // Exact path: polynomial F (so defined everywhere), polynomial F′ against polynomial f.
  const fPoly = toPolynomial(fNode);
  const FPoly = toPolynomial(uNode);
  const dPoly = dNode ? toPolynomial(dNode) : null;
  if (fPoly && FPoly && dPoly && comparable(fPoly, dPoly)) {
    if (!polynomialsEqual(dPoly, fPoly)) return false;
    return opts.reference ? secondVote(user, normalizeMathExpr(opts.reference), integrand, variable, opts.seedKey) : true;
  }

  const F = compile(user);
  const f = compile(integrand);
  const dF = dNode ? compile(dNode.toString()) : null;
  if (!F || !f) return false;
  if (!dF && !opts.reference) return false; // no way to check the derivative

  const vars = orderVariables([...fVars, variable], uVars);
  const seedKey = opts.seedKey ?? referenceSeedKey(`antiderivative|${integrand}`);
  const pts = [...primaryPoints(seedKey), ...confirmationPoints(user)];
  let valid = 0;
  for (let i = 0; i < pts.length; i++) {
    const scope = scopeAt(vars, pts, i);
    const fv = evalReal(f, scope);
    if (fv === null) continue;                 // outside the integrand's domain
    const Fv = evalReal(F, scope);
    if (Fv === null) return false;             // F must be defined wherever f is
    if (dF) {
      const dv = evalReal(dF, scope);
      if (dv === null) return false;
      if (Math.abs(dv - fv) > REL_TOL * Math.max(1, Math.abs(dv), Math.abs(fv))) return false;
    }
    valid++;
  }
  if (valid < MIN_VALID_POINTS) return false;
  return opts.reference ? secondVote(user, normalizeMathExpr(opts.reference), integrand, variable, opts.seedKey) : true;
};

/** F − F_ref constant wherever the integrand is defined (with C = 0). */
const secondVote = (user: string, reference: string, integrand: string, variable: string, seedKey?: string): boolean => {
  const F = compile(user);
  const R = compile(reference);
  const guard: Compiled | null = compile(integrand);
  if (!F || !R || !guard) return false;
  let refVars: string[];
  let userVars: string[];
  let fVars: string[];
  try {
    refVars = freeVariables(reference);
    userVars = freeVariables(user).filter(v => v !== CONSTANT_OF_INTEGRATION);
    fVars = freeVariables(integrand);
  } catch { return false; }
  const vars = orderVariables([...new Set([...refVars, ...fVars, variable])], userVars);
  const pts = primaryPoints(seedKey ?? referenceSeedKey(`antiderivative|${integrand}`));
  return comparePoints(F, R, vars, pts, { upToConstant: true, domainGuard: guard, fixed: { [CONSTANT_OF_INTEGRATION]: 0 } }) === 'equal';
};
