/**
 * Exact rational arithmetic on BigInt. Used where a verdict must not depend on
 * floating-point rounding: polynomial coefficient comparison and decimal
 * literals typed by students ("0.1" is exactly 1/10 here, not 0.1000000000000000055…).
 */
export interface Rational { readonly n: bigint; readonly d: bigint } // d > 0, gcd(|n|, d) = 1

const abs = (a: bigint): bigint => (a < 0n ? -a : a);

const gcd = (a: bigint, b: bigint): bigint => {
  a = abs(a); b = abs(b);
  while (b !== 0n) { const t = a % b; a = b; b = t; }
  return a;
};

export const rat = (n: bigint, d: bigint = 1n): Rational => {
  if (d === 0n) throw new RangeError('zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};

export const ZERO = rat(0n);
export const ONE = rat(1n);

export const add = (a: Rational, b: Rational): Rational => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational): Rational => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational): Rational => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational): Rational => rat(a.n * b.d, a.d * b.n);
export const neg = (a: Rational): Rational => ({ n: -a.n, d: a.d });
export const isZero = (a: Rational): boolean => a.n === 0n;
export const equals = (a: Rational, b: Rational): boolean => a.n === b.n && a.d === b.d;
export const isInteger = (a: Rational): boolean => a.d === 1n;
export const toNumber = (a: Rational): number => Number(a.n) / Number(a.d);

/** Integer power (negative exponents allowed for nonzero bases). */
export const pow = (a: Rational, k: number): Rational => {
  if (!Number.isInteger(k)) throw new RangeError('non-integer exponent');
  if (k < 0) return pow(div(ONE, a), -k);
  let result = ONE;
  for (let i = 0; i < k; i++) result = mul(result, a);
  return result;
};

/**
 * Exact rational value of a JavaScript number, taken from its shortest
 * round-trip decimal representation (the literal the student typed).
 * Returns null for NaN/±Infinity.
 */
export const fromNumber = (v: number): Rational | null => {
  if (!Number.isFinite(v)) return null;
  const m = String(v).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
  if (!m) return null;
  const [, sign, intPart, fracPart = '', expPart = '0'] = m;
  let n = BigInt(intPart + fracPart);
  let d = 10n ** BigInt(fracPart.length);
  const e = parseInt(expPart, 10);
  if (e > 0) n *= 10n ** BigInt(e); else if (e < 0) d *= 10n ** BigInt(-e);
  return rat(sign === '-' ? -n : n, d);
};
