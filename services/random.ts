/**
 * Deterministic pseudo-randomness. Every generated problem and every set of
 * grading sample points is a pure function of a seed string, so any problem
 * (and its verdicts) can be replayed exactly from a bug report.
 */

/** FNV-1a 32-bit hash. */
export const fnv1a = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** mulberry32: small, fast, well-distributed 32-bit PRNG returning [0, 1). */
export const mulberry32 = (seed: number): (() => number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (inclusive). Requires min <= max. */
  int(min: number, max: number): number;
  /** Uniform element of a nonempty array. */
  pick<T>(items: readonly T[]): T;
  /** true with probability p. */
  bool(p?: number): boolean;
}

export const createRng = (seed: string): Rng => {
  const next = mulberry32(fnv1a(seed));
  const int = (min: number, max: number): number => {
    if (!(min <= max)) throw new RangeError(`empty range [${min}, ${max}]`);
    return Math.floor(next() * (max - min + 1)) + min;
  };
  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError('pick from empty array');
      return items[int(0, items.length - 1)];
    },
    bool: (p = 0.5) => next() < p,
  };
};

/** A fresh seed for a new problem (not itself reproducible; it is recorded on the problem). */
export const randomSeed = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 13)
    : Math.random().toString(36).slice(2, 15);
