/**
 * Exact canonical form for polynomial expressions.
 *
 * When both a submission and a reference are polynomials (in any number of
 * variables, with rational coefficients), equality is decided EXACTLY by
 * comparing coefficients — no sampling, no floating point. A polynomial
 * engineered to vanish on the sample points (x + (x−a₁)…(x−aₙ) for x) is
 * rejected by its degree, not by luck.
 *
 * `pi` is treated as an indeterminate: π is transcendental over ℚ, so a
 * polynomial identity in ℚ[x, π] holds iff it holds as numbers. `e` is also
 * transcendental, but π and e are not known to be algebraically independent,
 * so expressions mentioning both are left to the sampling checker.
 *
 * Anything else (division by a non-constant, fractional powers, functions,
 * complex i) is "not a polynomial" and the caller falls back to sampling.
 */
import { MathNode, parse } from 'mathjs';
import * as Q from './rational';
import type { Rational } from './rational';

/** Monomial key: "" for the constant term, else "x^2*y" style, variables sorted. */
type MonomialKey = string;
export type Polynomial = Map<MonomialKey, Rational>;

const MAX_DEGREE = 64;
const MAX_TERMS = 512;
const INDETERMINATE_CONSTANTS = new Set(['pi', 'e']);

const parseKey = (key: MonomialKey): Map<string, number> => {
  const m = new Map<string, number>();
  if (!key) return m;
  for (const part of key.split('*')) {
    const [v, p] = part.split('^');
    m.set(v, p ? parseInt(p, 10) : 1);
  }
  return m;
};

const makeKey = (m: Map<string, number>): MonomialKey =>
  [...m.entries()].filter(([, p]) => p > 0).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([v, p]) => (p === 1 ? v : `${v}^${p}`)).join('*');

const keyDegree = (key: MonomialKey): number => {
  let d = 0;
  for (const p of parseKey(key).values()) d += p;
  return d;
};

const mulKeys = (a: MonomialKey, b: MonomialKey): MonomialKey => {
  const m = parseKey(a);
  for (const [v, p] of parseKey(b)) m.set(v, (m.get(v) ?? 0) + p);
  return makeKey(m);
};

const constant = (r: Rational): Polynomial => (Q.isZero(r) ? new Map() : new Map([['', r]]));

const addInto = (target: Polynomial, key: MonomialKey, c: Rational): void => {
  const next = Q.add(target.get(key) ?? Q.ZERO, c);
  if (Q.isZero(next)) target.delete(key); else target.set(key, next);
};

const polyAdd = (a: Polynomial, b: Polynomial, sign: 1 | -1 = 1): Polynomial => {
  const out = new Map(a);
  for (const [k, c] of b) addInto(out, k, sign === 1 ? c : Q.neg(c));
  return out;
};

class NotPolynomial extends Error {}

const polyMul = (a: Polynomial, b: Polynomial): Polynomial => {
  const out: Polynomial = new Map();
  for (const [ka, ca] of a) {
    for (const [kb, cb] of b) {
      const k = mulKeys(ka, kb);
      if (keyDegree(k) > MAX_DEGREE) throw new NotPolynomial();
      addInto(out, k, Q.mul(ca, cb));
    }
  }
  if (out.size > MAX_TERMS) throw new NotPolynomial();
  return out;
};

const asConstant = (p: Polynomial): Rational | null => {
  if (p.size === 0) return Q.ZERO;
  if (p.size === 1 && p.has('')) return p.get('')!;
  return null;
};

const factorial = (n: number): Rational => {
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i++) r *= i;
  return Q.rat(r);
};

interface OpNode { op: string; fn: string; args: MathNode[] }

const build = (node: MathNode): Polynomial => {
  switch (node.type) {
    case 'ConstantNode': {
      const v = (node as unknown as { value: unknown }).value;
      if (typeof v !== 'number') throw new NotPolynomial();
      const r = Q.fromNumber(v);
      if (!r) throw new NotPolynomial();
      return constant(r);
    }
    case 'SymbolNode': {
      const name = (node as unknown as { name: string }).name;
      if (name === 'i' || name === 'Infinity' || name === 'NaN') throw new NotPolynomial();
      return new Map([[name, Q.ONE]]);
    }
    case 'ParenthesisNode':
      return build((node as unknown as { content: MathNode }).content);
    case 'OperatorNode': {
      const { fn, args } = node as unknown as OpNode;
      switch (fn) {
        case 'add': return polyAdd(build(args[0]), build(args[1]));
        case 'subtract': return polyAdd(build(args[0]), build(args[1]), -1);
        case 'unaryMinus': return polyAdd(new Map(), build(args[0]), -1);
        case 'unaryPlus': return build(args[0]);
        case 'multiply': return polyMul(build(args[0]), build(args[1]));
        case 'divide': {
          const den = asConstant(build(args[1]));
          if (!den || Q.isZero(den)) throw new NotPolynomial();
          return polyMul(build(args[0]), constant(Q.div(Q.ONE, den)));
        }
        case 'pow': {
          const base = build(args[0]);
          const exp = asConstant(build(args[1]));
          if (!exp || !Q.isInteger(exp)) throw new NotPolynomial();
          const k = Number(exp.n);
          const baseConst = asConstant(base);
          if (baseConst) {
            if (k < 0 && Q.isZero(baseConst)) throw new NotPolynomial();
            if (Math.abs(k) > MAX_DEGREE) throw new NotPolynomial();
            return constant(Q.pow(baseConst, k));
          }
          if (k < 0 || k > MAX_DEGREE) throw new NotPolynomial();
          let result: Polynomial = constant(Q.ONE);
          for (let i = 0; i < k; i++) result = polyMul(result, base);
          return result;
        }
        case 'factorial': {
          const n = asConstant(build(args[0]));
          if (!n || !Q.isInteger(n) || n.n < 0n || n.n > 20n) throw new NotPolynomial();
          return constant(factorial(Number(n.n)));
        }
        default:
          throw new NotPolynomial();
      }
    }
    default:
      throw new NotPolynomial();
  }
};

/** Canonical polynomial of a normalized expression, or null if it is not a polynomial. */
export const toPolynomial = (normalized: string | MathNode): Polynomial | null => {
  try {
    return build(typeof normalized === 'string' ? parse(normalized) : normalized);
  } catch {
    return null;
  }
};

const symbolsOf = (p: Polynomial): Set<string> => {
  const s = new Set<string>();
  for (const k of p.keys()) for (const v of parseKey(k).keys()) s.add(v);
  return s;
};

/**
 * Whether exact comparison of these two polynomials is sound. False when π
 * and e both appear (their algebraic independence is an open problem).
 */
export const comparable = (a: Polynomial, b: Polynomial): boolean => {
  const s = new Set([...symbolsOf(a), ...symbolsOf(b)]);
  return !([...INDETERMINATE_CONSTANTS].every(c => s.has(c)));
};

export const polynomialsEqual = (a: Polynomial, b: Polynomial, ignoreConstantTerm = false): boolean => {
  const diff = polyAdd(a, b, -1);
  if (ignoreConstantTerm) diff.delete('');
  // A difference that only involves π/e (no variables) is still a nonzero constant.
  return diff.size === 0;
};

/** a = λ·b for some nonzero rational λ (equation residuals up to scaling). */
export const polynomialsProportional = (a: Polynomial, b: Polynomial): boolean => {
  // A zero residual is the identity 0 = 0, which is never the intended equation.
  if (a.size === 0 || b.size === 0 || a.size !== b.size) return false;
  let ratio: Rational | null = null;
  for (const [k, cb] of b) {
    const ca = a.get(k);
    if (!ca) return false;
    const r = Q.div(ca, cb);
    if (ratio === null) ratio = r;
    else if (!Q.equals(ratio, r)) return false;
  }
  return ratio !== null && !Q.isZero(ratio);
};

export const polynomialDegree = (p: Polynomial): number => {
  let d = 0;
  for (const k of p.keys()) d = Math.max(d, keyDegree(k));
  return d;
};
