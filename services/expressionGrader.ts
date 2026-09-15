/**
 * Expression grading engine.
 *
 * Contract:
 *  - Every submitted expression is normalized from "student notation"
 *    (xsin(x), sin²θ, ln|cos x|, e^x, ·, ×, √) into a form mathjs can parse.
 *  - Equality is decided numerically at fixed sample points. A comparison
 *    only counts when the REFERENCE expression evaluates to a finite real
 *    number there; the submitted expression must then also be finite and
 *    real, otherwise the submission is rejected (an expression that is
 *    undefined, complex or NaN where the reference is defined never earns
 *    credit). At least MIN_VALID_POINTS comparisons are required.
 *  - Tolerances are relative (1e-8), not the old absolute 0.001, so "0.5005"
 *    is not "1/2".
 *  - 'up-to-constant' mode (indefinite integrals) accepts submissions whose
 *    difference from the reference is the same constant at every sample
 *    point — i.e. the same derivative on the reference's domain.
 */
import { parse, MathNode } from 'mathjs';

export type Equivalence = 'exact' | 'up-to-constant';

const FUNCTION_NAMES = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'ln', 'log', 'sqrt', 'exp', 'abs'];
const FN_ALT = FUNCTION_NAMES.join('|');
/** Symbols mathjs treats as constants; everything else that is a bare symbol is a free variable. */
const CONSTANTS = new Set(['pi', 'e', 'i']);
/** Bare single-letter symbols we recognise as variables (so they are not mistaken for word answers). */
const VARIABLE_WORDS = new Set(['x', 'y', 't', 'u', 'n', 'p', 'theta']);

/**
 * Sample points. The fixed list includes the critical points 0, ±1, ±2 (where
 * "x/x", "x^2/x" and similar domain-invalid rewrites are undefined) and
 * irrational-looking values on both sides of zero. On top of these, each
 * comparison adds RANDOM_SAMPLE_COUNT points from a PRNG seeded by a hash of
 * the two expressions, so a polynomial engineered to vanish on a known list
 * of points cannot be added to a correct answer.
 */
const FIXED_SAMPLE_POINTS = [0, 1, -1, 2, -2, 0.5, 0.37, 0.91, 1.43, 2.17, 2.86, 3.52, 4.31, -0.64, -1.77, -2.93, 5.09, -4.23];
const RANDOM_SAMPLE_COUNT = 16;
const MIN_VALID_POINTS = 6;
const REL_TOL = 1e-8;

const fnv1a = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const samplePoints = (seedText: string): number[] => {
  const pts = [...FIXED_SAMPLE_POINTS];
  const rng = mulberry32(fnv1a(seedText));
  for (let i = 0; i < RANDOM_SAMPLE_COUNT; i++) pts.push((rng() * 2 - 1) * 6);
  return pts;
};

/** Scope for sample index i: each variable gets a distinct, shifted point. */
const scopeAt = (vars: string[], pts: number[], i: number): Record<string, number> => {
  const scope: Record<string, number> = {};
  vars.forEach((v, k) => { scope[v] = pts[(i + 5 * k) % pts.length] * (1 + 0.137 * k); });
  return scope;
};

/** Move `fn^n(` exponents behind the matching parenthesis: sin^2(x) -> (sin(x))^2. */
const hoistFunctionPowers = (s: string): string => {
  const re = new RegExp(`(${FN_ALT})\\^(\\d+)\\(`);
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(s)) !== null && guard++ < 50) {
    const start = m.index;
    const openIdx = start + m[0].length - 1;
    let depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    if (closeIdx === -1) break; // unbalanced; leave for the parser to reject
    const inner = s.slice(openIdx, closeIdx + 1);
    s = `${s.slice(0, start)}(${m[1]}${inner})^${m[2]}${s.slice(closeIdx + 1)}`;
  }
  return s;
};

/** Normalize student notation into mathjs syntax. Pure string transformation. */
export const normalizeMathExpr = (raw: string): string => {
  let s = raw.trim().toLowerCase().replace(/\s+/g, '');
  s = s
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/⁵/g, '^5')
    .replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\*\*/g, '^')
    .replace(/θ/g, 'theta').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/∞/g, 'infinity')
    .replace(/<=/g, '≤').replace(/>=/g, '≥');
  // |expr| -> (abs(expr)) (non-nested); the outer parentheses keep "ln|u|" parseable as ln(...)
  s = s.replace(/\|([^|]+)\|/g, '(abs($1))');
  // fn^n theta / fn^n x  -> fn(theta)^n
  s = s.replace(new RegExp(`(${FN_ALT})\\^(\\d+)(theta|x)(?![a-z])`, 'g'), '$1($3)^$2');
  // fn theta / fn x (no parentheses) -> fn(theta)
  s = s.replace(new RegExp(`(${FN_ALT})(theta|x)(?![a-z])`, 'g'), '$1($2)');
  // sin^2(x) -> (sin(x))^2
  s = hoistFunctionPowers(s);
  // implicit multiplication the mathjs parser does not resolve on its own
  s = s.replace(/(?<![a-z])(x|theta)(?=[a-z(])/g, '$1*');   // xsin(x), xe^x, x(ln(x)-1)
  s = s.replace(/\)(?=[a-z0-9(])/g, ')*');                   // (x-1)e^x, sec(x)tan(x)
  s = s.replace(/(\d)(?=\()/g, '$1*');                         // 2(x+1)
  // natural log and inverse-trig aliases
  s = s.replace(/(?<![a-z])ln\(/g, 'log(');
  s = s.replace(/(?<![a-z])arc(sin|cos|tan)\(/g, 'a$1(');
  return s;
};

const isFunctionName = (node: MathNode, path: string | null, parent: MathNode | null): boolean =>
  !!parent && parent.type === 'FunctionNode' && path === 'fn';

/** Free variables of a (normalized) expression. Throws if it does not parse. */
export const freeVariables = (normalized: string): string[] => {
  const node = parse(normalized);
  const vars = new Set<string>();
  node.traverse((n, path, parent) => {
    if (n.type === 'SymbolNode' && !isFunctionName(n, path, parent)) {
      const name = (n as unknown as { name: string }).name;
      if (!CONSTANTS.has(name)) vars.add(name);
    }
  });
  return [...vars];
};

interface Compiled { evaluate: (scope?: Record<string, number>) => unknown }

const compile = (normalized: string): Compiled | null => {
  try {
    return parse(normalized).compile() as Compiled;
  } catch {
    return null;
  }
};

const evalReal = (c: Compiled, scope: Record<string, number>): number | null => {
  try {
    const v = c.evaluate({ ...scope });
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
};

const close = (a: number, b: number, scale = 1): boolean =>
  Math.abs(a - b) <= REL_TOL * Math.max(1, Math.abs(a), Math.abs(b), Math.abs(scale));

/** Word answers ("diverges", "circle", "no") are compared as strings only. */
export const isWordAnswer = (normalized: string): boolean =>
  /^[a-z]+$/.test(normalized) && !VARIABLE_WORDS.has(normalized) && !CONSTANTS.has(normalized);

/**
 * Numeric equivalence of two normalized expressions. Returns false when
 * either fails to parse, when the submission is undefined anywhere the
 * reference is defined, or when fewer than MIN_VALID_POINTS comparisons
 * could be made.
 */
export const numericallyEquivalent = (user: string, correct: string, mode: Equivalence): boolean => {
  if (user === correct) return true;
  let vars: string[];
  try {
    vars = [...new Set([...freeVariables(correct), ...freeVariables(user)])];
  } catch {
    return false;
  }
  const cu = compile(user);
  const cc = compile(correct);
  if (!cu || !cc) return false;

  if (vars.length === 0) {
    const a = evalReal(cu, {});
    const b = evalReal(cc, {});
    if (a === null || b === null) return false;
    return mode === 'up-to-constant' ? true : close(a, b);
  }

  const pts = samplePoints(`${user}|${correct}`);
  const diffs: number[] = [];
  let scale = 1;
  for (let i = 0; i < pts.length; i++) {
    const scope = scopeAt(vars, pts, i);
    const cv = evalReal(cc, scope);
    if (cv === null) continue; // outside the reference's domain: not a comparison point
    const uv = evalReal(cu, scope);
    if (uv === null) return false; // undefined / complex / NaN where the reference is defined
    scale = Math.max(scale, Math.abs(cv), Math.abs(uv));
    diffs.push(uv - cv);
  }
  if (diffs.length < MIN_VALID_POINTS) return false;
  if (mode === 'exact') return diffs.every(d => Math.abs(d) <= REL_TOL * scale);
  return diffs.every(d => Math.abs(d - diffs[0]) <= REL_TOL * scale);
};

/**
 * Equation equivalence: "lhs = rhs" forms describe the same equation when
 * (lhs − rhs) of the submission is a fixed NONZERO constant multiple of
 * (lhs − rhs) of the reference at every sample point (x = 2 sin θ,
 * 2x = 4 sin θ, x/2 = sin θ, 2 sin θ = x). Squaring or otherwise changing
 * the solution set breaks proportionality and is rejected.
 */
const equationsEquivalent = (userDiff: string, correctDiff: string): boolean => {
  let vars: string[];
  try {
    vars = [...new Set([...freeVariables(correctDiff), ...freeVariables(userDiff)])];
  } catch {
    return false;
  }
  const cu = compile(userDiff);
  const cc = compile(correctDiff);
  if (!cu || !cc) return false;
  const pts = samplePoints(`${userDiff}|${correctDiff}`);
  let ratio: number | null = null;
  let valid = 0;
  let scale = 1;
  for (let i = 0; i < Math.max(1, pts.length); i++) {
    const scope = vars.length === 0 ? {} : scopeAt(vars, pts, i);
    const cv = evalReal(cc, scope);
    if (cv === null) continue;
    const uv = evalReal(cu, scope);
    if (uv === null) return false;
    valid++;
    scale = Math.max(scale, Math.abs(cv), Math.abs(uv));
    const cZero = Math.abs(cv) <= REL_TOL * scale;
    const uZero = Math.abs(uv) <= REL_TOL * scale;
    if (cZero !== uZero) return false;      // different solution sets
    if (cZero) continue;                     // both zero: consistent, no ratio information
    const r = uv / cv;
    if (ratio === null) ratio = r;
    else if (Math.abs(r - ratio) > REL_TOL * Math.max(1, Math.abs(ratio))) return false;
    if (vars.length === 0) break;
  }
  if (vars.length === 0) return valid > 0 && ratio !== null;
  return valid >= MIN_VALID_POINTS && ratio !== null && Math.abs(ratio) > REL_TOL;
};

const INEQ_RE = /^(.+?)(≤|≥|<|>)(.+)$/;
const FLIP: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };

const parseInequality = (s: string): { lhs: string; op: string; rhs: string } | null => {
  const m = s.match(INEQ_RE);
  return m ? { lhs: m[1], op: m[2], rhs: m[3] } : null;
};

/** Split "lhs=rhs" (exactly one '=' that is not part of an inequality). */
const parseEquation = (s: string): { lhs: string; rhs: string } | null => {
  const parts = s.split('=');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { lhs: parts[0], rhs: parts[1] };
};

/** Rename the single non-x parameter of `user` to the one used by `correct` (θ vs t vs u). */
const alignParameter = (user: string, correct: string): string => {
  try {
    const cu = freeVariables(user).filter(v => v !== 'x');
    const cc = freeVariables(correct).filter(v => v !== 'x');
    if (cu.length === 1 && cc.length === 1 && cu[0] !== cc[0]) {
      return user.replace(new RegExp(`(?<![a-z])${cu[0]}(?![a-z])`, 'g'), cc[0]);
    }
  } catch { /* fall through */ }
  return user;
};

/**
 * Decide whether a submitted answer is equivalent to a stored one.
 * Handles words, inequalities (either orientation), equations
 * ("x = 2sin(θ)" with any parameter name, "u = x^2+5" for a bare stored
 * expression) and plain expressions.
 */
export const expressionsEquivalent = (userRaw: string, correctRaw: string, mode: Equivalence = 'exact'): boolean => {
  const user = normalizeMathExpr(userRaw);
  const correct = normalizeMathExpr(correctRaw);
  if (!user || !correct) return false;
  if (user === correct) return true;
  if (isWordAnswer(correct) || isWordAnswer(user)) return false;

  const cIneq = parseInequality(correct);
  const uIneq = parseInequality(user);
  if (cIneq || uIneq) {
    if (!cIneq || !uIneq) return false;
    const direct = uIneq.op === cIneq.op &&
      numericallyEquivalent(uIneq.lhs, cIneq.lhs, 'exact') && numericallyEquivalent(uIneq.rhs, cIneq.rhs, 'exact');
    if (direct) return true;
    return uIneq.op === FLIP[cIneq.op] &&
      numericallyEquivalent(uIneq.lhs, cIneq.rhs, 'exact') && numericallyEquivalent(uIneq.rhs, cIneq.lhs, 'exact');
  }

  const cEq = parseEquation(correct);
  const uEq = parseEquation(user);
  if (cEq) {
    if (!uEq) return false;
    const correctDiff = `(${cEq.lhs})-(${cEq.rhs})`;
    const userDiff = alignParameter(`(${uEq.lhs})-(${uEq.rhs})`, correctDiff);
    return equationsEquivalent(userDiff, correctDiff);
  }
  if (uEq) {
    // "u = x^2 + 5" for a stored "x^2+5": the left side must be a fresh single symbol
    let correctVars: string[];
    try { correctVars = freeVariables(correct); } catch { return false; }
    if (!/^[a-z]$/.test(uEq.lhs) || correctVars.includes(uEq.lhs)) return false;
    return numericallyEquivalent(uEq.rhs, correct, mode);
  }

  return numericallyEquivalent(user, correct, mode);
};

/**
 * Parse a numeric answer typed by a student: decimals, fractions ("3/5"),
 * and constant expressions ("sqrt(3)/2", "pi/4", "e^0.5/384"). Returns null
 * for anything that is not a finite real constant.
 */
export const parseNumericInput = (raw: string): number | null => {
  const s = raw.trim().replace(/,/g, '');
  if (!s) return null;
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return parseFloat(s);
  const frac = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (frac) {
    const den = parseFloat(frac[2]);
    if (den === 0) return null;
    return parseFloat(frac[1]) / den;
  }
  const normalized = normalizeMathExpr(s);
  if (!normalized || normalized.includes('=') || /[<>≤≥]/.test(normalized)) return null;
  let node: MathNode;
  try {
    node = parse(normalized);
    if (freeVariables(normalized).length !== 0) return null;
  } catch {
    return null;
  }
  // Exact forms (sqrt(3)/2, 4*sqrt(2), sqrt(2)*2, 2*(pi), (1+sqrt(2))/2,
  // e^0.5/384, 1/2!) are fine. Arithmetic on plain numbers ("7+5", "7-5",
  // "7*5", "(7)(5)", "3^2") merely restates the problem and is not an answer.
  if (restatesArithmetic(node)) return null;
  const c = compile(normalized);
  return c ? evalReal(c, {}) : null;
};

interface OperatorLike { op: string; fn: string; args: MathNode[] }

/** A subtree made only of numeric literals (with parentheses / unary sign). */
const isPureNumber = (n: MathNode): boolean => {
  if (n.type === 'ConstantNode') return true;
  if (n.type === 'ParenthesisNode') return isPureNumber((n as unknown as { content: MathNode }).content);
  if (n.type === 'OperatorNode') {
    const o = n as unknown as OperatorLike;
    if ((o.fn === 'unaryMinus' || o.fn === 'unaryPlus') && o.args.length === 1) return isPureNumber(o.args[0]);
  }
  return false;
};

/** True when any +, −, × or ^ combines two plain numbers (a/b is a fraction and stays allowed). */
const restatesArithmetic = (node: MathNode): boolean => {
  let found = false;
  node.traverse((n) => {
    if (found || n.type !== 'OperatorNode') return;
    const o = n as unknown as OperatorLike;
    if (o.args.length === 2 && ['+', '-', '*', '^'].includes(o.op) && o.args.every(isPureNumber)) found = true;
  });
  return found;
};

/** Exact numeric comparison with a floating-point margin only. */
export const numbersEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** Tolerance implied by "round to N decimal places": half a unit in the last place. */
export const roundingTolerance = (decimalPlaces: number): number =>
  0.5 * Math.pow(10, -decimalPlaces) + 1e-9;
