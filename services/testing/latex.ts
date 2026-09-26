/**
 * Test helpers for recomputing answers from the text a student sees.
 */

/**
 * Coefficients of a displayed polynomial, keyed by monomial ('' for the
 * constant): "x^2 - 5x" → { 'x^2': 1, x: -5 }. Parses only what a textbook
 * writes (integer coefficients, hidden 1s), and throws on anything else.
 */
export const terms = (latex: string): Record<string, number> => {
  const src = latex.replace(/\s+/g, '');
  const out: Record<string, number> = {};
  const re = /([+-]?)(\d*)((?:[a-z](?:\^\{?\d+\}?)?)?)/g;
  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) && m[0] !== '') {
    if (m[2] === '' && m[3] === '') throw new Error(`not a polynomial: ${latex}`);
    const mono = m[3].replace(/[{}]/g, '');
    out[mono] = (out[mono] ?? 0) + (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    consumed += m[0].length;
  }
  if (consumed !== src.length) throw new Error(`not a polynomial: ${latex}`);
  return out;
};

/** Coefficient of `mono` (0 when absent). */
export const coef = (t: Record<string, number>, mono: string): number => t[mono] ?? 0;
