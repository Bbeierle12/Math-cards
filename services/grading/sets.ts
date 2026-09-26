/**
 * Solution sets: unions of real intervals (answers to inequalities) and
 * finite sets (all roots). Students may write
 *   x < 4 · 4 > x · x ≤ 4 · 1 < x ≤ 3 · (-∞, 4) · [2, inf) · x ∈ (1, ∞)
 *   (-inf, 1) U (3, inf) · all real numbers
 * and, for finite sets,  2, -3 · {2, -3} · x = 2 or x = -3.
 * Comparison is set equality: endpoints numerically equal, closedness equal.
 */
import type { Interval } from '../../types';
import { parseNumericInput, numbersEqual } from './numeric';

const INF = Number.POSITIVE_INFINITY;

const prep = (raw: string): string =>
  raw.trim().toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[−–]/g, '-')
    .replace(/θ/g, 'theta')
    .replace(/∞|infinity/g, 'inf')
    .replace(/<=/g, '≤').replace(/>=/g, '≥')
    .replace(/∈|\bin\b/g, '∈');

const parseEndpoint = (s: string): number | null => {
  if (s === 'inf' || s === '+inf') return INF;
  if (s === '-inf') return -INF;
  return parseNumericInput(s);
};

/** Canonical form: nonempty intervals, sorted, overlapping/touching ones merged. */
export const normalizeIntervals = (intervals: Interval[]): Interval[] => {
  const clean = intervals
    .map(iv => ({
      lo: iv.lo, hi: iv.hi,
      loClosed: Number.isFinite(iv.lo) && iv.loClosed,
      hiClosed: Number.isFinite(iv.hi) && iv.hiClosed,
    }))
    .filter(iv => iv.lo < iv.hi || (numbersEqual(iv.lo, iv.hi) && iv.loClosed && iv.hiClosed))
    .sort((a, b) => a.lo - b.lo || Number(b.loClosed) - Number(a.loClosed));
  const out: Interval[] = [];
  for (const iv of clean) {
    const last = out[out.length - 1];
    const touches = last && (iv.lo < last.hi || (numbersEqual(iv.lo, last.hi) && (last.hiClosed || iv.loClosed)));
    if (!touches) { out.push({ ...iv }); continue; }
    if (numbersEqual(iv.lo, last.lo)) last.loClosed = last.loClosed || iv.loClosed;
    if (numbersEqual(iv.hi, last.hi)) {
      last.hiClosed = last.hiClosed || iv.hiClosed;
    } else if (iv.hi > last.hi) {
      last.hi = iv.hi;
      last.hiClosed = iv.hiClosed;
    }
  }
  return out;
};

export const intervalSetsEqual = (a: Interval[], b: Interval[]): boolean => {
  const x = normalizeIntervals(a);
  const y = normalizeIntervals(b);
  if (x.length !== y.length) return false;
  return x.every((iv, i) =>
    numbersEqual(iv.lo, y[i].lo) && numbersEqual(iv.hi, y[i].hi) && iv.loClosed === y[i].loClosed && iv.hiClosed === y[i].hiClosed);
};

const parseBracketInterval = (s: string): Interval | null => {
  const m = s.match(/^([(\[])([^,]+),([^,]+)([)\]])$/);
  if (!m) return null;
  const lo = parseEndpoint(m[2]);
  const hi = parseEndpoint(m[3]);
  if (lo === null || hi === null || !(lo <= hi)) return null;
  return { lo, hi, loClosed: m[1] === '[', hiClosed: m[4] === ']' };
};

const ray = (op: string, c: number, variableOnLeft: boolean): Interval => {
  // Normalize to "variable op c".
  const flipped: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
  const o = variableOnLeft ? op : flipped[op];
  switch (o) {
    case '<': return { lo: -INF, hi: c, loClosed: false, hiClosed: false };
    case '≤': return { lo: -INF, hi: c, loClosed: false, hiClosed: true };
    case '>': return { lo: c, hi: INF, loClosed: false, hiClosed: false };
    default: return { lo: c, hi: INF, loClosed: true, hiClosed: false };
  }
};

/**
 * Parse a solution set in `variable`. Returns null when the input is not a
 * well-formed set in that variable (a different variable is a wrong answer).
 */
export const parseIntervalSet = (raw: string, variable: string): Interval[] | null => {
  let s = prep(raw);
  if (!s) return null;
  if (/^(allrealnumbers|allreals|ℝ|r)$/.test(s)) return [{ lo: -INF, hi: INF, loClosed: false, hiClosed: false }];
  const v = variable.toLowerCase();

  // interval notation, optionally "v ∈ ..."
  if (s.startsWith(`${v}∈`)) s = s.slice(v.length + 1);
  if (/^[(\[]/.test(s)) {
    const pieces = s.split(/(?<=[\])])(?:∪|u|or)(?=[(\[])/);
    const out: Interval[] = [];
    for (const piece of pieces) {
      const iv = parseBracketInterval(piece);
      if (!iv) return null;
      out.push(iv);
    }
    return out;
  }

  // double inequality  a < v ≤ b  (or  b > v > a)
  const tokens = s.split(/(≤|≥|<|>)/);
  if (tokens.length === 5) {
    const [a, op1, mid, op2, b] = tokens;
    if (mid !== v) return null;
    const lo = parseEndpoint(a);
    const hi = parseEndpoint(b);
    if (lo === null || hi === null) return null;
    const up = (op1 === '<' || op1 === '≤') && (op2 === '<' || op2 === '≤');
    const down = (op1 === '>' || op1 === '≥') && (op2 === '>' || op2 === '≥');
    if (up && lo < hi) return [{ lo, hi, loClosed: op1 === '≤', hiClosed: op2 === '≤' }];
    if (down && hi < lo) return [{ lo: hi, hi: lo, loClosed: op2 === '≥', hiClosed: op1 === '≥' }];
    return null;
  }
  // single inequality  v op c  or  c op v
  if (tokens.length === 3) {
    const [left, op, right] = tokens;
    if (left === v) {
      const c = parseEndpoint(right);
      return c === null || !Number.isFinite(c) ? null : [ray(op, c, true)];
    }
    if (right === v) {
      const c = parseEndpoint(left);
      return c === null || !Number.isFinite(c) ? null : [ray(op, c, false)];
    }
  }
  return null;
};

/** Parse a finite set of reals: "2, -3", "{2,-3}", "x = 2 or x = -3", "30°, 150°", "∅". */
export const parseFiniteSet = (raw: string): number[] | null => {
  let s = raw.trim().toLowerCase().replace(/[−–]/g, '-');
  if (!s) return null;
  if (/^(∅|\{\s*\}|none|no\s*(real\s*)?solutions?)$/.test(s)) return [];
  s = s.replace(/^\{(.*)\}$/, '$1');
  const items = s.split(/,|;|\bor\b|\band\b/).map(t => t.trim()).filter(Boolean);
  if (items.length === 0) return null;
  const out: number[] = [];
  for (const item of items) {
    const value = parseNumericInput(item.replace(/^[a-z]\s*=\s*/, '').replace(/\s*°$/, ''));
    if (value === null) return null;
    out.push(value);
  }
  return out;
};

export const finiteSetsEqual = (a: number[], b: number[]): boolean => {
  const covers = (xs: number[], ys: number[]) => xs.every(x => ys.some(y => numbersEqual(x, y)));
  return covers(a, b) && covers(b, a);
};
