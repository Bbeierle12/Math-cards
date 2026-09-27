/**
 * Calculus 2.
 *
 * Every topic is a set of structural templates with random parameters, so
 * mastery never rests on repeating a fixed item. Each template's answer is
 * computed from its parameters; scripts/oracle proves the corresponding
 * claim symbolically, and mathCorrectness.test.ts recomputes it from the
 * prompt text.
 */
import type { AnswerPartSpec, AnswerSpec, SolutionStep } from '../../types';
import type { Draft, GeneratorDef } from './context';
import {
  choice, degrees, exact, latexFrac, latexFraction, latexPolynomial, latexPower, ordinalSuffix, roundedTo,
  simplifyFraction, step, theorem,
} from './context';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** "x", "-x", "3x" for b·x. */
const linearArg = (b: number, v = 'x'): string => (b === 1 ? v : b === -1 ? `-${v}` : `${b}${v}`);

/** A coefficient n/d in front of a factor: '' for 1, '-' for −1, otherwise the fraction. */
const coefTex = (n: number, d = 1): string => {
  const f = simplifyFraction(n, d);
  if (f.numerator === f.denominator) return '';
  if (f.numerator === -f.denominator) return '-';
  return latexFraction(f.numerator, f.denominator);
};

/** (n/d)·body, written \frac{body}{k} when the coefficient is ±1/k. */
const overTex = (body: string, n: number, d: number): string => {
  const f = simplifyFraction(n, d);
  if (Math.abs(f.numerator) === 1 && f.denominator !== 1) return `${f.numerator < 0 ? '-' : ''}\\frac{${body}}{${f.denominator}}`;
  return `${coefTex(f.numerator, f.denominator)}${body}`;
};

/** Sum of terms (n/d)·body, textbook style: "\frac{x^{2}}{2} - x + 1". */
const latexRationalSum = (terms: [number, number, string][]): string => {
  const parts: string[] = [];
  for (const [n, d, body] of terms) {
    const f = simplifyFraction(n, d);
    if (f.numerator === 0) continue;
    const abs = body === '' ? latexFraction(Math.abs(f.numerator), f.denominator) : overTex(body, Math.abs(f.numerator), f.denominator);
    if (parts.length === 0) parts.push(f.numerator < 0 ? `-${abs}` : abs);
    else parts.push(f.numerator < 0 ? `- ${abs}` : `+ ${abs}`);
  }
  return parts.length ? parts.join(' ') : '0';
};

/** v^(n/d): x, \sqrt{x}, \sqrt[3]{x}, x^{3/2}. */
const powTex = (v: string, n: number, d: number): string => {
  const f = simplifyFraction(n, d);
  if (f.denominator === 1) return latexPower(v, f.numerator);
  if (f.numerator === 1 && f.denominator === 2) return `\\sqrt{${v}}`;
  if (f.numerator === 1 && f.denominator === 3) return `\\sqrt[3]{${v}}`;
  return `${v}^{${f.numerator}/${f.denominator}}`;
};

/** A rational number n/d as the base of a power: 2, (-2), \left(\frac{2}{3}\right). */
const baseTex = (n: number, d: number): string => {
  const f = simplifyFraction(n, d);
  if (f.denominator === 1) return f.numerator < 0 ? `(${f.numerator})` : `${f.numerator}`;
  return `\\left(${latexFraction(f.numerator, f.denominator)}\\right)`;
};

/** "a ± b/n" for dividing (an + b) by n. */
const perN = (a: number, b: number): string => (b === 0 ? `${a}` : `${a} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{n}`);

/** A small positive value to `sig` significant figures, in scientific notation when tiny. */
const sciTex = (v: number, sig: number): string => {
  const [mantissa, exponent] = v.toExponential(sig - 1).split('e');
  const e = Number(exponent);
  return e >= -3 && e < 4 ? String(Number(v.toPrecision(sig))) : `${mantissa} \\times 10^{${e}}`;
};

const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));

/** base^k, parenthesized unless k = 1. */
const powOf = (base: string, k: number): string => (k === 1 ? base : `\\left(${base}\\right)^{${k}}`);

/** A draft with an explicit worked solution. */
const solved = (draft: Draft, ...solution: SolutionStep[]): Draft => ({ ...draft, solution });

// ---------------------------------------------------------------------------
// Answer shapes
// ---------------------------------------------------------------------------

/**
 * An indefinite integral: graded by differentiating the submission and
 * comparing with the integrand on its domain; `reference` is a second vote.
 */
const antiderivative = (integrand: string, reference: string): AnswerSpec =>
  ({ kind: 'antiderivative', integrand, variable: 'x', reference });

const verdictChoice = (converges: boolean): AnswerSpec => choice(['converges', 'diverges'], converges ? 'converges' : 'diverges');

/** A typed limit: a real number, ±∞, or null when the limit does not exist. */
const limitOf = (value: number | null): AnswerSpec => ({ kind: 'limit', value, tolerance: { kind: 'exact' } });

/**
 * An expression in one variable, graded where the problem defines it: on
 * [lo, hi) (or (lo, hi) when `loClosed` is false). Outside that set two
 * correct forms may differ (b^{1/3} is complex for b < 0 in the parser, a
 * cube root is not), which is not the student's concern here.
 */
const onDomain = (reference: string, lo: number, loClosed = true, hi = Infinity): AnswerSpec => ({
  kind: 'expression', reference, domain: { intervals: [{ lo, hi, loClosed, hiClosed: false }] }, domainPolicy: 'onDeclaredDomain',
});

const LIMIT_NOTE = '(Type a number, ∞ or −∞, or DNE if the limit does not exist.)';

/** "k + term" (or "k − term") as LaTeX; just the term when k = 0. */
const shifted = (k: number, term: string, sign: 1 | -1 = 1): string =>
  (k === 0 ? `${sign < 0 ? '-' : ''}${term}` : `${k} ${sign < 0 ? '-' : '+'} ${term}`);

/** "Find lim a_n": one typed answer, the same control for a finite, infinite or nonexistent limit. */
const sequenceLimit = (
  templateId: string, body: string, value: number | null, tex: string | null, why: string, hint: string, text?: string,
): Draft => ({
  templateId,
  problemText: text ?? `Find $\\lim_{n\\to\\infty} a_n$ for $a_n = ${body}$.\n${LIMIT_NOTE}`,
  answer: limitOf(value),
  displayAnswer: value === null ? 'The limit does not exist' : `$${tex}$`,
  explanation: why,
  hint,
});

/**
 * ∫ x^{−p} over [1, v] ('upper') or [v, 1] ('lower') for p = n/d ≠ 1:
 * (v^{1−p} − 1)/(1 − p), resp. (1 − v^{1−p})/(1 − p), as a parser reference
 * and as LaTeX with a positive leading coefficient.
 */
const partialPower = (v: string, n: number, d: number, end: 'upper' | 'lower'): { ref: string; tex: string } => {
  const e = simplifyFraction(d - n, d); // 1 − p
  const eTex = latexFraction(e.numerator, e.denominator);
  const power = `${v}^{${eTex}}`;
  const ref = end === 'upper'
    ? `(${v}^((${d - n})/${d}) - 1)/((${d - n})/${d})`
    : `(1 - ${v}^((${d - n})/${d}))/((${d - n})/${d})`;
  const positive = d - n > 0; // p < 1
  const coef = positive ? coefTex(d, d - n) : coefTex(d, n - d);
  const inner = end === 'upper'
    ? (positive ? `${power} - 1` : `1 - ${power}`)
    : (positive ? `1 - ${power}` : `${power} - 1`);
  return { ref, tex: `${coef}\\left(${inner}\\right)` };
};

/** An improper integral as its partial integral I(v) (typed expression) and its value (typed limit). */
const improper = (
  templateId: string, text: string, partial: AnswerSpec, partialTex: string, v: string,
  value: number, valueTex: string, solution: SolutionStep[],
): Draft => ({
  templateId,
  problemText: text,
  answer: {
    kind: 'multipart',
    parts: [
      { label: `I(${v})`, spec: partial },
      { label: 'Value of the integral', spec: limitOf(value) },
    ],
  },
  displayAnswer: `$I(${v}) = ${partialTex}$; the integral ${Number.isFinite(value) ? `converges to $${valueTex}$` : 'diverges ($\\infty$)'}`,
  explanation: solution.map(s => (s.kind === 'step' ? s.text : s.conclusion)).join(' '),
  hint: IMPROPER_HINT,
  solution,
});

/** A radius of convergence: a nonnegative extended real (∞ allowed; the input is the same either way). */
const radius = (value: number): AnswerSpec =>
  ({ kind: 'number', value, tolerance: { kind: 'exact' }, extended: true });

// ---------------------------------------------------------------------------
// Integration by parts
// ---------------------------------------------------------------------------

const IBP_TEMPLATES = ['x-exp', 'x-trig', 'xn-ln', 'x2-exp'] as const;
const ASK_RESULT = '\nWhat is the result? (omit $+C$)';

export const integrationByParts: GeneratorDef = {
  topicId: 'integration-by-parts',
  version: 4,
  templates: IBP_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(IBP_TEMPLATES);
    if (template === 'x-exp') {
      // ∫ x e^{ax} dx = (x/a − 1/a²) e^{ax}
      const a = ctx.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      const e = `e^{${linearArg(a)}}`;
      const v = `${coefTex(1, a)}${e}`;
      return {
        templateId: template,
        problemText: `$\\displaystyle\\int x ${e}\\,dx$${ASK_RESULT}`,
        answer: antiderivative(`x*e^((${a})*x)`, `(x/(${a}) - 1/(${a * a}))*e^((${a})*x)`),
        displayAnswer: `$\\left(${latexRationalSum([[1, a, 'x'], [-1, a * a, '']])}\\right)${e} + C$`,
        explanation: `Let $u = x$ and $dv = ${e}\\,dx$, so $du = dx$ and $v = ${v}$. Then $\\int x ${e}\\,dx = uv - \\int v\\,du = ${overTex('x', 1, a)}${e} - \\int ${v}\\,dx = ${latexRationalSum([[1, a, `x${e}`], [-1, a * a, e]])} + C$.`,
        hint: `Let $u = x$ (it becomes simpler when differentiated) and $dv = ${e}\\,dx$.`,
      };
    }
    if (template === 'x-trig') {
      const b = ctx.int(1, 6);
      const arg = linearArg(b);
      if (ctx.bool()) {
        // ∫ x sin(bx) dx = −(x/b) cos(bx) + sin(bx)/b²
        return {
          templateId: template,
          problemText: `$\\displaystyle\\int x\\sin(${arg})\\,dx$${ASK_RESULT}`,
          answer: antiderivative(`x*sin(${b}*x)`, `-x*cos(${b}*x)/${b} + sin(${b}*x)/${b * b}`),
          displayAnswer: `$-${overTex('x', 1, b)}\\cos(${arg}) + ${overTex(`\\sin(${arg})`, 1, b * b)} + C$`,
          explanation: `Let $u = x$ and $dv = \\sin(${arg})\\,dx$, so $du = dx$ and $v = -${overTex(`\\cos(${arg})`, 1, b)}$. Then $uv - \\int v\\,du = -${overTex('x', 1, b)}\\cos(${arg}) + \\int ${overTex(`\\cos(${arg})`, 1, b)}\\,dx = -${overTex('x', 1, b)}\\cos(${arg}) + ${overTex(`\\sin(${arg})`, 1, b * b)} + C$.`,
          hint: `Let $u = x$ and $dv = \\sin(${arg})\\,dx$.`,
        };
      }
      // ∫ x cos(bx) dx = (x/b) sin(bx) + cos(bx)/b²
      return {
        templateId: template,
        problemText: `$\\displaystyle\\int x\\cos(${arg})\\,dx$${ASK_RESULT}`,
        answer: antiderivative(`x*cos(${b}*x)`, `x*sin(${b}*x)/${b} + cos(${b}*x)/${b * b}`),
        displayAnswer: `$${overTex('x', 1, b)}\\sin(${arg}) + ${overTex(`\\cos(${arg})`, 1, b * b)} + C$`,
        explanation: `Let $u = x$ and $dv = \\cos(${arg})\\,dx$, so $du = dx$ and $v = ${overTex(`\\sin(${arg})`, 1, b)}$. Then $uv - \\int v\\,du = ${overTex('x', 1, b)}\\sin(${arg}) - \\int ${overTex(`\\sin(${arg})`, 1, b)}\\,dx = ${overTex('x', 1, b)}\\sin(${arg}) + ${overTex(`\\cos(${arg})`, 1, b * b)} + C$.`,
        hint: `Let $u = x$ and $dv = \\cos(${arg})\\,dx$.`,
      };
    }
    if (template === 'xn-ln') {
      // ∫ xⁿ ln x dx = x^{n+1} ln x/(n+1) − x^{n+1}/(n+1)²   (x > 0)
      const n = ctx.int(0, 4);
      const m = n + 1;
      const xn = n === 0 ? '' : latexPower('x', n);
      const integrand = n === 0 ? 'log(x)' : n === 1 ? 'x*log(x)' : `x^${n}*log(x)`;
      const lead = overTex(latexPower('x', m), 1, m);
      const tail = overTex(latexPower('x', m), 1, m * m);
      return {
        templateId: template,
        problemText: `$\\displaystyle\\int ${xn}\\ln(x)\\,dx$${ASK_RESULT}`,
        answer: antiderivative(integrand, `x^${m}*log(x)/${m} - x^${m}/${m * m}`),
        displayAnswer: `$${lead}\\ln(x) - ${tail} + C$`,
        explanation: `Let $u = \\ln(x)$ and $dv = ${n === 0 ? 'dx' : `${xn}\\,dx`}$, so $du = \\frac{dx}{x}$ and $v = ${lead}$. Then $uv - \\int v\\,du = ${lead}\\ln(x) - \\int ${overTex(latexPower('x', n), 1, m)}\\,dx = ${lead}\\ln(x) - ${tail} + C$ (for $x > 0$).`,
        hint: 'Let $u = \\ln(x)$: it is the factor that becomes simpler when differentiated.',
      };
    }
    // ∫ x² e^{ax} dx = e^{ax}(x²/a − 2x/a² + 2/a³): by parts twice
    const a = ctx.pick([-2, -1, 1, 2]);
    const e = `e^{${linearArg(a)}}`;
    const poly = latexRationalSum([[1, a, 'x^{2}'], [-2, a * a, 'x'], [2, a * a * a, '']]);
    const once = latexRationalSum([[1, a, 'x'], [-1, a * a, '']]);
    return {
      templateId: template,
      problemText: `$\\displaystyle\\int x^{2} ${e}\\,dx$${ASK_RESULT}`,
      answer: antiderivative(`x^2*e^((${a})*x)`, `(x^2/(${a}) - 2*x/(${a * a}) + 2/(${a * a * a}))*e^((${a})*x)`),
      displayAnswer: `$\\left(${poly}\\right)${e} + C$`,
      explanation: `Integrate by parts twice. With $u = x^{2}$, $dv = ${e}\\,dx$: $\\int x^{2}${e}\\,dx = ${latexRationalSum([[1, a, `x^{2}${e}`], [-2, a, `\\int x${e}\\,dx`]])}$. Again with $u = x$: $\\int x${e}\\,dx = \\left(${once}\\right)${e}$. Together: $\\left(${poly}\\right)${e} + C$.`,
      hint: 'Use integration by parts twice, each time with $u$ the power of $x$.',
    };
  },
};

// ---------------------------------------------------------------------------
// Trigonometric integrals
// ---------------------------------------------------------------------------

const TRIG_TEMPLATES = ['power-reduction', 'odd-power', 'tan-cot', 'sec2-tan'] as const;

export const trigIntegrals: GeneratorDef = {
  topicId: 'trig-integrals',
  version: 4,
  templates: TRIG_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(TRIG_TEMPLATES);
    if (template === 'power-reduction') {
      const b = ctx.int(1, 4);
      const arg = linearArg(b);
      const arg2 = linearArg(2 * b);
      const fn = ctx.bool() ? 'sin' : 'cos';
      const sign = fn === 'sin' ? '-' : '+';
      return {
        templateId: template,
        problemText: `$\\displaystyle\\int \\${fn}^2(${arg})\\,dx$${ASK_RESULT}`,
        answer: antiderivative(`${fn}(${b}*x)^2`, `x/2 ${sign} sin(${2 * b}*x)/${4 * b}`),
        displayAnswer: `$\\frac{x}{2} ${sign} \\frac{\\sin(${arg2})}{${4 * b}} + C$`,
        explanation: `Use $\\${fn}^2(u) = \\frac{1 ${sign} \\cos(2u)}{2}$: $\\int \\${fn}^2(${arg})\\,dx = \\int \\frac{1 ${sign} \\cos(${arg2})}{2}\\,dx = \\frac{x}{2} ${sign} \\frac{\\sin(${arg2})}{${4 * b}} + C$.`,
        hint: `Use the power-reduction identity $\\${fn}^2(u) = \\frac{1 ${sign} \\cos(2u)}{2}$.`,
      };
    }
    if (template === 'odd-power') {
      const n = ctx.int(1, 4);
      const m = n + 1;
      const b = ctx.int(1, 2);
      const arg = linearArg(b);
      const k = b === 1 ? '' : `\\frac{1}{${b}}`;
      const over = b * m;
      if (ctx.bool()) {
        // ∫ sinⁿ(bx) cos(bx) dx = sin^{n+1}(bx)/(b(n+1))
        const power = n === 1 ? `\\sin(${arg})` : `\\sin^{${n}}(${arg})`;
        return {
          templateId: template,
          problemText: `$\\displaystyle\\int ${power}\\cos(${arg})\\,dx$${ASK_RESULT}`,
          answer: antiderivative(`sin(${b}*x)^${n}*cos(${b}*x)`, `sin(${b}*x)^${m}/${over}`),
          displayAnswer: `$\\frac{\\sin^{${m}}(${arg})}{${over}} + C$`,
          explanation: `Let $u = \\sin(${arg})$, $du = ${b === 1 ? '' : b}\\cos(${arg})\\,dx$: $${k}\\int u^{${n}}\\,du = \\frac{u^{${m}}}{${over}} = \\frac{\\sin^{${m}}(${arg})}{${over}} + C$.`,
          hint: `The $\\cos(${arg})\\,dx$ is (a multiple of) the derivative of $\\sin(${arg})$: substitute $u = \\sin(${arg})$.`,
        };
      }
      // ∫ cosⁿ(bx) sin(bx) dx = −cos^{n+1}(bx)/(b(n+1))
      const power = n === 1 ? `\\cos(${arg})` : `\\cos^{${n}}(${arg})`;
      return {
        templateId: template,
        problemText: `$\\displaystyle\\int ${power}\\sin(${arg})\\,dx$${ASK_RESULT}`,
        answer: antiderivative(`cos(${b}*x)^${n}*sin(${b}*x)`, `-cos(${b}*x)^${m}/${over}`),
        displayAnswer: `$-\\frac{\\cos^{${m}}(${arg})}{${over}} + C$`,
        explanation: `Let $u = \\cos(${arg})$, $du = -${b === 1 ? '' : b}\\sin(${arg})\\,dx$: $-${k}\\int u^{${n}}\\,du = -\\frac{u^{${m}}}{${over}} = -\\frac{\\cos^{${m}}(${arg})}{${over}} + C$.`,
        hint: `The $\\sin(${arg})\\,dx$ is (minus a multiple of) the derivative of $\\cos(${arg})$: substitute $u = \\cos(${arg})$.`,
      };
    }
    if (template === 'tan-cot') {
      const b = ctx.int(1, 4);
      const arg = linearArg(b);
      const ask = '\nWhat is the result? (omit $+C$; use absolute values where needed)';
      const k = b === 1 ? '' : `\\frac{1}{${b}}`;
      if (ctx.bool()) {
        // ∫ tan(bx) dx = −ln|cos(bx)|/b
        return {
          templateId: template,
          problemText: `$\\displaystyle\\int \\tan(${arg})\\,dx$${ask}`,
          answer: antiderivative(`tan(${b}*x)`, `-log(abs(cos(${b}*x)))/${b}`),
          displayAnswer: `$-${k}\\ln|\\cos(${arg})| + C = ${k}\\ln|\\sec(${arg})| + C$`,
          explanation: `Write $\\tan(${arg}) = \\frac{\\sin(${arg})}{\\cos(${arg})}$ and let $u = \\cos(${arg})$, $du = -${b === 1 ? '' : b}\\sin(${arg})\\,dx$: the integral is $-${k}\\int \\frac{du}{u} = -${k}\\ln|\\cos(${arg})| + C$. The absolute value is required: $\\cos(${arg})$ is negative on part of the domain of $\\tan(${arg})$, where $\\ln(\\cos(${arg}))$ is undefined.`,
          hint: `Rewrite $\\tan = \\frac{\\sin}{\\cos}$ and substitute $u = \\cos(${arg})$.`,
        };
      }
      // ∫ cot(bx) dx = ln|sin(bx)|/b
      return {
        templateId: template,
        problemText: `$\\displaystyle\\int \\cot(${arg})\\,dx$${ask}`,
        answer: antiderivative(`cot(${b}*x)`, `log(abs(sin(${b}*x)))/${b}`),
        displayAnswer: `$${k}\\ln|\\sin(${arg})| + C$`,
        explanation: `Write $\\cot(${arg}) = \\frac{\\cos(${arg})}{\\sin(${arg})}$ and let $u = \\sin(${arg})$, $du = ${b === 1 ? '' : b}\\cos(${arg})\\,dx$: the integral is $${k}\\int \\frac{du}{u} = ${k}\\ln|\\sin(${arg})| + C$. The absolute value is required: $\\sin(${arg})$ is negative on part of the domain of $\\cot(${arg})$.`,
        hint: `Rewrite $\\cot = \\frac{\\cos}{\\sin}$ and substitute $u = \\sin(${arg})$.`,
      };
    }
    // ∫ sec²(bx) tanⁿ(bx) dx = tan^{n+1}(bx)/(b(n+1))
    const n = ctx.int(1, 3);
    const m = n + 1;
    const b = ctx.int(1, 2);
    const arg = linearArg(b);
    const over = b * m;
    const power = n === 1 ? `\\tan(${arg})` : `\\tan^{${n}}(${arg})`;
    return {
      templateId: template,
      problemText: `$\\displaystyle\\int \\sec^2(${arg})${power}\\,dx$${ASK_RESULT}`,
      answer: antiderivative(`sec(${b}*x)^2*tan(${b}*x)^${n}`, `tan(${b}*x)^${m}/${over}`),
      displayAnswer: `$\\frac{\\tan^{${m}}(${arg})}{${over}} + C$`,
      explanation: `Let $u = \\tan(${arg})$, $du = ${b === 1 ? '' : b}\\sec^2(${arg})\\,dx$: $${b === 1 ? '' : `\\frac{1}{${b}}`}\\int u^{${n}}\\,du = \\frac{\\tan^{${m}}(${arg})}{${over}} + C$.${n === 1 ? ` (Since $\\sec^2 = 1 + \\tan^2$, $\\frac{\\sec^2(${arg})}{${over}}$ differs from this by a constant and is also correct.)` : ''}`,
      hint: `Let $u = \\tan(${arg})$, then $du = ${b === 1 ? '' : b}\\sec^2(${arg})\\,dx$.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Partial fractions
// ---------------------------------------------------------------------------

const PF_TEMPLATES = ['distinct-linear-A', 'distinct-linear-B', 'repeated-linear', 'quadratic'] as const;

export const partialFractions: GeneratorDef = {
  topicId: 'partial-fractions',
  version: 2,
  templates: PF_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(PF_TEMPLATES);
    if (template === 'distinct-linear-A' || template === 'distinct-linear-B') {
      // 1/((x − a)(x + c)) = A/(x − a) + B/(x + c): A = 1/(a + c), B = −1/(a + c)
      const a = ctx.int(1, 5);
      const c = ctx.int(1, 5);
      const diff = a + c;
      const setup = `Decompose into partial fractions:\n$\\frac{1}{(x - ${a})(x + ${c})} = \\frac{A}{x - ${a}} + \\frac{B}{x + ${c}}$\n`;
      const cleared = `Multiply through by $(x - ${a})(x + ${c})$: $1 = A(x + ${c}) + B(x - ${a})$.`;
      if (template === 'distinct-linear-A') {
        return {
          templateId: template,
          problemText: `${setup}What is $A$? (enter a fraction)`,
          answer: exact(1 / diff),
          displayAnswer: `$${latexFrac(1, diff)}$`,
          explanation: `${cleared} Set $x = ${a}$: $1 = A(${a} + ${c}) = ${diff}A$, so $A = ${latexFrac(1, diff)}$.`,
          hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
        };
      }
      return {
        templateId: template,
        problemText: `${setup}What is $B$? (enter a fraction)`,
        answer: exact(-1 / diff),
        displayAnswer: `$-${latexFrac(1, diff)}$`,
        explanation: `${cleared} Set $x = -${c}$: $1 = B(-${c} - ${a}) = -${diff}B$, so $B = -${latexFrac(1, diff)}$.`,
        hint: `Multiply both sides by $(x + ${c})$ and set $x = -${c}$.`,
      };
    }
    if (template === 'repeated-linear') {
      // n/(x − a)² = A/(x − a) + B/(x − a)²: n = A(x − a) + B, so B = n and A = 0
      const a = ctx.int(1, 4);
      const n = ctx.int(2, 5);
      return {
        templateId: template,
        problemText: `Decompose: $\\frac{${n}}{(x - ${a})^2} = \\frac{A}{x - ${a}} + \\frac{B}{(x - ${a})^2}$\nWhat is $B$?`,
        answer: exact(n),
        explanation: `Multiply both sides by $(x-${a})^2$: $${n} = A(x-${a}) + B$. Set $x = ${a}$: $B = ${n}$. (Comparing $x$ coefficients gives $A = 0$.)`,
        hint: `Multiply both sides by $(x - ${a})^2$ and set $x = ${a}$.`,
      };
    }
    // 1/((x − a)(x² + 1)) = A/(x − a) + (Bx + C)/(x² + 1): A = 1/(a² + 1)
    const a = ctx.int(1, 3);
    const denom = a * a + 1;
    return {
      templateId: template,
      problemText: `Decompose: $\\frac{1}{(x - ${a})(x^2 + 1)} = \\frac{A}{x - ${a}} + \\frac{Bx + C}{x^2 + 1}$\nWhat is $A$? (enter a fraction)`,
      answer: exact(1 / denom),
      displayAnswer: `$${latexFrac(1, denom)}$`,
      explanation: `Multiply by $(x-${a})$ and set $x = ${a}$: $A = \\frac{1}{${a}^2 + 1} = ${latexFrac(1, denom)}$.`,
      hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Improper integrals
// ---------------------------------------------------------------------------

const IMPROPER_TEMPLATES = ['p-infinite', 'p-at-zero', 'exponential', 'p-threshold'] as const;
const IMPROPER_HINT = 'Replace the improper limit by a variable, integrate, and take the limit.';

export const improperIntegrals: GeneratorDef = {
  topicId: 'improper-integrals',
  version: 4,
  templates: IMPROPER_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(IMPROPER_TEMPLATES);
    if (template === 'p-infinite') {
      // I(b) = ∫_1^b x^{−p} dx = (b^{1−p} − 1)/(1 − p) (ln b for p = 1); the integral is lim I(b) = 1/(p − 1) for p > 1, else ∞
      const [n, d] = ctx.pick([[1, 2], [1, 1], [3, 2], [2, 1], [3, 1], [4, 1], [5, 2], [2, 3], [4, 3]] as const);
      const p = latexFraction(n, d);
      const f = `\\frac{1}{${powTex('x', n, d)}}`;
      const integral = `\\displaystyle\\int_1^{\\infty} ${f}\\,dx`;
      const I = n === d ? { ref: 'log(b)', tex: '\\ln(b)' } : partialPower('b', n, d, 'upper');
      const converges = n > d;
      const value = simplifyFraction(d, n - d);
      const valueTex = converges ? latexFraction(value.numerator, value.denominator) : '\\infty';
      return improper(template,
        `Let $I(b) = \\displaystyle\\int_1^{b} ${f}\\,dx$ for $b > 1$.\nFind $I(b)$, and the value of $${integral} = \\lim_{b\\to\\infty} I(b)$ (type ∞ if it diverges).`,
        onDomain(I.ref, 1), I.tex, 'b', converges ? d / (n - d) : Infinity, valueTex,
        [
          step(n === d ? '$\\int_1^b \\frac{dx}{x} = \\ln(b) - \\ln(1) = \\ln(b)$.' : `For $p = ${p} \\neq 1$: $\\int_1^b x^{-p}\\,dx = \\left[\\frac{x^{1-p}}{1-p}\\right]_1^b = ${I.tex}$.`),
          step(n === d ? '$\\ln(b) \\to \\infty$ as $b \\to \\infty$: the integral diverges.'
            : converges ? `Since $p > 1$, the exponent $1 - p$ is negative and $b^{1-p} \\to 0$: $I(b) \\to \\frac{1}{p - 1} = ${valueTex}$.`
              : `Since $p < 1$, the exponent $1 - p$ is positive and $b^{1-p} \\to \\infty$: the integral diverges.`),
        ]);
    }
    if (template === 'p-at-zero') {
      // I(a) = ∫_a^1 x^{−p} dx = (1 − a^{1−p})/(1 − p) (−ln a for p = 1); the integral is lim_{a→0+} I(a) = 1/(1 − p) for p < 1, else ∞
      const [n, d] = ctx.pick([[1, 3], [1, 2], [2, 3], [3, 4], [1, 4], [1, 1], [3, 2], [2, 1], [4, 3]] as const);
      const p = latexFraction(n, d);
      const f = `\\frac{1}{${powTex('x', n, d)}}`;
      const integral = `\\displaystyle\\int_0^{1} ${f}\\,dx`;
      const I = n === d ? { ref: '-log(a)', tex: '-\\ln(a)' } : partialPower('a', n, d, 'lower');
      const converges = n < d;
      const value = simplifyFraction(d, d - n);
      const valueTex = converges ? latexFraction(value.numerator, value.denominator) : '\\infty';
      return improper(template,
        `Let $I(a) = \\displaystyle\\int_a^{1} ${f}\\,dx$ for $0 < a < 1$.\nFind $I(a)$, and the value of $${integral} = \\lim_{a\\to 0^+} I(a)$ (type ∞ if it diverges).`,
        onDomain(I.ref, 0, false, 1), I.tex, 'a', converges ? d / (d - n) : Infinity, valueTex,
        [
          step(n === d ? '$\\int_a^1 \\frac{dx}{x} = \\ln(1) - \\ln(a) = -\\ln(a)$.' : `For $p = ${p} \\neq 1$: $\\int_a^1 x^{-p}\\,dx = \\left[\\frac{x^{1-p}}{1-p}\\right]_a^1 = ${I.tex}$.`),
          step(n === d ? '$-\\ln(a) \\to \\infty$ as $a \\to 0^+$: the integral diverges.'
            : converges ? `Since $p < 1$, the exponent $1 - p$ is positive and $a^{1-p} \\to 0$ as $a \\to 0^+$: $I(a) \\to \\frac{1}{1 - p} = ${valueTex}$.`
              : `Since $p > 1$, the exponent $1 - p$ is negative and $a^{1-p} \\to \\infty$ as $a \\to 0^+$: the integral diverges.`),
        ]);
    }
    if (template === 'exponential') {
      const c = ctx.int(1, 6);
      const k = ctx.int(1, 5);
      const cTex = c === 1 ? '' : `${c}`;
      const kTex = k === 1 ? '' : `${k}`;
      const ck = simplifyFraction(c, k);
      const ckTex = latexFraction(ck.numerator, ck.denominator);
      const coef = ckTex === '1' ? '' : ckTex;
      if (ctx.bool(0.7)) {
        // I(b) = ∫_0^b c e^{−kx} dx = (c/k)(1 − e^{−kb}) → c/k
        const e = `e^{-${kTex}x}`;
        return improper(template,
          `Let $I(b) = \\displaystyle\\int_0^{b} ${cTex}${e}\\,dx$ for $b > 0$.\nFind $I(b)$, and the value of $\\displaystyle\\int_0^{\\infty} ${cTex}${e}\\,dx = \\lim_{b\\to\\infty} I(b)$ (type ∞ if it diverges).`,
          onDomain(`(${c}/${k})*(1 - e^(-${k}*b))`, 0, false), `${coef}\\left(1 - e^{-${kTex}b}\\right)`, 'b', c / k, ckTex,
          [
            step(`$I(b) = \\left[-${overTex(e, c, k)}\\right]_0^b = ${coef}\\left(1 - e^{-${kTex}b}\\right)$.`),
            step(`$e^{-${kTex}b} \\to 0$ as $b \\to \\infty$, so $I(b) \\to ${ckTex}$.`),
          ]);
      }
      // I(b) = ∫_0^b c e^{kx} dx = (c/k)(e^{kb} − 1) → ∞
      const e = `e^{${kTex}x}`;
      return improper(template,
        `Let $I(b) = \\displaystyle\\int_0^{b} ${cTex}${e}\\,dx$ for $b > 0$.\nFind $I(b)$, and the value of $\\displaystyle\\int_0^{\\infty} ${cTex}${e}\\,dx = \\lim_{b\\to\\infty} I(b)$ (type ∞ if it diverges).`,
        onDomain(`(${c}/${k})*(e^(${k}*b) - 1)`, 0, false), `${coef}\\left(e^{${kTex}b} - 1\\right)`, 'b', Infinity, '\\infty',
        [
          step(`$I(b) = \\left[${overTex(e, c, k)}\\right]_0^b = ${coef}\\left(e^{${kTex}b} - 1\\right)$.`),
          step(`$e^{${kTex}b} \\to \\infty$ as $b \\to \\infty$: the integral diverges.`),
        ]);
    }
    // For which p does the p-integral converge? (all real p)
    if (ctx.bool()) {
      return {
        templateId: template,
        problemText: 'For which real $p$ does $\\displaystyle\\int_1^{\\infty} \\frac{1}{x^p}\\,dx$ converge?\n(Answer as an inequality in $p$, or in interval notation.)',
        answer: { kind: 'interval', variable: 'p', set: [{ lo: 1, hi: Infinity, loClosed: false, hiClosed: false }] },
        explanation: 'For $p \\neq 1$, $\\int_1^b x^{-p}\\,dx = \\frac{b^{1-p} - 1}{1-p}$, which has a finite limit exactly when $1 - p < 0$. For $p = 1$ it is $\\ln b \\to \\infty$. So the integral converges when $p > 1$ and diverges when $p \\leq 1$.',
        hint: 'Think about the antiderivative $\\frac{x^{1-p}}{1-p}$ and when the limit exists.',
      };
    }
    return {
      templateId: template,
      problemText: 'For which real $p$ does $\\displaystyle\\int_0^{1} \\frac{1}{x^p}\\,dx$ converge?\n(Answer as an inequality in $p$, or in interval notation.)',
      answer: { kind: 'interval', variable: 'p', set: [{ lo: -Infinity, hi: 1, loClosed: false, hiClosed: false }] },
      explanation: 'For $p \\leq 0$ the integrand is continuous on $[0, 1]$, so the integral is proper and converges. For $p > 0$, $p \\neq 1$: $\\int_a^1 x^{-p}\\,dx = \\frac{1 - a^{1-p}}{1-p}$, which has a finite limit as $a \\to 0^+$ exactly when $1 - p > 0$; for $p = 1$ it is $-\\ln a \\to \\infty$. So it converges exactly when $p < 1$.',
      hint: 'Consider $\\frac{x^{1-p}}{1-p}$ as $x \\to 0^+$.',
    };
  },
};

// ---------------------------------------------------------------------------
// Sequences
// ---------------------------------------------------------------------------

const SEQ_TEMPLATES = ['arithmetic-nth-term', 'geometric-nth-term', 'rational-limit', 'geometric-limit', 'power-limit', 'mct', 'monotonic'] as const;

export const sequences: GeneratorDef = {
  topicId: 'sequences',
  version: 4,
  templates: SEQ_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(SEQ_TEMPLATES);
    if (template === 'arithmetic-nth-term') {
      const a1 = ctx.int(1, 10);
      const d = ctx.int(2, 7);
      const n = ctx.int(5, 15);
      const answer = a1 + (n - 1) * d;
      return {
        templateId: template,
        problemText: `Find the $${n}$${ordinalSuffix(n)} term of the arithmetic sequence:\n$a_1 = ${a1}$, $d = ${d}$`,
        answer: exact(answer),
        explanation: `Use $a_n = a_1 + (n-1)d = ${a1} + (${n}-1)(${d}) = ${answer}$`,
        hint: 'Formula: $a_n = a_1 + (n-1)d$',
      };
    }
    if (template === 'geometric-nth-term') {
      const a1 = ctx.int(2, 5);
      const r = ctx.int(2, 3);
      const n = ctx.int(3, 6);
      const answer = a1 * Math.pow(r, n - 1);
      return {
        templateId: template,
        problemText: `Find the $${n}$${ordinalSuffix(n)} term of the geometric sequence:\n$a_1 = ${a1}$, $r = ${r}$`,
        answer: exact(answer),
        explanation: `Use $a_n = a_1 \\cdot r^{n-1} = ${a1} \\cdot ${r}^{${n - 1}} = ${answer}$`,
        hint: 'Formula: $a_n = a_1 \\cdot r^{n-1}$',
      };
    }
    if (template === 'rational-limit') {
      // (an + b)/(cn + d) → a/c
      const [a, b, c, d] = [ctx.int(1, 6), ctx.int(-5, 5), ctx.int(1, 6), ctx.int(-5, 5)];
      ctx.require(!(d <= -c && d % c === 0), 'nonZeroDenominator'); // cn + d ≠ 0 for every n ≥ 1
      const limit = simplifyFraction(a, c);
      const tex = latexFraction(limit.numerator, limit.denominator);
      const why = `Divide numerator and denominator by $n$: $a_n = \\frac{${perN(a, b)}}{${perN(c, d)}} \\to \\frac{${a}}{${c}}${tex === `\\frac{${a}}{${c}}` ? '' : ` = ${tex}`}$.`;
      return sequenceLimit(template, `\\frac{${latexPolynomial([[a, 'n'], [b, '']])}}{${latexPolynomial([[c, 'n'], [d, '']])}}`,
        a / c, tex, why, 'Divide the numerator and denominator by the highest power of $n$.');
    }
    if (template === 'geometric-limit') {
      // a_n = k + rⁿ: → k for |r| < 1, k + 1 for r = 1, ∞ for r > 1, no limit for r ≤ −1
      const [p, q] = ctx.pick([[1, 2], [2, 3], [-1, 2], [3, 4], [-2, 3], [1, 3], [-3, 4], [1, 1], [-1, 1], [3, 2], [2, 1], [-2, 1], [5, 4]] as const);
      const k = ctx.int(-4, 4);
      const r = p / q;
      const absR = latexFraction(Math.abs(p), q);
      const body = shifted(k, `${baseTex(p, q)}^n`);
      const hint = 'Compare $|r|$ with $1$, and check the cases $r = 1$ and $r = -1$ separately.';
      if (Math.abs(r) < 1) return sequenceLimit(template, body, k, `${k}`, `$|r| = ${absR} < 1$, so $r^n \\to 0$ and $a_n \\to ${k}$.`, hint);
      if (r === 1) return sequenceLimit(template, body, k + 1, `${k + 1}`, `$1^n = 1$ for every $n$: the sequence is constant, $a_n = ${k + 1}$.`, hint);
      if (r === -1) return sequenceLimit(template, body, null, null, `$(-1)^n$ alternates $-1, 1, -1, \\ldots$, so $a_n$ alternates between $${k - 1}$ and $${k + 1}$ and has no limit.`, hint);
      if (r > 1) return sequenceLimit(template, body, Infinity, '\\infty', `$r = ${absR} > 1$, so $r^n \\to \\infty$ and $a_n \\to \\infty$.`, hint);
      return sequenceLimit(template, body, null, null, `$r = -${absR} < -1$: $|r^n| \\to \\infty$ while the sign alternates, so $a_n$ has no limit (not even $\\pm\\infty$).`, hint);
    }
    if (template === 'power-limit') {
      // a_n = k ± c·n^e: → k for e < 0, ±∞ for e > 0
      const c = ctx.int(1, 9);
      const k = ctx.int(-5, 5);
      const sign = ctx.pick([1, -1] as const);
      const [n, d] = ctx.pick([[-2, 1], [-1, 1], [-1, 2], [-3, 2], [1, 2], [1, 1], [2, 1], [3, 2]] as const);
      const hint = 'What happens to a positive power of $n$, and to its reciprocal, as $n \\to \\infty$?';
      if (n < 0) {
        const term = `\\frac{${c}}{${powTex('n', -n, d)}}`;
        return sequenceLimit(template, shifted(k, term, sign), k, `${k}`,
          `$${powTex('n', -n, d)} \\to \\infty$, so $${term} \\to 0$ and $a_n \\to ${k}$.`, hint);
      }
      const term = `${c === 1 ? '' : c}${powTex('n', n, d)}`;
      return sequenceLimit(template, shifted(k, term, sign), sign * Infinity, sign > 0 ? '\\infty' : '-\\infty',
        `$${term} \\to \\infty$, so $a_n \\to ${sign > 0 ? '\\infty' : '-\\infty'}$.`, hint);
    }
    if (template === 'mct') {
      // kn/(n + c): increasing (a_{n+1} − a_n = kc/((n+c)(n+c+1)) > 0), bounded above by k, limit k
      const k = ctx.int(1, 6);
      const c = ctx.int(1, 5);
      const kTex = k === 1 ? '' : `${k}`;
      const body = `\\frac{${kTex}n}{n + ${c}}`;
      return {
        ...sequenceLimit(template, body, k, `${k}`,
          `The MCT guarantees a limit; it is $\\lim \\frac{${kTex}n}{n + ${c}} = \\lim \\frac{${k}}{1 + ${c}/n} = ${k}$.`,
          'A bounded, monotonic sequence converges. Then find the limit by dividing by $n$.',
          `The sequence $a_n = ${body}$ is increasing and bounded above by $${k}$, so by the Monotone Convergence Theorem it converges.\nFind its limit.`),
        solution: [
          theorem('Monotone Convergence Theorem', [
            ['$(a_n)$ is increasing', `$a_{n+1} - a_n = \\frac{${k * c}}{(n + ${c})(n + ${c + 1})} > 0$ for every $n \\geq 1$`],
            ['$(a_n)$ is bounded above', `$\\frac{${kTex}n}{n + ${c}} < \\frac{${k === 1 ? '' : k}(n + ${c})}{n + ${c}} = ${k}$ for every $n \\geq 1$`],
          ], '$(a_n)$ converges.'),
          step(`Its limit: $\\lim \\frac{${kTex}n}{n + ${c}} = \\lim \\frac{${k}}{1 + ${c}/n} = ${k}$. (A bound need not be the limit; here it is.)`),
        ],
      };
    }
    // monotonic: a_{n+1} − a_n, then increasing / decreasing / neither
    const family = ctx.pick(['c/n', 'c/n^2', 'n/(n+c)', 'cn^2', '(n-c)^2', 'n+c/n'] as const);
    const c = family === '(n-c)^2' ? ctx.int(2, 6) : family === 'n+c/n' ? ctx.int(3, 8) : ctx.int(1, 6);
    const cTex = c === 1 ? '' : `${c}`;
    const cases = {
      'c/n': { formula: `\\frac{${c}}{n}`, ref: `${c}/(n+1) - ${c}/n`, diff: `-\\frac{${c}}{n(n+1)}`, answer: 'decreasing',
        why: `$a_{n+1} - a_n = \\frac{${c}}{n+1} - \\frac{${c}}{n} = -\\frac{${c}}{n(n+1)} < 0$ for every $n \\geq 1$: decreasing.` },
      'c/n^2': { formula: `\\frac{${c}}{n^2}`, ref: `${c}/(n+1)^2 - ${c}/n^2`, diff: `-\\frac{${cTex}(2n+1)}{n^2(n+1)^2}`, answer: 'decreasing',
        why: `$a_{n+1} - a_n = \\frac{${c}}{(n+1)^2} - \\frac{${c}}{n^2} = -\\frac{${cTex}(2n+1)}{n^2(n+1)^2} < 0$ for every $n \\geq 1$: decreasing.` },
      'n/(n+c)': { formula: `\\frac{n}{n + ${c}}`, ref: `(n+1)/(n+1+${c}) - n/(n+${c})`, diff: `\\frac{${c}}{(n + ${c})(n + ${c + 1})}`, answer: 'increasing',
        why: `$a_{n+1} - a_n = \\frac{n+1}{n + ${c + 1}} - \\frac{n}{n + ${c}} = \\frac{${c}}{(n + ${c})(n + ${c + 1})} > 0$ for every $n \\geq 1$: increasing.` },
      'cn^2': { formula: `${cTex}n^2`, ref: `${c}*(n+1)^2 - ${c}*n^2`, diff: `${cTex}(2n + 1)`, answer: 'increasing',
        why: `$a_{n+1} - a_n = ${cTex}(n+1)^2 - ${cTex}n^2 = ${cTex}(2n + 1) > 0$ for every $n \\geq 1$: increasing.` },
      '(n-c)^2': { formula: `(n - ${c})^2`, ref: `(n+1-${c})^2 - (n-${c})^2`, diff: `2n + 1 - ${2 * c}`, answer: 'neither',
        why: `$a_{n+1} - a_n = 2n + 1 - ${2 * c}$: negative at $n = 1$ ($${3 - 2 * c}$) and positive for $n \\geq ${c}$. The terms fall and then rise, so the sequence is neither increasing nor decreasing.` },
      'n+c/n': { formula: `n + \\frac{${c}}{n}`, ref: `(n+1) + ${c}/(n+1) - n - ${c}/n`, diff: `1 - \\frac{${c}}{n(n+1)}`, answer: 'neither',
        why: `$a_{n+1} - a_n = 1 - \\frac{${c}}{n(n+1)}$: at $n = 1$ it is $1 - \\frac{${c}}{2} < 0$, and it is positive once $n(n+1) > ${c}$. The terms fall and then rise, so the sequence is neither increasing nor decreasing.` },
    }[family];
    return {
      templateId: template,
      problemText: `Let $a_n = ${cases.formula}$ for $n \\geq 1$.\nFind $a_{n+1} - a_n$ (as an expression in $n$), and say whether the sequence is increasing, decreasing, or neither.`,
      answer: {
        kind: 'multipart',
        parts: [
          { label: 'a(n+1) − a(n)', spec: onDomain(cases.ref, 1) },
          { label: 'Increasing, decreasing or neither', spec: choice(['increasing', 'decreasing', 'neither'], cases.answer) },
        ],
      },
      displayAnswer: `$a_{n+1} - a_n = ${cases.diff}$; ${cases.answer}`,
      explanation: cases.why,
      hint: 'Simplify $a_{n+1} - a_n$ and look at its sign for every $n \\geq 1$.',
    };
  },
};

// ---------------------------------------------------------------------------
// Series convergence
// ---------------------------------------------------------------------------

const SERIES_TEMPLATES = ['geometric', 'p-series', 'ratio-test', 'nth-term', 'alternating', 'integral-test'] as const;

const NTH_TERM_TEST = '$n$th-term test for divergence';
const NTH_TERM_HYPOTHESIS = '$\\lim_{n\\to\\infty} a_n \\neq 0$, or the limit does not exist';
const VERDICT_PART = 'Converges or diverges';
const NTH_TERM_PART = 'What the test concludes';
const ALTERNATING_PART = 'Absolutely, conditionally, or diverges';

/** (ln 2)^e for a rational exponent e = n/d > 0, as LaTeX. */
const ln2Power = (n: number, d: number): string => {
  const e = simplifyFraction(n, d);
  if (e.denominator === 1) return e.numerator === 1 ? '\\ln 2' : `(\\ln 2)^{${e.numerator}}`;
  if (e.numerator === 1 && e.denominator === 2) return '\\sqrt{\\ln 2}';
  return `(\\ln 2)^{${e.numerator}/${e.denominator}}`;
};

export const seriesConvergence: GeneratorDef = {
  topicId: 'series-convergence',
  version: 5,
  templates: SERIES_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(SERIES_TEMPLATES);
    /** A typed quantity (or several) and a typed verdict, graded together. */
    const decided = (text: string, quantities: AnswerPartSpec[], verdictSpec: AnswerSpec, display: string,
      explanation: string, hint: string, solution: SolutionStep[], verdictLabel = VERDICT_PART): Draft => ({
      templateId: template, problemText: text,
      answer: { kind: 'multipart', parts: [...quantities, { label: verdictLabel, spec: verdictSpec }] },
      displayAnswer: display, explanation, hint, solution,
    });
    if (template === 'geometric') {
      // Σ_{n≥0} a rⁿ = a/(1 − r) for |r| < 1; diverges for |r| ≥ 1
      const [p, q] = ctx.pick([[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [-1, 2], [-1, 3], [-2, 3], [3, 2], [2, 1], [5, 4], [-3, 2], [-1, 1]] as const);
      const a = ctx.int(1, 5);
      const r = latexFraction(p, q);
      const absR = latexFraction(Math.abs(p), q);
      const converges = Math.abs(p) < q;
      const sum = simplifyFraction(a * q, q - p);
      const tex = latexFraction(sum.numerator, sum.denominator);
      const form: [string, string] = ['The series is $\\sum_{n=0}^{\\infty} ar^n$ with $a \\neq 0$', `$a = ${a}$ and $r = ${r}$`];
      // "5 \\cdot 2^n", never "52^n"
      const text = `Consider $\\displaystyle\\sum_{n=0}^{\\infty} ${a === 1 ? '' : `${a} \\cdot `}${baseTex(p, q)}^n$.\nFind its common ratio $r$, say whether it converges or diverges, and if it converges give its sum.`;
      const hint = 'A geometric series $\\sum_{n=0}^{\\infty} ar^n$ converges exactly when $|r| < 1$, to $\\frac{a}{1-r}$.';
      const sumText = `\\frac{${a}}{1 - ${p < 0 ? `(${r})` : r}} = ${tex}`;
      return {
        templateId: template,
        problemText: text,
        answer: {
          kind: 'multipart',
          parts: [
            { label: 'Common ratio r', spec: exact(p / q) },
            { label: VERDICT_PART, spec: verdictChoice(converges) },
            { label: 'Sum', spec: converges ? exact((a * q) / (q - p)) : null, when: { part: 1, equals: 'converges' } },
          ],
        },
        displayAnswer: converges ? `$r = ${r}$; converges, to $${tex}$` : `$r = ${r}$; diverges`,
        explanation: converges
          ? `Geometric with $a = ${a}$ and $r = ${r}$, $|r| < 1$: the sum is $\\frac{a}{1 - r} = ${sumText}$.`
          : `Geometric with $r = ${r}$ and $|r| ${Math.abs(p) === q ? '=' : '>'} 1$: the terms do not tend to $0$, so the series diverges.`,
        hint,
        solution: [converges
          ? theorem('Geometric series test', [form, ['$|r| < 1$', `$|r| = ${absR} < 1$`]], `The series converges, to $\\frac{a}{1 - r} = ${sumText}$.`)
          : theorem('Geometric series test', [form, ['$|r| \\geq 1$', `$|r| = ${absR} ${Math.abs(p) === q ? '=' : '>'} 1$`]], 'The terms $ar^n$ do not tend to $0$, so the series diverges.')],
      };
    }
    if (template === 'p-series') {
      const [n, d] = ctx.pick([[1, 2], [1, 1], [3, 2], [2, 1], [3, 1], [4, 3], [2, 3], [5, 2], [3, 4], [5, 4]] as const);
      const c = ctx.int(1, 5);
      const converges = n > d;
      const pTex = latexFraction(n, d);
      const pow = powTex('n', n, d);
      const outcome = converges ? 'converges' : 'diverges';
      return decided(
        `Consider $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{${c}}{${pow}}$.\nWrite it as a multiple of $\\sum \\frac{1}{n^p}$: what is $p$? Does the series converge or diverge?`,
        [{ label: 'p', spec: exact(n / d) }], verdictChoice(converges), `$p = ${pTex}$; ${outcome}`,
        `This is ${c === 1 ? 'a' : `$${c}$ times a`} $p$-series with $p = ${pTex}$, which converges exactly when $p > 1$. Here $p ${converges ? '>' : '\\leq'} 1$, so it ${outcome}.`,
        'Identify $p$ in $\\sum \\frac{1}{n^p}$; a constant factor does not change convergence.',
        [
          ...(c === 1 ? [] : [step(`Factor out the constant: $\\sum_{n=1}^{\\infty} \\frac{${c}}{${pow}} = ${c}\\sum_{n=1}^{\\infty} \\frac{1}{${pow}}$.`)]),
          theorem('$p$-series test', [
            ['The series is $\\sum_{n=1}^{\\infty} \\frac{1}{n^p}$ for a constant $p$', `$\\frac{1}{${pow}}$ has $p = ${pTex}$`],
            [converges ? '$p > 1$' : '$p \\leq 1$', `$p = ${pTex} ${converges ? '>' : n === d ? '=' : '<'} 1$`],
          ], `$\\sum_{n=1}^{\\infty} \\frac{1}{${pow}}$ ${outcome}.`),
          ...(c === 1 ? [] : [step(`A nonzero constant multiple of a series converges exactly when the series does, so the given series ${outcome}.`)]),
        ]);
    }
    if (template === 'ratio-test') {
      const c = ctx.int(2, 5);
      const k = ctx.int(1, 3);
      const family = ctx.pick(['poly/exp', 'exp/fact', 'fact/exp', 'exp/poly', 'fact/power'] as const);
      const f = {
        'poly/exp': { term: `\\frac{${latexPower('n', k)}}{${c}^n}`, ratio: `${powOf('\\frac{n+1}{n}', k)} \\cdot \\frac{1}{${c}}`, L: `\\frac{1}{${c}}`, value: 1 / c, compare: `$L = \\frac{1}{${c}} < 1$`, converges: true },
        'exp/fact': { term: `\\frac{${c}^n}{n!}`, ratio: `\\frac{${c}}{n+1}`, L: '0', value: 0, compare: '$L = 0 < 1$', converges: true },
        'fact/exp': { term: `\\frac{n!}{${c}^n}`, ratio: `\\frac{n+1}{${c}}`, L: '\\infty', value: Infinity, compare: '$L = \\infty$', converges: false },
        'exp/poly': { term: `\\frac{${c}^n}{${latexPower('n', k)}}`, ratio: `${c} \\cdot ${powOf('\\frac{n}{n+1}', k)}`, L: `${c}`, value: c, compare: `$L = ${c} > 1$`, converges: false },
        'fact/power': { term: '\\frac{n!}{n^n}', ratio: '\\frac{(n+1)!}{(n+1)^{n+1}} \\cdot \\frac{n^n}{n!} = \\left(\\frac{n}{n+1}\\right)^n = \\frac{1}{\\left(1 + \\frac{1}{n}\\right)^n}', L: '\\frac{1}{e}', value: Math.exp(-1), compare: '$L = \\frac{1}{e} < 1$, since $e > 1$', converges: true },
      }[family];
      return decided(
        `Use the Ratio Test on $\\displaystyle\\sum_{n=1}^{\\infty} ${f.term}$.\nFind $L = \\lim_{n\\to\\infty} \\left|\\frac{a_{n+1}}{a_n}\\right|$ (type ∞ if it is infinite). Does the series converge or diverge?`,
        [{ label: 'L', spec: limitOf(f.value) }], verdictChoice(f.converges), `$L = ${f.L}$; ${f.converges ? 'converges' : 'diverges'}`,
        `$\\lim_{n\\to\\infty} \\left|\\frac{a_{n+1}}{a_n}\\right| = ${f.L}$, which is ${f.converges ? '$< 1$: the series converges' : '$> 1$: the series diverges'}.`,
        'Compute $L = \\lim \\left|\\frac{a_{n+1}}{a_n}\\right|$: $L < 1$ converges, $L > 1$ diverges.',
        [theorem('Ratio Test', [
          ['$a_n \\neq 0$ for every $n$', `$a_n = ${f.term} > 0$ for every $n \\geq 1$`],
          ['$L = \\lim_{n\\to\\infty} \\left|\\frac{a_{n+1}}{a_n}\\right|$ exists (possibly $\\infty$)', `$\\left|\\frac{a_{n+1}}{a_n}\\right| = ${f.ratio} \\to ${f.L}$`],
          [f.converges ? '$L < 1$' : '$L > 1$ (including $L = \\infty$)', f.compare],
        ], f.converges ? 'The series converges (absolutely).' : 'The series diverges.')]);
    }
    if (template === 'nth-term') {
      const ask = 'Find $\\lim_{n\\to\\infty} a_n$, and what the $n$th-term test concludes: diverges, or inconclusive.';
      const conclusion = (inconclusive: boolean): AnswerSpec => choice(['diverges', 'inconclusive'], inconclusive ? 'inconclusive' : 'diverges');
      if (ctx.bool(0.25)) {
        // a_n → 0: the test says nothing (whether the series converges is a different question)
        const c = ctx.int(1, 5);
        const d = ctx.int(0, 5);
        const squared = ctx.bool();
        const den = latexPolynomial([[1, squared ? 'n^2' : 'n'], [d, '']]);
        const term = `\\frac{${c}}{${den}}`;
        return decided(`Apply the $n$th-term test to $\\displaystyle\\sum_{n=1}^{\\infty} ${term}$.\n${ask}`,
          [{ label: 'Limit of the terms', spec: limitOf(0) }], conclusion(true), '$\\lim a_n = 0$; the test is inconclusive',
          `$\\lim_{n\\to\\infty} a_n = 0$, so the $n$th-term test is inconclusive: it can only show divergence.`,
          'The $n$th-term test concludes only when $\\lim a_n \\neq 0$.',
          [
            step(`$${den} \\to \\infty$, so $a_n = ${term} \\to 0$.`),
            step('The $n$th-term test needs $\\lim a_n \\neq 0$ (or no limit) to conclude anything; with $\\lim a_n = 0$ it is inconclusive.'),
            step(squared
              ? `(By comparison with the $p$-series $\\sum \\frac{1}{n^2}$ this series in fact converges, but the $n$th-term test cannot show that.)`
              : `(By limit comparison with $\\sum \\frac{1}{n}$ this series in fact diverges, but the $n$th-term test cannot show that.)`),
          ], NTH_TERM_PART);
      }
      const [a, b, c, d] = [ctx.int(1, 5), ctx.int(0, 5), ctx.int(1, 5), ctx.int(1, 5)];
      const limit = simplifyFraction(a, c);
      const limitTex = latexFraction(limit.numerator, limit.denominator);
      const term = `\\frac{${latexPolynomial([[a, 'n'], [b, '']])}}{${latexPolynomial([[c, 'n'], [d, '']])}}`;
      return decided(`Apply the $n$th-term test to $\\displaystyle\\sum_{n=1}^{\\infty} ${term}$.\n${ask}`,
        [{ label: 'Limit of the terms', spec: limitOf(a / c) }], conclusion(false), `$\\lim a_n = ${limitTex}$; diverges`,
        `$\\lim_{n\\to\\infty} a_n = ${limitTex} \\neq 0$, so by the $n$th-term test the series diverges.`,
        'If $\\lim a_n \\neq 0$, the series cannot converge.',
        [theorem(NTH_TERM_TEST, [
          [NTH_TERM_HYPOTHESIS, `dividing the numerator and denominator by $n$, $a_n = \\frac{${perN(a, b)}}{${perN(c, d)}} \\to ${limitTex} \\neq 0$`],
        ], 'The series diverges.')], NTH_TERM_PART);
    }
    if (template === 'integral-test') {
      // Σ_{n≥2} 1/(n (ln n)^p): I(b) = ∫_2^b dx/(x (ln x)^p) = ((ln b)^{1−p} − (ln 2)^{1−p})/(1 − p) (ln ln b − ln ln 2 for p = 1)
      const [pn, pd] = ctx.pick([[1, 3], [1, 2], [2, 3], [1, 1], [4, 3], [3, 2], [2, 1], [3, 1]] as const);
      const converges = pn > pd;
      const pTex = latexFraction(pn, pd);
      const lnPow = (v: string) => (pn === pd ? `\\ln(${v})` : pn === 1 && pd === 2 ? `\\sqrt{\\ln(${v})}` : `(\\ln(${v}))^{${pd === 1 ? pn : `${pn}/${pd}`}}`);
      const fx = `\\frac{1}{x\\,${lnPow('x')}}`;
      const e = simplifyFraction(pd - pn, pd); // 1 − p
      const eTex = latexFraction(e.numerator, e.denominator);
      const coef = simplifyFraction(pd, pd - pn); // 1/(1 − p)
      const I = pn === pd
        ? { ref: 'log(log(b)) - log(log(2))', tex: '\\ln(\\ln b) - \\ln(\\ln 2)' }
        : {
          ref: `((log(b))^(${pd - pn}/${pd}) - (log(2))^(${pd - pn}/${pd}))/((${pd - pn})/${pd})`,
          tex: converges
            ? `${coefTex(pd, pn - pd)}\\left((\\ln 2)^{${eTex}} - (\\ln b)^{${eTex}}\\right)`
            : `${coefTex(coef.numerator, coef.denominator)}\\left((\\ln b)^{${eTex}} - (\\ln 2)^{${eTex}}\\right)`,
        };
      const coefConv = simplifyFraction(pd, pn - pd);
      const valueTex = converges
        ? `\\frac{${coefConv.numerator}}{${coefConv.denominator === 1 ? '' : coefConv.denominator}${ln2Power(pn - pd, pd)}}`
        : '\\infty';
      const value = converges ? Math.pow(Math.LN2, 1 - pn / pd) / (pn / pd - 1) : Infinity;
      const outcome = converges ? 'converges' : 'diverges';
      return {
        templateId: template,
        problemText: `Use the Integral Test on $\\displaystyle\\sum_{n=2}^{\\infty} \\frac{1}{n\\,${lnPow('n')}}$.\nWith $f(x) = ${fx}$, find $I(b) = \\int_2^b f(x)\\,dx$, the value of $\\int_2^{\\infty} f(x)\\,dx$ (type ∞ if it diverges), and whether the series converges or diverges.`,
        answer: {
          kind: 'multipart',
          parts: [
            { label: 'I(b)', spec: onDomain(I.ref, 2) },
            { label: 'Value of the integral', spec: limitOf(value) },
            { label: VERDICT_PART, spec: verdictChoice(converges) },
          ],
        },
        displayAnswer: `$I(b) = ${I.tex}$; the integral is $${valueTex}$; the series ${outcome}`,
        explanation: `$f(x) = ${fx}$ is positive, continuous and decreasing on $[2, \\infty)$. With $u = \\ln(x)$, $I(b) = ${I.tex}$, which tends to $${valueTex}$ since $p = ${pTex} ${converges ? '>' : '\\leq'} 1$. By the Integral Test the series ${outcome}.`,
        hint: 'Check that $f(x)$ is positive, continuous and decreasing, then substitute $u = \\ln(x)$ in $\\int_2^b f(x)\\,dx$.',
        solution: [
          theorem('Integral Test', [
            [`$f(x) = ${fx}$ is positive on $[2, \\infty)$`, 'for $x \\geq 2$, $x > 0$ and $\\ln(x) \\geq \\ln(2) > 0$'],
            ['$f$ is continuous on $[2, \\infty)$', 'its denominator is continuous and nonzero there'],
            ['$f$ is decreasing on $[2, \\infty)$', `$x$ and $${lnPow('x')}$ are positive and increasing there, so their product increases and $f$ decreases`],
          ], '$\\sum_{n=2}^{\\infty} f(n)$ and $\\int_2^{\\infty} f(x)\\,dx$ both converge or both diverge.'),
          step(pn === pd
            ? 'Substitute $u = \\ln(x)$, $du = \\frac{dx}{x}$: $I(b) = \\int_{\\ln 2}^{\\ln b} \\frac{du}{u} = \\ln(\\ln b) - \\ln(\\ln 2)$.'
            : `Substitute $u = \\ln(x)$, $du = \\frac{dx}{x}$: $I(b) = \\int_{\\ln 2}^{\\ln b} u^{-${pTex}}\\,du = \\left[\\frac{u^{${eTex}}}{${eTex}}\\right]_{\\ln 2}^{\\ln b} = ${I.tex}$.`),
          step(converges
            ? `Since $p = ${pTex} > 1$, the exponent $1 - p = ${eTex}$ is negative, so $(\\ln b)^{${eTex}} \\to 0$ as $b \\to \\infty$ and $I(b) \\to ${valueTex}$: the integral converges.`
            : `Since $p = ${pTex} \\leq 1$, $I(b) \\to \\infty$ as $b \\to \\infty$: the integral diverges.`),
          step(`So the series ${outcome}. (The Integral Test gives only the verdict: the sum of the series is not the value of the integral.)`),
        ],
      };
    }
    // alternating series: b_n = |a_n|, then absolutely / conditionally / diverges
    const verdicts = ['converges absolutely', 'converges conditionally', 'diverges'];
    if (ctx.bool(0.7)) {
      const [n, d] = ctx.pick([[1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [1, 3]] as const);
      const pow = powTex('n', n, d);
      const pTex = latexFraction(n, d);
      const absolute = n > d;
      const answer = absolute ? verdicts[0] : verdicts[1];
      return decided(
        `Consider the alternating series $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{${pow}}$.\nFind $b_n = |a_n|$ (as an expression in $n$), and say whether the series converges absolutely, converges conditionally, or diverges.`,
        [{ label: 'b(n) = |a(n)|', spec: onDomain(`1/n^(${n}/${d})`, 1) }], choice(verdicts, answer), `$b_n = \\frac{1}{${pow}}$; ${answer}`,
        `Alternating Series Test: $b_n = \\frac{1}{${pow}}$ is decreasing and $b_n \\to 0$, so the series converges. ${absolute ? `It converges absolutely: $\\sum b_n$ is a $p$-series with $p = ${pTex} > 1$.` : `Only conditionally: $\\sum b_n$ is a $p$-series with $p = ${pTex} \\leq 1$, which diverges.`}`,
        'Check the Alternating Series Test (is $b_n$ decreasing with limit $0$?), then test $\\sum b_n$.',
        [
          theorem('Alternating Series Test', [
            ['The series is $\\sum (-1)^{n+1} b_n$ with $b_n > 0$', `$b_n = \\frac{1}{${pow}} > 0$ for $n \\geq 1$`],
            ['$b_n$ is decreasing', `$${n === d ? 'n + 1 > n' : `(n+1)^{${pTex}} > n^{${pTex}}`}$, so $b_{n+1} < b_n$`],
            ['$b_n \\to 0$', `$${pow} \\to \\infty$, so $b_n \\to 0$`],
          ], 'The series converges.'),
          step(absolute
            ? `The convergence is absolute: $\\sum |a_n| = \\sum \\frac{1}{${pow}}$ is a $p$-series with $p = ${pTex} > 1$.`
            : `The convergence is only conditional: $\\sum |a_n| = \\sum \\frac{1}{${pow}}$ is a $p$-series with $p = ${pTex} \\leq 1$, which diverges.`),
        ], ALTERNATING_PART);
    }
    const c = ctx.int(1, 6);
    return decided(
      `Consider the alternating series $\\displaystyle\\sum_{n=1}^{\\infty} (-1)^n \\frac{n}{n + ${c}}$.\nFind $b_n = |a_n|$ (as an expression in $n$), and say whether the series converges absolutely, converges conditionally, or diverges.`,
      [{ label: 'b(n) = |a(n)|', spec: onDomain(`n/(n+${c})`, 1) }], choice(verdicts, 'diverges'), `$b_n = \\frac{n}{n + ${c}}$; diverges`,
      `$b_n = \\frac{n}{n + ${c}} \\to 1$, so the terms $(-1)^n \\frac{n}{n + ${c}}$ do not tend to $0$: by the $n$th-term test the series diverges. (The Alternating Series Test does not apply, since $b_n \\not\\to 0$.)`,
      'Before any other test, check whether the terms tend to $0$.',
      [
        step(`The Alternating Series Test does not apply: it needs $b_n \\to 0$, and $b_n = \\frac{n}{n + ${c}} \\to 1$.`),
        theorem(NTH_TERM_TEST, [
          [NTH_TERM_HYPOTHESIS, `$|a_n| = \\frac{n}{n + ${c}} \\to 1$ while the sign alternates, so $a_n$ has no limit`],
        ], 'The series diverges.'),
      ], ALTERNATING_PART);
  },
};

// ---------------------------------------------------------------------------
// Power series: radius of convergence
// ---------------------------------------------------------------------------

const POWER_TEMPLATES = ['scaled-geometric', 'polynomial-coefficient', 'factorial', 'shifted-centre'] as const;
const R_HINT = 'Use the Ratio Test: if $\\left|\\frac{a_{n+1}}{a_n}\\right| \\to L$, then $R = \\frac{1}{L}$ ($R = \\infty$ if $L = 0$, $R = 0$ if $L = \\infty$).';

export const powerSeries: GeneratorDef = {
  topicId: 'power-series',
  version: 4,
  templates: POWER_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(POWER_TEMPLATES);
    const c = ctx.int(2, 5);
    const k = ctx.int(1, 3);
    const q = (series: string, R: number, rTex: string, why: string, solution: SolutionStep[]): Draft => ({
      templateId: template,
      problemText: `Find the radius of convergence $R$ of\n$\\displaystyle\\sum_{n=0}^{\\infty} ${series}$`,
      answer: radius(R),
      displayAnswer: `$R = ${rTex}$`,
      explanation: why,
      solution,
      hint: R_HINT,
    });
    /** Σ wⁿ converges exactly when |w| < 1. */
    const geometric = (rewrite: string, w: string, radiusFrom: string) =>
      theorem('Geometric series test', [['The series is $\\sum_{n=0}^{\\infty} w^n$', `$${rewrite}$, so $w = ${w}$`]],
        `It converges exactly when $|w| < 1$: ${radiusFrom}.`);
    /** The ratio test on the coefficients: R = 1/L. */
    const ratio = (nonzero: string, ratioTex: string, L: string, conclusion: string) =>
      theorem('Ratio Test for the radius of convergence', [
        ['$a_n \\neq 0$ for every large $n$', nonzero],
        ['$L = \\lim_{n\\to\\infty} \\left|\\frac{a_{n+1}}{a_n}\\right|$ exists (possibly $0$ or $\\infty$)', `$\\left|\\frac{a_{n+1}}{a_n}\\right| = ${ratioTex} \\to ${L}$`],
      ], conclusion);
    if (template === 'scaled-geometric') {
      return ctx.bool()
        ? q(`\\frac{x^n}{${c}^n}`, c, `${c}`, `This is $\\sum \\left(\\frac{x}{${c}}\\right)^n$, a geometric series that converges exactly when $\\left|\\frac{x}{${c}}\\right| < 1$, i.e. $|x| < ${c}$: $R = ${c}$.`,
          [geometric(`\\frac{x^n}{${c}^n} = \\left(\\frac{x}{${c}}\\right)^n`, `\\frac{x}{${c}}`, `$\\left|\\frac{x}{${c}}\\right| < 1$, i.e. $|x| < ${c}$, so $R = ${c}$`)])
        : q(`${c}^n x^n`, 1 / c, `\\frac{1}{${c}}`, `This is $\\sum (${c}x)^n$, geometric, converging exactly when $|${c}x| < 1$, i.e. $|x| < \\frac{1}{${c}}$: $R = \\frac{1}{${c}}$.`,
          [geometric(`${c}^n x^n = (${c}x)^n`, `${c}x`, `$|${c}x| < 1$, i.e. $|x| < \\frac{1}{${c}}$, so $R = \\frac{1}{${c}}$`)]);
    }
    if (template === 'polynomial-coefficient') {
      const f = ctx.pick(['n^k', 'n^k c^n', 'n^k/c^n', '1/((n+1)c^n)', 'c^n/(n+1)^k'] as const);
      const nk = latexPower('n', k);
      const up = powOf('\\frac{n+1}{n}', k);
      if (f === 'n^k') {
        return q(`${nk} x^n`, 1, '1', `$\\left|\\frac{a_{n+1}}{a_n}\\right| = ${up} \\to 1$, so $R = 1$.`,
          [ratio(`$a_n = ${nk} > 0$ for $n \\geq 1$`, up, '1', '$R = \\frac{1}{L} = 1$.')]);
      }
      if (f === 'n^k c^n') {
        return q(`${c}^n \\cdot ${nk}\\, x^n`, 1 / c, `\\frac{1}{${c}}`, `$\\left|\\frac{a_{n+1}}{a_n}\\right| = ${c} \\cdot ${up} \\to ${c}$, so $R = \\frac{1}{${c}}$.`,
          [ratio(`$a_n = ${c}^n \\cdot ${nk} > 0$ for $n \\geq 1$`, `${c} \\cdot ${up}`, `${c}`, `$R = \\frac{1}{L} = \\frac{1}{${c}}$.`)]);
      }
      if (f === 'n^k/c^n') {
        return q(`\\frac{${nk}}{${c}^n} x^n`, c, `${c}`, `$\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{1}{${c}} \\cdot ${up} \\to \\frac{1}{${c}}$, so $R = ${c}$.`,
          [ratio(`$a_n = \\frac{${nk}}{${c}^n} > 0$ for $n \\geq 1$`, `\\frac{1}{${c}} \\cdot ${up}`, `\\frac{1}{${c}}`, `$R = \\frac{1}{L} = ${c}$.`)]);
      }
      if (f === '1/((n+1)c^n)') {
        return q(`\\frac{x^n}{(n+1)${c}^n}`, c, `${c}`, `$\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{n+1}{${c}(n+2)} \\to \\frac{1}{${c}}$, so $R = ${c}$.`,
          [ratio(`$a_n = \\frac{1}{(n+1)${c}^n} > 0$`, `\\frac{n+1}{${c}(n+2)}`, `\\frac{1}{${c}}`, `$R = \\frac{1}{L} = ${c}$.`)]);
      }
      const denominator = `(n+1)${k === 1 ? '' : `^{${k}}`}`;
      const down = powOf('\\frac{n+1}{n+2}', k);
      return q(`\\frac{${c}^n x^n}{${denominator}}`, 1 / c, `\\frac{1}{${c}}`, `$\\left|\\frac{a_{n+1}}{a_n}\\right| = ${c} \\cdot ${down} \\to ${c}$, so $R = \\frac{1}{${c}}$.`,
        [ratio(`$a_n = \\frac{${c}^n}{${denominator}} > 0$`, `${c} \\cdot ${down}`, `${c}`, `$R = \\frac{1}{L} = \\frac{1}{${c}}$.`)]);
    }
    if (template === 'factorial') {
      const f = ctx.pick(['c^n/n!', 'n!/c^n', '(n!)^2/(2n)!', '(2n)!/(n!)^2'] as const);
      const b = ctx.int(1, 5);
      if (f === 'c^n/n!') {
        const series = b === 1 ? '\\frac{x^n}{n!}' : `\\frac{${b}^n x^n}{n!}`;
        const coef = b === 1 ? '\\frac{1}{n!}' : `\\frac{${b}^n}{n!}`;
        const fn = b === 1 ? 'e^x' : `e^{${b}x}`;
        return q(series, Infinity, '\\infty', `$\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{${b}}{n+1} \\to 0$, so the series converges for every $x$: $R = \\infty$ (it is the series of $${fn}$).`,
          [ratio(`$a_n = ${coef} > 0$`, `\\frac{${b}}{n+1}`, '0', `$L = 0$, so the series converges for every $x$: $R = \\infty$ (it is the series of $${fn}$).`)]);
      }
      if (f === 'n!/c^n') {
        const series = b === 1 ? 'n!\\, x^n' : `\\frac{n!}{${b}^n} x^n`;
        const coef = b === 1 ? 'n!' : `\\frac{n!}{${b}^n}`;
        const r = b === 1 ? 'n + 1' : `\\frac{n + 1}{${b}}`;
        return q(series, 0, '0', `$\\left|\\frac{a_{n+1}}{a_n}\\right| = ${r} \\to \\infty$, so the series converges only at $x = 0$: $R = 0$.`,
          [ratio(`$a_n = ${coef} > 0$`, r, '\\infty', '$L = \\infty$, so the series converges only at $x = 0$: $R = 0$.')]);
      }
      if (f === '(n!)^2/(2n)!') {
        return q('\\frac{(n!)^2}{(2n)!} x^n', 4, '4', '$\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{(n+1)^2}{(2n+2)(2n+1)} = \\frac{n+1}{2(2n+1)} \\to \\frac{1}{4}$, so $R = 4$.',
          [ratio('$a_n = \\frac{(n!)^2}{(2n)!} > 0$', '\\frac{(n+1)^2}{(2n+2)(2n+1)} = \\frac{n+1}{2(2n+1)}', '\\frac{1}{4}', '$R = \\frac{1}{L} = 4$.')]);
      }
      return q('\\frac{(2n)!}{(n!)^2} x^n', 1 / 4, '\\frac{1}{4}', '$\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{(2n+2)(2n+1)}{(n+1)^2} = \\frac{2(2n+1)}{n+1} \\to 4$, so $R = \\frac{1}{4}$.',
        [ratio('$a_n = \\frac{(2n)!}{(n!)^2} > 0$', '\\frac{(2n+2)(2n+1)}{(n+1)^2} = \\frac{2(2n+1)}{n+1}', '4', '$R = \\frac{1}{L} = \\frac{1}{4}$.')]);
    }
    // shifted centre: Σ (x − a)ⁿ / cⁿ, R = c (the centre does not change the radius)
    const a = ctx.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    const shift = a > 0 ? `x - ${a}` : `x + ${-a}`;
    return q(`\\frac{(${shift})^n}{${c}^n}`, c, `${c}`, `This is geometric in $\\frac{${shift}}{${c}}$: it converges exactly when $|${shift}| < ${c}$, so $R = ${c}$ (centred at $x = ${a}$).`,
      [geometric(`\\frac{(${shift})^n}{${c}^n} = \\left(\\frac{${shift}}{${c}}\\right)^n`, `\\frac{${shift}}{${c}}`,
        `$|${shift}| < ${c}$, an interval of radius $${c}$ centred at $x = ${a}$, so $R = ${c}$`)]);
  },
};

// ---------------------------------------------------------------------------
// Taylor and Maclaurin series
// ---------------------------------------------------------------------------

const TAYLOR_TEMPLATES = ['maclaurin-exp', 'maclaurin-trig', 'maclaurin-geometric', 'coefficient', 'lagrange-bound', 'alternating-remainder'] as const;

/** Polynomial Σ (nₖ/dₖ) x^k as a parser reference and as LaTeX. */
const polynomial = (coefs: [number, number, number][]): { reference: string; tex: string } => ({
  reference: coefs.map(([n, d, k]) => `(${n}/${d})*x^${k}`).join(' + '),
  tex: latexRationalSum(coefs.map(([n, d, k]) => [n, d, k === 0 ? '' : latexPower('x', k)] as [number, number, string])),
});

export const taylorMaclaurin: GeneratorDef = {
  topicId: 'taylor-maclaurin',
  version: 3,
  templates: TAYLOR_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(TAYLOR_TEMPLATES);
    if (template === 'maclaurin-exp') {
      // e^{cx} = Σ cᵏ xᵏ / k!
      const c = ctx.pick([1, 2, -1, 3, -2]);
      const degree = ctx.int(2, 4);
      const p = polynomial(Array.from({ length: degree + 1 }, (_, k) => [Math.pow(c, k), factorial(k), k] as [number, number, number]));
      const u = linearArg(c);
      return {
        templateId: template,
        problemText: `Find the Maclaurin polynomial of degree $${degree}$ for $e^{${u}}$.`,
        answer: { kind: 'expression', reference: p.reference },
        displayAnswer: `$${p.tex}$`,
        explanation: `$e^u = \\sum_{k=0}^{\\infty} \\frac{u^k}{k!}$; substitute $u = ${u}$ and keep the terms up to $x^{${degree}}$: $${p.tex}$.`,
        hint: `Substitute $u = ${u}$ into $e^u = 1 + u + \\frac{u^2}{2!} + \\frac{u^3}{3!} + \\cdots$.`,
      };
    }
    if (template === 'maclaurin-trig') {
      const c = ctx.pick([1, 2, 3]);
      const fn = ctx.bool() ? 'sin' : 'cos';
      // sin(cx) = cx − (cx)³/3! + (cx)⁵/5!;  cos(cx) = 1 − (cx)²/2! + (cx)⁴/4!
      const ks = fn === 'sin' ? [1, 3, 5] : [0, 2, 4];
      const p = polynomial(ks.map((k, i) => [(i % 2 === 0 ? 1 : -1) * Math.pow(c, k), factorial(k), k] as [number, number, number]));
      const u = linearArg(c);
      return {
        templateId: template,
        problemText: `What is the Maclaurin series for $\\${fn}(${u})$?\n(Write the first 3 non-zero terms)`,
        answer: { kind: 'expression', reference: p.reference },
        displayAnswer: `$${p.tex}$`,
        explanation: fn === 'sin'
          ? `$\\sin u = u - \\frac{u^3}{3!} + \\frac{u^5}{5!} - \\cdots$ with $u = ${u}$: $${p.tex}$.`
          : `$\\cos u = 1 - \\frac{u^2}{2!} + \\frac{u^4}{4!} - \\cdots$ with $u = ${u}$: $${p.tex}$.`,
        hint: `$\\${fn}$ has only ${fn === 'sin' ? 'odd' : 'even'} powers; substitute $u = ${u}$ into the series for $\\${fn} u$.`,
      };
    }
    if (template === 'maclaurin-geometric') {
      // 1/(1 − cx) = Σ cᵏ xᵏ  (|cx| < 1)
      const c = ctx.pick([1, 2, 3, -1, -2]);
      const degree = ctx.int(2, 4);
      const p = polynomial(Array.from({ length: degree + 1 }, (_, k) => [Math.pow(c, k), 1, k] as [number, number, number]));
      return {
        templateId: template,
        problemText: `Find the Maclaurin polynomial of degree $${degree}$ for $\\frac{1}{${latexPolynomial([[1, ''], [-c, 'x']])}}$.`,
        answer: { kind: 'expression', reference: p.reference },
        displayAnswer: `$${p.tex}$`,
        explanation: `$\\frac{1}{1 - u} = 1 + u + u^2 + \\cdots$ for $|u| < 1$; with $u = ${linearArg(c)}$ the terms up to $x^{${degree}}$ are $${p.tex}$.`,
        hint: 'This is a geometric series: $\\frac{1}{1-u} = \\sum u^k$.',
      };
    }
    if (template === 'coefficient') {
      const k = ctx.int(2, 4);
      const variant = ctx.pick(['exp-maclaurin', 'exp-taylor', 'geometric'] as const);
      if (variant === 'exp-maclaurin') {
        const c = ctx.pick([2, 3, -1, -2]);
        const f = simplifyFraction(Math.pow(c, k), factorial(k));
        const tex = latexFraction(f.numerator, f.denominator);
        const cPow = `${c < 0 ? `(${c})` : c}^{${k}}`;
        return {
          templateId: template,
          problemText: `What is the coefficient of $x^{${k}}$ in the Maclaurin series for $e^{${linearArg(c)}}$?\n(Enter an exact value)`,
          answer: exact(Math.pow(c, k) / factorial(k)),
          displayAnswer: `$\\frac{${cPow}}{${k}!} = ${tex}$`,
          explanation: `$e^{${linearArg(c)}} = \\sum \\frac{(${linearArg(c)})^n}{n!}$, so the coefficient of $x^{${k}}$ is $\\frac{${cPow}}{${k}!} = ${tex}$.`,
          hint: 'Substitute into $e^u = \\sum \\frac{u^n}{n!}$ and collect the power of $x$.',
        };
      }
      if (variant === 'exp-taylor') {
        const a = ctx.int(1, 3);
        return {
          templateId: template,
          problemText: `What is the coefficient of $(x - ${a})^{${k}}$ in the Taylor series of $e^x$ centred at $x = ${a}$?\n(Enter an exact value; you may type e.g. "e^2/6".)`,
          answer: exact(Math.exp(a) / factorial(k)),
          displayAnswer: `$\\frac{e^{${a}}}{${k}!} = \\frac{e^{${a}}}{${factorial(k)}}$`,
          explanation: `The coefficient of $(x - a)^k$ is $\\frac{f^{(k)}(a)}{k!}$. Every derivative of $e^x$ is $e^x$, so it is $\\frac{e^{${a}}}{${k}!} = \\frac{e^{${a}}}{${factorial(k)}}$.`,
          hint: 'The Taylor coefficient of $(x-a)^k$ is $\\frac{f^{(k)}(a)}{k!}$.',
        };
      }
      const c = ctx.pick([2, 3, -2, -3]);
      return {
        templateId: template,
        problemText: `What is the coefficient of $x^{${k}}$ in the Maclaurin series for $\\frac{1}{${latexPolynomial([[1, ''], [-c, 'x']])}}$?`,
        answer: exact(Math.pow(c, k)),
        explanation: `$\\frac{1}{1 - (${linearArg(c)})} = \\sum (${linearArg(c)})^n$, so the coefficient of $x^{${k}}$ is $(${c})^{${k}} = ${Math.pow(c, k)}$.`,
        hint: 'Use the geometric series $\\frac{1}{1-u} = \\sum u^n$.',
      };
    }
    if (template === 'lagrange-bound') {
      // |R_n(h)| ≤ M |h|^{n+1}/(n+1)!,  M = max e^c between 0 and h = e^{max(h, 0)}
      const n = ctx.int(2, 4);
      const h = ctx.pick([0.1, 0.2, 0.5, 1, -0.5, -1]);
      const bound = Math.exp(Math.max(h, 0)) * Math.pow(Math.abs(h), n + 1) / factorial(n + 1);
      let taylor = 0;
      for (let k = 0; k <= n; k++) taylor += Math.pow(h, k) / factorial(k);
      const actual = Math.abs(Math.exp(h) - taylor);
      ctx.require(actual <= bound, 'boundHolds');
      const M = h > 0 ? `e^{${h}} \\cdot ` : '';
      return {
        templateId: template,
        problemText: `Using the Lagrange error bound, find the maximum error when $e^x$ is approximated by its degree-$${n}$ Maclaurin polynomial at $x = ${h}$.\n(Give 2 significant figures.)`,
        answer: { kind: 'number', value: bound, tolerance: { kind: 'significantFigures', figures: 2 } },
        displayAnswer: `$${M}\\frac{${Math.abs(h)}^{${n + 1}}}{${n + 1}!} \\approx ${sciTex(bound, 2)}$`,
        explanation: `$|R_{${n}}(x)| \\leq \\frac{M|x|^{${n + 1}}}{${n + 1}!}$, where $M$ bounds $|f^{(${n + 1})}(c)| = e^c$ for $c$ between $0$ and $${h}$. Since $e^c$ is increasing, ${h > 0 ? `$M = e^{${h}}$ (using $M = 1$ would NOT be a valid bound, since $e^c > 1$ for $c > 0$)` : '$M = e^0 = 1$ (for $c \\leq 0$, $e^c \\leq 1$)'}. The bound is $${M}\\frac{${Math.abs(h)}^{${n + 1}}}{${factorial(n + 1)}} \\approx ${sciTex(bound, 3)}$; the actual error is $\\approx ${sciTex(actual, 3)}$, below it.`,
        hint: 'The Lagrange remainder: $|R_n(x)| \\leq \\frac{M|x|^{n+1}}{(n+1)!}$, where $M$ bounds $|f^{(n+1)}|$ between $0$ and $x$.',
        solution: [
          theorem("Taylor's theorem with the Lagrange remainder", [
            [`$f$ has continuous derivatives up to order $${n + 1}$ between $0$ and $x$`, '$f(x) = e^x$ has $f^{(k)}(x) = e^x$ for every $k$, continuous everywhere'],
            [`$|f^{(${n + 1})}(c)| \\leq M$ for every $c$ between $0$ and $${h}$`, h > 0
              ? `$e^c$ is increasing, so on $[0, ${h}]$ it is at most $M = e^{${h}}$`
              : `$e^c$ is increasing, so on $[${h}, 0]$ it is at most $M = e^0 = 1$`],
          ], `$|R_{${n}}(${h})| \\leq \\frac{M\\,|${h}|^{${n + 1}}}{${n + 1}!} = ${M}\\frac{${Math.abs(h)}^{${n + 1}}}{${factorial(n + 1)}} \\approx ${sciTex(bound, 3)}$.`),
          ...(h > 0 ? [step(`Taking $M = 1$ would not be valid: $e^c > 1$ for $0 < c \\leq ${h}$.`)] : []),
          step(`Check: the actual error is $\\approx ${sciTex(actual, 3)}$, below the bound.`),
        ],
      };
    }
    // alternating series remainder: |S − S_N| ≤ b_{N+1} = 1/(N+1)^p
    const p = ctx.pick([1, 2]);
    const N = ctx.int(3, 9);
    const denom = Math.pow(N + 1, p);
    return {
      templateId: template,
      problemText: `The alternating series $\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{${latexPower('n', p)}}$ is approximated by its first $${N}$ terms.\nWhat is the bound on the error given by the Alternating Series Remainder? (exact value)`,
      answer: exact(1 / denom),
      displayAnswer: `$${latexFrac(1, denom)}$`,
      explanation: `For an alternating series with decreasing $b_n \\to 0$, the error after $N$ terms is at most the first omitted term: $b_{${N + 1}} = \\frac{1}{${p === 1 ? N + 1 : `${N + 1}^2`}} = ${latexFrac(1, denom)}$.`,
      hint: 'For an alternating series, the error is bounded by the absolute value of the first omitted term.',
      solution: [
        theorem('Alternating Series Estimation Theorem', [
          ['The series is $\\sum (-1)^{n+1} b_n$ with $b_n > 0$', `$b_n = \\frac{1}{${latexPower('n', p)}} > 0$`],
          ['$b_n$ is decreasing', `$${p === 1 ? 'n + 1 > n' : '(n+1)^{2} > n^{2}'}$, so $b_{n+1} < b_n$`],
          ['$b_n \\to 0$', `$${latexPower('n', p)} \\to \\infty$`],
        ], `The error after $N = ${N}$ terms is at most the first omitted term: $|S - S_{${N}}| \\leq b_{${N + 1}} = ${p === 1 ? latexFrac(1, denom) : `\\frac{1}{${N + 1}^2} = ${latexFrac(1, denom)}`}$.`),
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Parametric equations
// ---------------------------------------------------------------------------

const PARAM_TEMPLATES = ['eliminate-shifted-parabola', 'dydx-t^2-t^3', 'point-y'] as const;

export const parametricEquations: GeneratorDef = {
  topicId: 'parametric-equations',
  version: 2,
  templates: PARAM_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(PARAM_TEMPLATES);
    if (template === 'eliminate-shifted-parabola') {
      // x = t + a, y = t² + b  →  y = (x − a)² + b
      const a = ctx.int(1, 5);
      const b = ctx.int(-3, 3);
      const constant = b === 0 ? '' : b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`;
      return {
        templateId: template,
        problemText: `Given $x = t + ${a}$, $y = t^2${constant}$\nEliminate the parameter. What is $y$ in terms of $x$?`,
        answer: { kind: 'expression', reference: `(x-${a})^2${b === 0 ? '' : b > 0 ? `+${b}` : `-${Math.abs(b)}`}`, assignable: ['y'] },
        displayAnswer: `$y = (x - ${a})^2${constant}$`,
        explanation: `From $x = t + ${a}$, $t = x - ${a}$. Substitute: $y = (x - ${a})^2${constant}$.`,
        hint: 'Solve the x equation for t, then substitute into the y equation.',
      };
    }
    if (template === 'dydx-t^2-t^3') {
      // x = t², y = t³: dy/dx = 3t²/(2t) = 3t/2 for t ≠ 0
      const t = ctx.int(2, 5);
      const answer = (3 * t) / 2;
      return {
        templateId: template,
        problemText: `Given $x = t^2$, $y = t^3$\nFind $\\frac{dy}{dx}$ at $t = ${t}$. (exact: a fraction or decimal)`,
        answer: exact(answer),
        displayAnswer: `$${latexFrac(3 * t, 2)} = ${answer}$`,
        explanation: `$\\frac{dy}{dx} = \\frac{dy/dt}{dx/dt} = \\frac{3t^2}{2t} = \\frac{3t}{2}$ (for $t \\neq 0$). At $t = ${t}$: $\\frac{dy}{dx} = ${latexFrac(3 * t, 2)} = ${answer}$.`,
        hint: 'dy/dx = (dy/dt) / (dx/dt). Find each derivative separately.',
      };
    }
    const t = ctx.int(1, 4);
    const a = ctx.int(2, 4);
    return {
      templateId: template,
      problemText: `Given $x = ${a}t$, $y = t^2$\nWhat is the $y$-coordinate when $t = ${t}$?`,
      answer: exact(t * t),
      explanation: `Substitute $t = ${t}$: $y = ${t}^2 = ${t * t}$.`,
      hint: 'Just substitute the value of t into the y equation.',
    };
  },
};

// ---------------------------------------------------------------------------
// Polar coordinates
// ---------------------------------------------------------------------------

const POLAR_TEMPLATES = ['cartesian-to-polar-r', 'cartesian-to-polar-theta', 'polar-to-cartesian-x', 'polar-to-cartesian-y', 'identify-curve'] as const;

/** cos and sin of the standard angles exactly, as [sign, k] meaning sign·√k/2. */
const UNIT: Record<number, { cos: [number, number]; sin: [number, number] }> = {
  0: { cos: [1, 4], sin: [0, 0] }, 30: { cos: [1, 3], sin: [1, 1] }, 45: { cos: [1, 2], sin: [1, 2] },
  60: { cos: [1, 1], sin: [1, 3] }, 90: { cos: [0, 0], sin: [1, 4] }, 120: { cos: [-1, 1], sin: [1, 3] },
  135: { cos: [-1, 2], sin: [1, 2] }, 150: { cos: [-1, 3], sin: [1, 1] }, 180: { cos: [-1, 4], sin: [0, 0] },
};

/** r·sign·√k/2 exactly: its LaTeX, its value, and the LaTeX of the unit factor sign·√k/2. */
const surdTimes = (r: number, [sign, k]: [number, number]): { tex: string; value: number; unit: string } => {
  const value = sign * r * Math.sqrt(k) / 2;
  if (sign === 0) return { tex: '0', value: 0, unit: '0' };
  const s = sign < 0 ? '-' : '';
  const unit = `${s}${k === 4 ? '1' : k === 1 ? '\\frac{1}{2}' : `\\frac{\\sqrt{${k}}}{2}`}`;
  if (k === 4) return { tex: `${s}${r}`, value, unit };
  if (k === 1) return { tex: `${s}${latexFraction(r, 2)}`, value, unit };
  const f = simplifyFraction(r, 2);
  const tex = f.denominator === 1
    ? `${f.numerator === 1 ? '' : f.numerator}\\sqrt{${k}}`
    : `\\frac{${f.numerator === 1 ? '' : f.numerator}\\sqrt{${k}}}{2}`;
  return { tex: `${s}${tex}`, value, unit };
};

export const polarCoordinates: GeneratorDef = {
  topicId: 'polar-coordinates',
  version: 4,
  templates: POLAR_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(POLAR_TEMPLATES);
    if (template === 'cartesian-to-polar-r') {
      const x = ctx.int(3, 8);
      const y = ctx.int(3, 8);
      const r = Math.sqrt(x * x + y * y);
      return {
        templateId: template,
        problemText: `Convert $(${x}, ${y})$ from Cartesian to polar.\nWhat is $r$? (round to 2 decimal places)`,
        answer: roundedTo(r, 2),
        displayAnswer: `$\\sqrt{${x * x + y * y}} \\approx ${r.toFixed(2)}$`,
        explanation: `$r = \\sqrt{x^2 + y^2} = \\sqrt{${x}^2 + ${y}^2} = \\sqrt{${x * x + y * y}} \\approx ${r.toFixed(2)}$`,
        hint: '$r = \\sqrt{x^2 + y^2}$',
      };
    }
    if (template === 'cartesian-to-polar-theta') {
      // points on the axes and the diagonals, in every quadrant; θ in [0°, 360°)
      const [dx, dy, theta] = ctx.pick([[1, 1, 45], [0, 1, 90], [1, 0, 0], [-1, 1, 135], [-1, 0, 180], [-1, -1, 225], [0, -1, 270], [1, -1, 315]] as const);
      const a = ctx.int(1, 6);
      const [x, y] = [dx * a, dy * a];
      const quadrant = ({ 45: 'I', 135: 'II', 225: 'III', 315: 'IV' } as Record<number, string>)[theta];
      const explanation = dx === 0 || dy === 0
        ? `The point lies on the ${dx === 0 ? (dy > 0 ? 'positive $y$' : 'negative $y$') : (dx > 0 ? 'positive $x$' : 'negative $x$')}-axis, so $\\theta = ${theta}°$.${dx === 0 ? ' ($\\arctan(y/x)$ is undefined here: the formula does not apply when $x = 0$.)' : ''}`
        : `$\\tan\\theta = \\frac{y}{x} = ${dx * dy}$, so the reference angle is $45°$. The point is in quadrant ${quadrant} ($x ${x > 0 ? '>' : '<'} 0$, $y ${y > 0 ? '>' : '<'} 0$), so $\\theta = ${theta}°$.${dx < 0 ? ` ($\\arctan(y/x) = ${dx * dy > 0 ? 45 : -45}°$ alone would be wrong: it ignores the quadrant.)` : ''}`;
      return {
        templateId: template,
        problemText: `Convert $(${x}, ${y})$ from Cartesian to polar.\nWhat is $\\theta$ in degrees, with $0° \\leq \\theta < 360°$?`,
        answer: degrees(theta),
        displayAnswer: `$${theta}°$`,
        explanation,
        hint: 'Use the signs of $x$ and $y$ to find the quadrant. $\\arctan(y/x)$ alone is only correct when $x > 0$, and is undefined when $x = 0$.',
      };
    }
    if (template === 'polar-to-cartesian-x' || template === 'polar-to-cartesian-y') {
      const r = ctx.int(2, 8);
      const theta = ctx.pick([0, 30, 45, 60, 90, 120, 135, 150, 180] as const);
      const isX = template === 'polar-to-cartesian-x';
      const fn = isX ? 'cos' : 'sin';
      const v = surdTimes(r, UNIT[theta][fn]);
      const rational = Math.abs(v.value * 2 - Math.round(v.value * 2)) < 1e-12;
      const exactText = rational ? v.tex : `${v.tex} \\approx ${v.value.toFixed(2)}`;
      return {
        templateId: template,
        problemText: `Convert polar $(r=${r},\\; \\theta=${theta}°)$ to Cartesian.\nWhat is $${isX ? 'x' : 'y'}$? (round to 2 decimal places)`,
        answer: roundedTo(v.value, 2),
        displayAnswer: `$${exactText}$`,
        explanation: `$${isX ? 'x' : 'y'} = r\\${fn}(\\theta) = ${r}\\${fn}(${theta}°) = ${r} \\cdot ${v.unit === '1' ? '1' : `\\left(${v.unit}\\right)`} = ${exactText}$`,
        hint: `$${isX ? 'x' : 'y'} = r\\${fn}(\\theta)$`,
      };
    }
    // identify the curve: its Cartesian equation, typed
    const a = ctx.int(1, 6);
    const m = ctx.pick([3, 4, 6] as const);
    const variant = ctx.pick(['r=c', 'theta=c', 'r=acos', 'r=asin', 'rcos=a', 'rsin=a'] as const);
    const aTex = a === 1 ? '' : `${a}`;
    const slope = { 3: { ref: 'sqrt(3)', tex: '\\sqrt{3}' }, 4: { ref: '1', tex: '' }, 6: { ref: '1/sqrt(3)', tex: '\\frac{1}{\\sqrt{3}}' } }[m];
    const curves = {
      'r=c': { eq: `$r = ${a + 1}$`, lhs: 'x^2 + y^2', rhs: `${(a + 1) ** 2}`, tex: `x^2 + y^2 = ${(a + 1) ** 2}`, name: `the circle of radius $${a + 1}$ centred at the origin`,
        why: `$r^2 = x^2 + y^2$, so $r = ${a + 1}$ is $x^2 + y^2 = ${(a + 1) ** 2}$.` },
      'theta=c': { eq: `$\\theta = \\frac{\\pi}{${m}}$ (with $r$ allowed to be negative)`, lhs: 'y', rhs: `${slope.ref}*x`, tex: `y = ${slope.tex}x`, name: 'a line through the origin',
        why: `Every point has $\\frac{y}{x} = \\tan\\frac{\\pi}{${m}}$ (or is the origin), so the curve is $y = ${slope.tex}x$. With $r \\in \\mathbb{R}$ it is the whole line; with $r \\geq 0$ only, it would be a ray.` },
      'r=acos': { eq: `$r = ${aTex}\\cos(\\theta)$`, lhs: 'x^2 + y^2', rhs: `${a}*x`, tex: `x^2 + y^2 = ${aTex}x`, name: `a circle through the origin, centre $(${latexFraction(a, 2)}, 0)$`,
        why: `Multiply by $r$: $r^2 = ${aTex}r\\cos\\theta$, that is $x^2 + y^2 = ${aTex}x$. (Multiplying by $r$ adds only the origin, which is already on the curve at $\\theta = \\frac{\\pi}{2}$.)` },
      'r=asin': { eq: `$r = ${aTex}\\sin(\\theta)$`, lhs: 'x^2 + y^2', rhs: `${a}*y`, tex: `x^2 + y^2 = ${aTex}y`, name: `a circle through the origin, centre $(0, ${latexFraction(a, 2)})$`,
        why: `Multiply by $r$: $r^2 = ${aTex}r\\sin\\theta$, that is $x^2 + y^2 = ${aTex}y$. (Multiplying by $r$ adds only the origin, which is already on the curve at $\\theta = 0$.)` },
      'rcos=a': { eq: `$r\\cos(\\theta) = ${a}$`, lhs: 'x', rhs: `${a}`, tex: `x = ${a}`, name: 'a vertical line',
        why: `$r\\cos\\theta = x$, so this is the vertical line $x = ${a}$.` },
      'rsin=a': { eq: `$r\\sin(\\theta) = ${a}$`, lhs: 'y', rhs: `${a}`, tex: `y = ${a}`, name: 'a horizontal line',
        why: `$r\\sin\\theta = y$, so this is the horizontal line $y = ${a}$.` },
    }[variant];
    return {
      templateId: template,
      problemText: `Write the polar curve ${curves.eq} as an equation in $x$ and $y$.`,
      answer: { kind: 'equation', lhs: curves.lhs, rhs: curves.rhs },
      displayAnswer: `$${curves.tex}$: ${curves.name}`,
      explanation: curves.why,
      hint: 'Convert with $x = r\\cos\\theta$, $y = r\\sin\\theta$, $x^2 + y^2 = r^2$.',
    };
  },
};

// ---------------------------------------------------------------------------
// Applications of integration
// ---------------------------------------------------------------------------

const APP_TEMPLATES = ['disk-y=x', 'washer-x-x^2', 'shell-y=x^2', 'arc-length-y=x', 'surface-area-y=x'] as const;

export const integrationApplications: GeneratorDef = {
  topicId: 'integration-applications',
  version: 3,
  templates: APP_TEMPLATES,
  generate: (ctx) => {
    // The answer is the exact value; anything within half a unit of the last
    // requested decimal place is accepted.
    const template = ctx.pick(APP_TEMPLATES);
    if (template === 'disk-y=x') {
      // y = kx on [0, a] about the x-axis: V = π k² a³ / 3
      const k = ctx.int(1, 3);
      const a = ctx.int(1, 5);
      const vol = Math.PI * k * k * a ** 3 / 3;
      const shown = `${k === 1 ? '' : k}x`;
      return {
        templateId: template,
        problemText: `Find the volume of the solid formed by revolving $y = ${shown}$ around the x-axis from $x = 0$ to $x = ${a}$.\n(Use the disk method. Round to 2 decimal places.)`,
        answer: roundedTo(vol, 2),
        displayAnswer: `$\\frac{${k * k * a ** 3}\\pi}{3} \\approx ${vol.toFixed(2)}$`,
        explanation: `$V = \\pi\\int_0^{${a}} (${shown})^2\\,dx = ${k === 1 ? '' : k * k}\\pi\\left[\\frac{x^3}{3}\\right]_0^{${a}} = \\frac{${k * k * a ** 3}\\pi}{3} \\approx ${vol.toFixed(2)}$`,
        hint: `Disk method: $V = \\pi \\int_a^b [f(x)]^2\\,dx$. Here $f(x) = ${shown}$.`,
      };
    }
    if (template === 'washer-x-x^2') {
      // between y = cx and y = x² on [0, c] about the x-axis: V = π∫(c²x² − x⁴)dx = 2πc⁵/15
      const c = ctx.int(1, 3);
      const vol = 2 * Math.PI * c ** 5 / 15;
      const line = `${c === 1 ? '' : c}x`;
      return {
        templateId: template,
        problemText: `Find the volume of the solid formed by revolving the region between $y = ${line}$ and $y = x^2$ (from $x=0$ to $x=${c}$) around the x-axis.\n(Round to 3 decimal places.)`,
        answer: roundedTo(vol, 3),
        displayAnswer: `$\\frac{${2 * c ** 5}\\pi}{15} \\approx ${vol.toFixed(3)}$`,
        explanation: `On $[0, ${c}]$, $${line} \\geq x^2$, so the outer radius is $${line}$ and the inner radius $x^2$. $V = \\pi\\int_0^{${c}} \\left(${c === 1 ? '' : c * c}x^2 - x^4\\right)dx = \\pi\\left(\\frac{${c * c}\\cdot ${c}^3}{3} - \\frac{${c}^5}{5}\\right) = \\frac{${2 * c ** 5}\\pi}{15} \\approx ${vol.toFixed(3)}$`,
        hint: 'Washer method: $V = \\pi \\int [R(x)]^2 - [r(x)]^2\\,dx$. Which function is farther from the x-axis?',
      };
    }
    if (template === 'shell-y=x^2') {
      // y = kx² on [0, a] about the y-axis: V = 2π∫ x·kx² dx = πk a⁴/2
      const k = ctx.int(1, 3);
      const a = ctx.int(1, 4);
      const vol = Math.PI * k * a ** 4 / 2;
      const shown = `${k === 1 ? '' : k}x^2`;
      return {
        templateId: template,
        problemText: `Use the shell method to find the volume when $y = ${shown}$ (from $x=0$ to $x=${a}$) is revolved around the y-axis.\n(Round to 2 decimal places.)`,
        answer: roundedTo(vol, 2),
        displayAnswer: `$\\frac{${k * a ** 4}\\pi}{2} \\approx ${vol.toFixed(2)}$`,
        explanation: `$V = 2\\pi\\int_0^{${a}} x \\cdot ${shown}\\,dx = ${k === 1 ? '' : k}\\cdot 2\\pi\\left[\\frac{x^4}{4}\\right]_0^{${a}} = \\frac{${k * a ** 4}\\pi}{2} \\approx ${vol.toFixed(2)}$`,
        hint: `Shell method: $V = 2\\pi \\int_a^b x \\cdot f(x)\\,dx$. Here $f(x) = ${shown}$.`,
      };
    }
    if (template === 'arc-length-y=x') {
      // y = mx + b on [0, a]: L = a√(1 + m²)
      const m = ctx.int(1, 4);
      const b = ctx.int(-3, 3);
      const a = ctx.int(2, 6);
      const length = a * Math.sqrt(1 + m * m);
      const shown = latexPolynomial([[m, 'x'], [b, '']]);
      return {
        templateId: template,
        problemText: `Find the arc length of $y = ${shown}$ from $x = 0$ to $x = ${a}$.\n(Round to 2 decimal places.)`,
        answer: roundedTo(length, 2),
        displayAnswer: `$${a}\\sqrt{${1 + m * m}} \\approx ${length.toFixed(2)}$`,
        explanation: `$f'(x) = ${m}$, so $L = \\int_0^{${a}} \\sqrt{1 + ${m}^2}\\,dx = ${a}\\sqrt{${1 + m * m}} \\approx ${length.toFixed(2)}$`,
        hint: 'Arc length: $L = \\int_a^b \\sqrt{1 + [f\'(x)]^2}\\,dx$. Find $f\'(x)$ first.',
      };
    }
    // y = mx on [0, a] about the x-axis: S = 2π∫ mx √(1 + m²) dx = π m a² √(1 + m²)
    const m = ctx.int(1, 3);
    const a = ctx.int(2, 4);
    const area = Math.PI * m * a * a * Math.sqrt(1 + m * m);
    const shown = `${m === 1 ? '' : m}x`;
    return {
      templateId: template,
      problemText: `Find the surface area when $y = ${shown}$ from $x = 0$ to $x = ${a}$ is revolved around the x-axis.\n(Round to 2 decimal places.)`,
      answer: roundedTo(area, 2),
      displayAnswer: `$${m * a * a}\\sqrt{${1 + m * m}}\\,\\pi \\approx ${area.toFixed(2)}$`,
      explanation: `Here $f(x) = ${shown} \\geq 0$ on $[0, ${a}]$ and $f'(x) = ${m}$. $S = 2\\pi\\int_0^{${a}} ${shown}\\sqrt{1 + ${m}^2}\\,dx = 2\\pi \\cdot ${m === 1 ? '' : m}\\sqrt{${1 + m * m}}\\left[\\frac{x^2}{2}\\right]_0^{${a}} = ${m * a * a}\\sqrt{${1 + m * m}}\\,\\pi \\approx ${area.toFixed(2)}$`,
      hint: 'Surface area: $S = 2\\pi \\int f(x)\\sqrt{1 + [f\'(x)]^2}\\,dx$ (for $f(x) \\geq 0$).',
    };
  },
};

// ---------------------------------------------------------------------------
// Trigonometric substitution
// ---------------------------------------------------------------------------

const SUB_TEMPLATES = ['a2-minus-x2', 'x2-plus-a2', 'x2-minus-a2', 'quarter-circle'] as const;

/**
 * Substitutions are equations "x = a·f(θ)". Any parameter name is accepted
 * (θ, t, u, ...), and the co-function substitution is a valid alternative
 * since it works with a suitable parameter interval.
 */
const substitution = (...rhs: string[]): AnswerSpec =>
  ({ kind: 'anyOf', options: rhs.map(r => ({ kind: 'equation', lhs: 'x', rhs: r, parameters: ['theta'] }) as AnswerSpec) });

export const trigSubstitution: GeneratorDef = {
  topicId: 'trig-substitution',
  version: 3,
  templates: SUB_TEMPLATES,
  generate: (ctx) => {
    const template = ctx.pick(SUB_TEMPLATES);
    const a = ctx.int(2, 7);
    const a2 = a * a;
    const ask = '\n(Answer as an equation, e.g. "x = ...")';
    if (template === 'a2-minus-x2') {
      const form = ctx.pick([`\\sqrt{${a2} - x^2}\\,dx`, `\\frac{dx}{\\sqrt{${a2} - x^2}}`, `\\frac{x^2}{\\sqrt{${a2} - x^2}}\\,dx`]);
      return {
        templateId: template,
        problemText: `For $\\displaystyle\\int ${form}$, what trigonometric substitution should you use?${ask}`,
        answer: substitution(`${a}sin(theta)`, `${a}cos(theta)`),
        displayAnswer: `$x = ${a}\\sin\\theta$ (or $x = ${a}\\cos\\theta$)`,
        explanation: `For $\\sqrt{a^2 - x^2}$ use $x = a\\sin\\theta$ with $-\\frac{\\pi}{2} \\leq \\theta \\leq \\frac{\\pi}{2}$, so $\\sqrt{${a2} - ${a2}\\sin^2\\theta} = ${a}\\cos\\theta$. Here $a = ${a}$: $x = ${a}\\sin\\theta$. ($x = ${a}\\cos\\theta$ with $0 \\leq \\theta \\leq \\pi$ also works.)`,
        hint: `The integrand contains $\\sqrt{a^2 - x^2}$ with $a = ${a}$.`,
      };
    }
    if (template === 'x2-plus-a2') {
      const form = ctx.pick([`\\frac{dx}{\\sqrt{x^2 + ${a2}}}`, `\\sqrt{x^2 + ${a2}}\\,dx`, `\\frac{dx}{(x^2 + ${a2})^{3/2}}`]);
      return {
        templateId: template,
        problemText: `For $\\displaystyle\\int ${form}$, what trigonometric substitution should you use?${ask}`,
        answer: substitution(`${a}tan(theta)`, `${a}cot(theta)`),
        displayAnswer: `$x = ${a}\\tan\\theta$`,
        explanation: `For $\\sqrt{x^2 + a^2}$ use $x = a\\tan\\theta$ with $-\\frac{\\pi}{2} < \\theta < \\frac{\\pi}{2}$, so $\\sqrt{${a2}\\tan^2\\theta + ${a2}} = ${a}\\sec\\theta$. Here $a = ${a}$: $x = ${a}\\tan\\theta$.`,
        hint: `The integrand contains $\\sqrt{x^2 + a^2}$ with $a = ${a}$.`,
      };
    }
    if (template === 'x2-minus-a2') {
      const form = ctx.pick([`\\frac{dx}{x\\sqrt{x^2 - ${a2}}}`, `\\frac{\\sqrt{x^2 - ${a2}}}{x}\\,dx`, `\\frac{dx}{x^2\\sqrt{x^2 - ${a2}}}`]);
      return {
        templateId: template,
        problemText: `For $\\displaystyle\\int ${form}$, what trigonometric substitution should you use?${ask}`,
        answer: substitution(`${a}sec(theta)`, `${a}csc(theta)`),
        displayAnswer: `$x = ${a}\\sec\\theta$`,
        explanation: `For $\\sqrt{x^2 - a^2}$ use $x = a\\sec\\theta$ with $0 \\leq \\theta < \\frac{\\pi}{2}$ (for $x \\geq a$), so $\\sqrt{${a2}\\sec^2\\theta - ${a2}} = ${a}\\tan\\theta$. Here $a = ${a}$: $x = ${a}\\sec\\theta$.`,
        hint: `The integrand contains $\\sqrt{x^2 - a^2}$ with $a = ${a}$.`,
      };
    }
    // ∫_0^r √(r² − x²) dx = πr²/4 (a quarter of the disc)
    const r = ctx.int(1, 6);
    const area = Math.PI * r * r / 4;
    const quarter = simplifyFraction(r * r, 4);
    const piTex = quarter.denominator === 1
      ? `${quarter.numerator === 1 ? '' : quarter.numerator}\\pi`
      : `\\frac{${quarter.numerator === 1 ? '' : quarter.numerator}\\pi}{${quarter.denominator}}`;
    return {
      templateId: template,
      problemText: `Evaluate exactly: $\\displaystyle\\int_0^{${r}} \\sqrt{${r * r} - x^2}\\,dx$\n(This is a quarter-circle area. You may type "pi".)`,
      answer: exact(area),
      displayAnswer: `$${piTex} \\approx ${area.toFixed(4)}$`,
      explanation: `$y = \\sqrt{${r * r} - x^2}$ is the upper half of the circle of radius $${r}$; for $0 \\leq x \\leq ${r}$ the region under it is a quarter of the disc, with area $\\frac{\\pi \\cdot ${r}^2}{4} = ${piTex} \\approx ${area.toFixed(4)}$. (With $x = ${r}\\sin\\theta$ the integral becomes $${r * r}\\int_0^{\\pi/2} \\cos^2\\theta\\,d\\theta$, the same value.)`,
      hint: `Substitute $x = ${r}\\sin\\theta$, or recognize the area of a quarter of a circle of radius $${r}$.`,
    };
  },
};
