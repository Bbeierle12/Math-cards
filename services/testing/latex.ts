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

/**
 * The displayed LaTeX of a formula (an integrand, a term, a sequence) as a
 * mathjs expression, for evaluating it independently of the generator:
 *   "x^{2}\sin(3x)" → "x^(2) sin(3x)",  "\frac{n!}{2^n}" → "((n!)/(2^n))".
 * Handles exactly the notation the generators print; anything else throws
 * when mathjs parses the result.
 */
export const latexToExpr = (tex: string): string => {
  let s = tex.replace(/\\displaystyle|\\,|\\;|\\left|\\right/g, ' ');
  // \sin^2\theta → (sin(theta))^(2);  \tan\theta → tan(theta);  \theta → theta
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot)\^\{?(\d+)\}?\\theta/g, ' ($1(theta))^($2) ')
    .replace(/\\(sin|cos|tan|sec|csc|cot)\\theta/g, ' $1(theta) ')
    .replace(/\\theta/g, ' theta ');
  // \sin^{3}(x), \sec^2(x) → (sin(x))^(3)
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot)\^\{?(\d+)\}?\(([^()]*)\)/g, ' ($1($3))^($2) ');
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot)\(/g, ' $1(').replace(/\\ln\(/g, ' log(');
  let prev: string;
  do {
    prev = s;
    s = s.replace(/\^\{([^{}]*)\}/g, '^($1)')
      .replace(/\\sqrt\[3\]\{([^{}]*)\}/g, ' cbrt($1) ')
      .replace(/\\sqrt\{([^{}]*)\}/g, ' sqrt($1) ')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, ' (($1)/($2)) ');
  } while (s !== prev);
  s = s.replace(/\\cdot/g, '*').replace(/\\pi/g, 'pi').replace(/\s+/g, ' ').trim();
  // "n (…)" would parse as a call of n, and "n log(n)" loses its space downstream:
  // make juxtaposition before a parenthesis or a function explicit
  return s.replace(/([a-zA-Z0-9)!])\s+(?=\(|(?:sin|cos|tan|sec|csc|cot|log|sqrt|cbrt)\()/g, '$1 * ');
};
