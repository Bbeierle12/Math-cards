/**
 * Independent mathematical regression tests.
 *
 * Every exercise family is checked by RECOMPUTING the answer from the text
 * the student actually sees (never from the generator's internal state), and
 * the grader is checked with the exact inputs from the reliability audit.
 * The research fidelity score cannot do this: its accept probes come from the
 * same answer key it is testing.
 */
import { describe, it, expect } from 'vitest';
import { derivative, evaluate } from 'mathjs';
import { generateProblem, validateAnswer, simplifyFraction, resolveRange } from './mathService';
import { GENERATORS } from './generators';
import { canonicalInput, normalizeMathExpr, referenceNumber, wrongInputs } from './grading';
import { AnswerSpec, Problem, TopicId } from '../types';
import { coef, terms } from './testing/latex';

const N = 40;
// Deterministic seeds: every run checks the same problems, and a failure names a replayable seed.
const sample = (topic: TopicId, n = N): Problem[] => Array.from({ length: n }, (_, i) => generateProblem(topic, {}, `mc-${i}`));
const sampleWhere = (topic: TopicId, pred: (p: Problem) => boolean, want = 8): Problem[] => {
  const out: Problem[] = [];
  for (let i = 0; i < 600 && out.length < want; i++) {
    const p = generateProblem(topic, {}, `mcw-${i}`);
    if (pred(p)) out.push(p);
  }
  if (out.length === 0) throw new Error(`no ${topic} problem matched the predicate`);
  return out;
};
const int = (s: string) => parseInt(s.replace(/[()\s]/g, ''), 10);
const must = (m: RegExpMatchArray | null, p: Problem): RegExpMatchArray => {
  if (!m) throw new Error(`Could not parse problem text: ${p.problemText}`);
  return m;
};
const num = (p: Problem): number => {
  const v = referenceNumber(p.answer);
  if (v === null) throw new Error(`not a numeric answer: ${JSON.stringify(p.answer)}`);
  return v;
};
/** The reference answer as text: the chosen option, the first accepted word, the reference expression. */
const ref = (p: Problem): string => {
  const a = p.answer;
  switch (a.kind) {
    case 'choice': return a.answer;
    case 'text': return a.accepted[0];
    case 'expression': return a.reference;
    case 'antiderivative': return a.reference!;
    default: return String(canonicalInput(a));
  }
};
const numberSpec = (p: Problem): Extract<AnswerSpec, { kind: 'number' }> => {
  if (p.answer.kind !== 'number') throw new Error(`not a number answer: ${p.problemText}`);
  return p.answer;
};
/** Simpson's rule, independent of any antiderivative. */
const integrate = (f: (x: number) => number, a: number, b: number, n = 2000): number => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  return (s * h) / 3;
};
const evalAt = (expr: string, scope: Record<string, number>): number => evaluate(normalizeMathExpr(expr), scope) as number;
/** The LaTeX exact values the trig generators may display, with their numeric values. */
const EXACT_LATEX: Record<string, number> = {
  '\\frac{1}{2}': 0.5,
  '\\frac{\\sqrt{3}}{2}': Math.sqrt(3) / 2,
  '\\frac{\\sqrt{3}}{3}': Math.sqrt(3) / 3,
  '\\frac{\\sqrt{2}}{2}': Math.SQRT2 / 2,
  '\\sqrt{3}': Math.sqrt(3),
  '1': 1,
};
const trig = (fn: string, deg: number) => (Math as unknown as Record<string, (x: number) => number>)[fn](deg * Math.PI / 180);

// ===========================================================================
// Audit reproductions (grader contract)
// ===========================================================================

describe('audit reproductions', () => {
  it('Lagrange bound for e^0.5 with P_3: 0.0043 accepted, 0.0026 (below the true error) rejected', () => {
    const [p] = sampleWhere('taylor-maclaurin', q => /Lagrange/.test(q.problemText), 1);
    const trueBound = Math.exp(0.5) * Math.pow(0.5, 4) / 24; // 0.004293...
    const actualError = Math.exp(0.5) - 79 / 48;           // 0.002887...
    expect(num(p)).toBeCloseTo(trueBound, 12);
    expect(num(p)).toBeGreaterThan(actualError);           // a bound must bound the error
    expect(validateAnswer(p, '0.0043')).toBe(true);
    expect(validateAnswer(p, 'e^0.5/384')).toBe(true);
    expect(validateAnswer(p, '0.0026')).toBe(false);
    expect(validateAnswer(p, '0.003')).toBe(false);
    expect(p.explanation).not.toMatch(/crude/);
    expect(p.explanation).toMatch(/NOT be a valid bound/);
  });

  it('undefined mathematics never earns credit on a substitution question', () => {
    for (const p of sample('integration-substitution', 5)) {
      expect(validateAnswer(p, '0/0')).toBe(false);
      expect(validateAnswer(p, 'NaN+0')).toBe(false);
      expect(validateAnswer(p, 'NaN')).toBe(false);
      expect(validateAnswer(p, 'Infinity')).toBe(false);
      expect(validateAnswer(p, ref(p))).toBe(true);
      expect(validateAnswer(p, `u = ${ref(p)}`)).toBe(true);
      // "u" may be named, but no other variable
      expect(validateAnswer(p, `v = ${ref(p)}`)).toBe(false);
    }
  });

  it('trig equations and inverse trig display exact values, never rounded decimals', () => {
    for (const p of [...sample('trig-equations'), ...sample('inverse-trig')]) {
      expect(p.problemText).not.toMatch(/0\.\d{3}/);
      expect(p.problemText).toMatch(/\\frac|\\sqrt|\\left\(1\\right\)|= 1\$$/);
    }
  });

  it('integration by parts accepts the audit\'s valid spellings', () => {
    const byText = (re: RegExp) => sampleWhere('integration-by-parts', q => re.test(q.problemText), 1)[0];
    expect(validateAnswer(byText(/x \\cdot \\cos/), 'cos(x)+x*sin(x)')).toBe(true);
    expect(validateAnswer(byText(/x \\cdot e\^x/), 'exp(x)*(x-1)')).toBe(true);
    expect(validateAnswer(byText(/x \\cdot e\^x/), 'xe^x - e^x')).toBe(true);
    expect(validateAnswer(byText(/\\ln\(x\)/), 'x(ln(x)-1)')).toBe(true);
    expect(validateAnswer(byText(/x \\cdot \\sin/), 'sin(x) - xcos(x)')).toBe(true);
    expect(validateAnswer(byText(/x \\cdot \\sin/), 'x*cos(x)')).toBe(false);
  });

  it('trig integrals accept equivalent antiderivatives and require |cos x|', () => {
    const byText = (re: RegExp) => sampleWhere('trig-integrals', q => re.test(q.problemText), 1)[0];
    expect(validateAnswer(byText(/\\sin\(x\)\\cos\(x\)/), '-cos(x)^2/2')).toBe(true);
    expect(validateAnswer(byText(/\\sin\(x\)\\cos\(x\)/), '-cos(2x)/4')).toBe(true);
    expect(validateAnswer(byText(/\\sin\(x\)\\cos\(x\)/), 'sin(x)*cos(x)')).toBe(false);
    const tan = byText(/\\int \\tan\(x\)/);
    expect(validateAnswer(tan, '-ln|cos(x)|')).toBe(true);
    expect(validateAnswer(tan, 'ln|sec(x)|')).toBe(true);
    expect(validateAnswer(tan, '-ln(cos(x))')).toBe(false);
  });

  it('requested rounding is enforced: sin 30° to 3 places', () => {
    const [p] = sampleWhere('trig-special-angles', q => /\\sin\(30°\)/.test(q.problemText), 1);
    expect(validateAnswer(p, '0.500')).toBe(true);
    expect(validateAnswer(p, '0.5')).toBe(true);
    expect(validateAnswer(p, '1/2')).toBe(true);
    expect(validateAnswer(p, '0.509')).toBe(false);
    expect(validateAnswer(p, '0.501')).toBe(false);
  });

  it('requested rounding is enforced: arc length of y = x on [0, 4] to 2 places', () => {
    const [p] = sampleWhere('integration-applications', q => /arc length/.test(q.problemText) && /x = 4\$/.test(q.problemText), 1);
    expect(validateAnswer(p, '5.66')).toBe(true);
    expect(validateAnswer(p, '4*sqrt(2)')).toBe(true);
    expect(validateAnswer(p, '5.70')).toBe(false);
    expect(validateAnswer(p, '5.65')).toBe(false);
  });

  it('exact answers are exact: coefficient of x^2 in e^x', () => {
    const [p] = sampleWhere('taylor-maclaurin', q => /coefficient of \$x\^2\$/.test(q.problemText), 1);
    expect(validateAnswer(p, '0.5')).toBe(true);
    expect(validateAnswer(p, '1/2')).toBe(true);
    expect(validateAnswer(p, '1/2!')).toBe(true);
    expect(validateAnswer(p, '0.5005')).toBe(false);
  });

  it('fractions are accepted for trig ratios (3/5 for sin θ in a 3-4-5 triangle)', () => {
    const [p] = sampleWhere('trig-ratios', q => /\$3\$, \$4\$, \$5\$/.test(q.problemText) && /\\sin/.test(q.problemText) && /opposite to side \$3\$/.test(q.problemText), 1);
    expect(num(p)).toBeCloseTo(0.6, 12);
    expect(validateAnswer(p, '3/5')).toBe(true);
    expect(validateAnswer(p, '0.6')).toBe(true);
    expect(validateAnswer(p, '0.600')).toBe(true);
    expect(validateAnswer(p, '0.61')).toBe(false);
  });

  it('trig substitution accepts either valid substitution and any parameter name', () => {
    const [p] = sampleWhere('trig-substitution', q => /4 - x\^2/.test(q.problemText), 1);
    expect(validateAnswer(p, 'x=2sin(theta)')).toBe(true);
    expect(validateAnswer(p, 'x = 2sin(t)')).toBe(true);
    expect(validateAnswer(p, 'x=2cos(θ)')).toBe(true);
    expect(validateAnswer(p, 'x=2tan(θ)')).toBe(false);
    expect(validateAnswer(p, 'x=3sin(θ)')).toBe(false);
    // θ is a declared parameter; x is not, so renaming x changes the answer
    expect(p.answer.kind).toBe('anyOf');
    if (p.answer.kind === 'anyOf') {
      for (const option of p.answer.options) expect(option).toMatchObject({ kind: 'equation', lhs: 'x', parameters: ['theta'] });
    }
    expect(validateAnswer(p, 'y = 2sin(θ)')).toBe(false);
    expect(validateAnswer(p, 'y = 2sin(t)')).toBe(false);
  });

  it('chain-rule question names the requested form K(ax+b)^(n-1)', () => {
    for (const p of sample('chain-rule', 5)) {
      expect(p.problemText).toMatch(/form \$K\(/);
    }
  });

  it('alternating sequence explanation lists the terms with the correct signs', () => {
    const [p] = sampleWhere('sequences', q => /\(-1\)\^n \\cdot \\frac\{1\}\{n\}/.test(q.problemText), 1);
    expect(p.explanation).toMatch(/-1, \\frac\{1\}\{2\}, -\\frac\{1\}\{3\}, \\frac\{1\}\{4\}/);
  });

  it('polar θ questions fix an interval and never divide by zero in the explanation', () => {
    for (const p of sampleWhere('polar-coordinates', q => /What is \$\\theta\$/.test(q.problemText), 6)) {
      expect(p.problemText).toMatch(/0° \\leq \\theta < 360°/);
      expect(p.explanation).not.toMatch(/\\frac\{\d+\}\{0\}/);
      expect(p.explanation).not.toMatch(/arctan\\left\(\\frac\{5\}\{0\}/);
    }
  });

  it('partial-fraction and p-series prompts do not leak their answers', () => {
    for (const p of sampleWhere('partial-fractions', q => /What is \$A\$/.test(q.problemText) && /x \+ /.test(q.problemText), 6)) {
      expect(p.problemText).not.toMatch(/like \$\\frac/);
    }
    const [ps] = sampleWhere('improper-integrals', q => /For which \$p\$/.test(q.problemText), 1);
    expect(ps.problemText).not.toMatch(/p > 1|p>1/);
    expect(validateAnswer(ps, 'p > 1')).toBe(true);
    expect(validateAnswer(ps, '1 < p')).toBe(true);
    expect(validateAnswer(ps, '(1, inf)')).toBe(true);
    expect(validateAnswer(ps, 'p >= 1')).toBe(false);  // p = 1 diverges
    expect(validateAnswer(ps, 'p < 0')).toBe(false);
    expect(validateAnswer(ps, 'x > 1')).toBe(false);   // wrong variable
  });

  it('identity answers reject domain-invalid rewrites such as θ/θ for 1', () => {
    const [p] = sampleWhere('trig-identities', q => ref(q) === '1', 1);
    expect(validateAnswer(p, '1')).toBe(true);
    expect(validateAnswer(p, 'theta/theta')).toBe(false);
    expect(validateAnswer(p, 'sin(theta)^2+cos(theta)^2')).toBe(true);
  });

  it('tangent explanations do not claim a value at 90°', () => {
    for (const p of sampleWhere('trig-equations', q => /\\tan/.test(q.problemText), 3)) {
      expect(p.explanation).toMatch(/\[0°, 90°\)/);
    }
  });

  it('arithmetic answers cannot be restated as the problem itself', () => {
    const [p] = sampleWhere('addition', q => !/-/.test(q.problemText), 1);
    const m = p.problemText.match(/\$(\d+) \+ (\d+) =/)!;
    expect(validateAnswer(p, `${m[1]}+${m[2]}`)).toBe(false);
    expect(validateAnswer(p, String(Number(m[1]) + Number(m[2])))).toBe(true);
  });

  it("the 'evaluated' form is a per-problem requirement, set only on arithmetic-fluency topics", () => {
    const fluency: TopicId[] = ['addition', 'subtraction', 'multiplication', 'division', 'integers', 'order-of-operations', 'decimals'];
    for (const topic of fluency) {
      for (const p of sample(topic, 5)) expect(numberSpec(p).form, topic).toBe('evaluated');
    }
    // elsewhere any exact expression for the value is an answer
    for (const p of sample('limits', 10)) {
      expect(numberSpec(p).form).toBeUndefined();
      const m = must(p.problemText.match(/\\lim_\{x \\to (\d+)\} \\left\[(.+)\\right\]/), p);
      const t = terms(m[2]);
      expect(validateAnswer(p, `${coef(t, 'x')}*${m[1]} + (${coef(t, '')})`)).toBe(true);
    }
    const [lagrange] = sampleWhere('taylor-maclaurin', q => /Lagrange/.test(q.problemText), 1);
    expect(validateAnswer(lagrange, 'e^0.5*0.5^4/24')).toBe(true);
  });

  it('no-negatives setting applies to operands and answers', () => {
    for (const topic of ['addition', 'subtraction', 'multiplication', 'division'] as TopicId[]) {
      for (const range of [{ min: -10, max: -5 }, { min: 0, max: 10 }, { min: -10, max: 10 }]) {
        for (let i = 0; i < 100; i++) {
          const p = generateProblem(topic, { numberRange: range, allowNegatives: false }, `nn-${i}`);
          const operands = [...p.problemText.matchAll(/-?\d+/g)].map(m => Number(m[0]));
          expect(operands.every(o => o >= 0), `${topic} ${JSON.stringify(range)}: ${p.problemText}`).toBe(true);
          expect(num(p) >= 0, `${topic} ${JSON.stringify(range)} answer ${num(p)}`).toBe(true);
        }
      }
    }
  });

  it('resolveRange clamps and repairs the effective range', () => {
    expect(resolveRange({ numberRange: { min: -10, max: -5 }, allowNegatives: false }, -10, 10)).toEqual({ min: 0, max: 0 });
    expect(resolveRange({ numberRange: { min: 10, max: 2 } }, -10, 10)).toEqual({ min: 2, max: 10 });
    expect(resolveRange(undefined, -10, 10)).toEqual({ min: -10, max: 10 });
  });
});

// ===========================================================================
// Independent recomputation, one block per exercise family
// ===========================================================================

describe('independent recomputation: pre-algebra', () => {
  it('fractions-basic', () => {
    for (const p of sample('fractions-basic')) {
      const m = must(p.problemText.match(/\\frac\{(\d+)\}\{(\d+)\} (\+|-|\\times|\\div) \\frac\{(\d+)\}\{(\d+)\}/), p);
      const [n1, d1, n2, d2] = [int(m[1]), int(m[2]), int(m[4]), int(m[5])];
      const op = m[3];
      const [an, ad] = op === '+' ? [n1 * d2 + n2 * d1, d1 * d2]
        : op === '-' ? [n1 * d2 - n2 * d1, d1 * d2]
        : op === '\\times' ? [n1 * n2, d1 * d2]
        : [n1 * d2, d1 * n2];
      expect(p.answer).toEqual({ kind: 'fraction', ...simplifyFraction(an, ad) });
      expect(validateAnswer(p, `${an}/${ad}`)).toBe(true);
      const f = simplifyFraction(an, ad);
      expect(validateAnswer(p, `${f.numerator + f.denominator}/${f.denominator}`)).toBe(false);
    }
  });

  it('decimals (exact, not tolerance-graded)', () => {
    for (const p of sample('decimals')) {
      const m = must(p.problemText.match(/\$(-?[\d.]+) (\+|-|\\times) (-?[\d.]+) =/), p);
      const [a, b] = [parseFloat(m[1]), parseFloat(m[3])];
      const exact = m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b;
      expect(num(p)).toBeCloseTo(exact, 9);
      expect(validateAnswer(p, exact.toFixed(2))).toBe(true);
      expect(validateAnswer(p, (exact + 0.01).toFixed(2))).toBe(false);
    }
  });

  it('order-of-operations', () => {
    for (const p of sample('order-of-operations')) {
      const t = p.problemText.replace(/\$= \\;\?\$$/, '').replace(/\$/g, '').replace(/\\times/g, '*').trim();
      expect(evaluate(t)).toBe(num(p));
    }
  });

  it('integers', () => {
    for (const p of sample('integers')) {
      const m = must(p.problemText.match(/\$(\(?-?\d+\)?) (\+|-|\\times) (\(?-?\d+\)?) =/), p);
      const [a, b] = [int(m[1]), int(m[3])];
      expect(num(p)).toBe(m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b);
    }
  });
});

describe('independent recomputation: algebra 1', () => {
  it('inequalities: the solution set, with the direction reversed exactly when dividing by a negative', () => {
    let negatives = 0;
    for (const p of sample('inequalities', 60)) {
      const m = must(p.problemText.match(/Solve for \$x\$: \$(.+) (<|>|\\leq|\\geq) (-?\d+)\$/), p);
      const t = terms(m[1]);
      const [a, b, c] = [coef(t, 'x'), coef(t, ''), int(m[3])];
      expect(a).not.toBe(0);
      expect(Math.abs((c - b) % a)).toBe(0);
      const bound = (c - b) / a;
      const shown = ({ '<': '<', '>': '>', '\\leq': '<=', '\\geq': '>=' } as Record<string, string>)[m[2]];
      const reverse = ({ '<': '>', '>': '<', '<=': '>=', '>=': '<=' } as Record<string, string>);
      const solution = a < 0 ? reverse[shown] : shown;
      if (a < 0) negatives++;
      expect(validateAnswer(p, `x ${solution} ${bound}`)).toBe(true);
      expect(validateAnswer(p, `${bound} ${reverse[solution]} x`)).toBe(true);
      expect(validateAnswer(p, `x ${reverse[solution]} ${bound}`)).toBe(false);   // direction not reversed / wrongly reversed
      expect(validateAnswer(p, `x ${solution} ${bound + 1}`)).toBe(false);
      const closed = solution.includes('=');
      const interval = solution.startsWith('<') ? `(-inf, ${bound}${closed ? ']' : ')'}` : `${closed ? '[' : '('}${bound}, inf)`;
      expect(validateAnswer(p, interval)).toBe(true);
      // every x in the claimed set satisfies the displayed inequality, and a point outside does not
      const holds = (x: number) => ({ '<': a * x + b < c, '>': a * x + b > c, '<=': a * x + b <= c, '>=': a * x + b >= c } as Record<string, boolean>)[shown];
      const inside = solution.startsWith('<') ? bound - 0.5 : bound + 0.5;
      const outside = solution.startsWith('<') ? bound + 0.5 : bound - 0.5;
      expect(holds(inside)).toBe(true);
      expect(holds(outside)).toBe(false);
      expect(holds(bound)).toBe(closed);
    }
    expect(negatives).toBeGreaterThan(0);
  });

  it('systems-of-equations (Cramer\'s rule)', () => {
    for (const p of sample('systems-of-equations')) {
      const lines = p.problemText.split('\n');
      const e1 = must(lines[0].match(/^\$(.+) = (-?\d+)\$$/), p);
      const e2 = must(lines[1].match(/^\$(.+) = (-?\d+)\$$/), p);
      const [t1, t2] = [terms(e1[1]), terms(e2[1])];
      const [a1, b1, c1, a2, b2, c2] = [coef(t1, 'x'), coef(t1, 'y'), int(e1[2]), coef(t2, 'x'), coef(t2, 'y'), int(e2[2])];
      const det = a1 * b2 - a2 * b1;
      expect(det).not.toBe(0);
      expect(num(p)).toBe((c1 * b2 - c2 * b1) / det);
    }
  });

  it('exponents', () => {
    for (const p of sample('exponents')) {
      const t = p.problemText;
      let expected: number | undefined;
      let m = t.match(/\$(\d+)\^\{(\d+)\} \\times \d+\^\{(\d+)\}\$/);
      if (m) expected = int(m[2]) + int(m[3]);
      m = m || t.match(/\$(\d+)\^\{(\d+)\} \\div \d+\^\{(\d+)\}\$/);
      if (expected === undefined && m) expected = int(m[2]) - int(m[3]);
      m = m || t.match(/\$\((\d+)\^\{(\d+)\}\)\^\{(\d+)\}\$/);
      if (expected === undefined && m) expected = int(m[2]) * int(m[3]);
      if (expected === undefined) throw new Error(`Could not parse: ${t}`);
      expect(num(p)).toBe(expected);
    }
  });

  it('polynomials: coefficient of x', () => {
    for (const p of sample('polynomials')) {
      const m = must(p.problemText.match(/^\$\((.+)\) ([+-]) \((.+)\)\$/), p);
      const b1 = coef(terms(m[1]), 'x');
      const b2 = coef(terms(m[3]), 'x');
      expect(num(p)).toBe(m[2] === '+' ? b1 + b2 : b1 - b2);
    }
  });
});

describe('independent recomputation: geometry', () => {
  it('angles', () => {
    for (const p of sample('angles')) {
      const m = must(p.problemText.match(/the (complementary|supplementary) angle of \$(\d+)°\$/), p);
      expect(num(p)).toBe((m[1] === 'complementary' ? 90 : 180) - int(m[2]));
      expect(num(p)).toBeGreaterThan(0);
    }
  });

  it('triangles', () => {
    for (const p of sample('triangles')) {
      const m = must(p.problemText.match(/angles of \$(\d+)°\$ and \$(\d+)°\$/), p);
      expect(num(p)).toBe(180 - int(m[1]) - int(m[2]));
      expect(num(p)).toBeGreaterThan(0);
    }
  });

  it('pythagorean-theorem', () => {
    for (const p of sample('pythagorean-theorem')) {
      const t = p.problemText;
      let m = t.match(/leg \$b = (\d+)\$ and hypotenuse \$c = (\d+)\$/);
      if (m) { expect(num(p)).toBe(Math.sqrt(int(m[2]) ** 2 - int(m[1]) ** 2)); continue; }
      m = t.match(/leg \$a = (\d+)\$ and hypotenuse \$c = (\d+)\$/);
      if (m) { expect(num(p)).toBe(Math.sqrt(int(m[2]) ** 2 - int(m[1]) ** 2)); continue; }
      m = must(t.match(/legs \$a = (\d+)\$ and \$b = (\d+)\$/), p);
      expect(num(p)).toBe(Math.sqrt(int(m[1]) ** 2 + int(m[2]) ** 2));
    }
  });

  it('area-perimeter', () => {
    for (const p of sample('area-perimeter', 80)) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/area of a rectangle with length \$(\d+)\$ and width \$(\d+)\$/))) expect(num(p)).toBe(int(m[1]) * int(m[2]));
      else if ((m = t.match(/perimeter of a rectangle with length \$(\d+)\$ and width \$(\d+)\$/))) expect(num(p)).toBe(2 * (int(m[1]) + int(m[2])));
      else if ((m = t.match(/area of a square with side length \$(\d+)\$/))) expect(num(p)).toBe(int(m[1]) ** 2);
      else if ((m = t.match(/perimeter of a square with side length \$(\d+)\$/))) expect(num(p)).toBe(4 * int(m[1]));
      else if ((m = t.match(/triangle with base \$(\d+)\$ and height \$(\d+)\$/))) expect(num(p)).toBe(int(m[1]) * int(m[2]) / 2);
      else if ((m = t.match(/triangle with sides \$(\d+)\$, \$(\d+)\$, and \$(\d+)\$/))) {
        const [a, b, c] = [int(m[1]), int(m[2]), int(m[3])];
        expect(a + b > c && a + c > b && b + c > a).toBe(true); // a real triangle
        expect(num(p)).toBe(a + b + c);
      } else if ((m = t.match(/area of a circle with radius \$(\d+)\$/))) {
        const r = int(m[1]);
        expect(num(p)).toBeCloseTo(3.14 * r * r, 9);
        expect(validateAnswer(p, (3.14 * r * r).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (Math.PI * r * r).toFixed(2))).toBe(false); // instructed to use 3.14
        expect(validateAnswer(p, (3.14 * r * r + 0.4).toFixed(2))).toBe(false);
      } else if ((m = t.match(/circumference of a circle with radius \$(\d+)\$/))) {
        const r = int(m[1]);
        expect(num(p)).toBeCloseTo(2 * 3.14 * r, 9);
        expect(validateAnswer(p, (2 * 3.14 * r).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (2 * Math.PI * r).toFixed(2))).toBe(false);
        expect(validateAnswer(p, (2 * 3.14 * r + 0.4).toFixed(2))).toBe(false);
      } else throw new Error(`Could not parse: ${t}`);
    }
  });

  it('volume-surface-area', () => {
    for (const p of sample('volume-surface-area', 80)) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/volume of a cube with side length \$(\d+)\$/))) expect(num(p)).toBe(int(m[1]) ** 3);
      else if ((m = t.match(/surface area of a cube with side length \$(\d+)\$/))) expect(num(p)).toBe(6 * int(m[1]) ** 2);
      else if ((m = t.match(/volume of a rectangular prism: \$l=(\d+)\$, \$w=(\d+)\$, \$h=(\d+)\$/))) expect(num(p)).toBe(int(m[1]) * int(m[2]) * int(m[3]));
      else if ((m = t.match(/surface area of a rectangular prism: \$l=(\d+)\$, \$w=(\d+)\$, \$h=(\d+)\$/))) {
        const [l, w, h] = [int(m[1]), int(m[2]), int(m[3])];
        expect(num(p)).toBe(2 * (l * w + l * h + w * h));
      } else if ((m = t.match(/volume of a cylinder with \$r=(\d+)\$, \$h=(\d+)\$/))) {
        const [r, h] = [int(m[1]), int(m[2])];
        expect(num(p)).toBeCloseTo(Math.round(3.14 * r * r * h * 100) / 100, 9);
        expect(validateAnswer(p, (3.14 * r * r * h).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (Math.PI * r * r * h).toFixed(2))).toBe(false);
      } else if ((m = t.match(/surface area of a cylinder with \$r=(\d+)\$, \$h=(\d+)\$/))) {
        const [r, h] = [int(m[1]), int(m[2])];
        expect(num(p)).toBeCloseTo(Math.round(2 * 3.14 * r * (r + h) * 100) / 100, 9);
        expect(validateAnswer(p, (2 * 3.14 * r * (r + h)).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (2 * Math.PI * r * (r + h)).toFixed(2))).toBe(false);
      } else if ((m = t.match(/volume of a sphere with radius \$(\d+)\$/))) {
        const r = int(m[1]);
        expect(num(p)).toBeCloseTo(Math.round((4 / 3) * 3.14 * r ** 3 * 100) / 100, 9);
        expect(validateAnswer(p, ((4 / 3) * 3.14 * r ** 3).toFixed(2))).toBe(true);
        expect(validateAnswer(p, ((4 / 3) * Math.PI * r ** 3).toFixed(2))).toBe(false);
      } else if ((m = t.match(/surface area of a sphere with radius \$(\d+)\$/))) {
        const r = int(m[1]);
        expect(num(p)).toBeCloseTo(Math.round(4 * 3.14 * r * r * 100) / 100, 9);
        expect(validateAnswer(p, (4 * 3.14 * r * r).toFixed(2))).toBe(true);
        expect(validateAnswer(p, (4 * Math.PI * r * r).toFixed(2))).toBe(false);
      } else throw new Error(`Could not parse: ${t}`);
    }
  });
});

describe('independent recomputation: algebra 2', () => {
  it('complex-numbers: imaginary coefficient', () => {
    for (const p of sample('complex-numbers')) {
      const m = must(p.problemText.match(/^\$\((.+)\) ([+-]) \((.+)\)\$/), p);
      const b1 = coef(terms(m[1]), 'i');
      const b2 = coef(terms(m[3]), 'i');
      expect(num(p)).toBe(m[2] === '+' ? b1 + b2 : b1 - b2);
    }
  });

  it('rational-expressions: lowest terms are required, as the prompt says', () => {
    for (const p of sample('rational-expressions')) {
      const m = must(p.problemText.match(/\\frac\{(\d+)x\}\{(\d+)x\}/), p);
      expect(p.problemText).toMatch(/lowest terms/);
      const [a, b] = [int(m[1]), int(m[2])];
      const f = simplifyFraction(a, b);
      expect(p.answer).toEqual({ kind: 'fraction', ...f, lowestTerms: true });
      expect(validateAnswer(p, `${f.numerator}/${f.denominator}`)).toBe(true);
      expect(validateAnswer(p, `${2 * f.numerator}/${2 * f.denominator}`)).toBe(false);
    }
  });

  it('radicals: largest perfect-square factor', () => {
    for (const p of sample('radicals')) {
      const m = must(p.problemText.match(/\\sqrt\{(\d+)\}/), p);
      const n = int(m[1]);
      let best = 1;
      for (let k = 1; k * k <= n; k++) if (n % (k * k) === 0) best = k;
      expect(num(p)).toBe(best);
    }
  });

  it('logarithms', () => {
    for (const p of sample('logarithms')) {
      const m = must(p.problemText.match(/\\log_\{(\d+)\}\((\d+)\)/), p);
      expect(num(p)).toBeCloseTo(Math.log(int(m[2])) / Math.log(int(m[1])), 9);
    }
  });

  // "Does it converge? If so, to what?" is a two-part answer: the verdict and,
  // when it converges, the limit. Omitting either part earns no credit, and
  // every such question has the same shape, so the shape reveals nothing.
  const expectConvergence = (p: Problem, limit: number | null) => {
    expect(p.answer.kind).toBe('multipart');
    if (p.answer.kind === 'multipart') expect(p.answer.parts.map(part => part.label)).toEqual(['Verdict', 'Limit']);
    if (limit === null) {
      expect(validateAnswer(p, ['diverges', ''])).toBe(true);
      expect(validateAnswer(p, ['converges', '0'])).toBe(false);
      expect(validateAnswer(p, ['converges', '1'])).toBe(false);
    } else {
      expect(validateAnswer(p, ['converges', String(limit)])).toBe(true);
      expect(validateAnswer(p, ['converges', ''])).toBe(false);          // limit omitted
      expect(validateAnswer(p, ['converges', String(limit + 1)])).toBe(false);
      expect(validateAnswer(p, ['diverges', ''])).toBe(false);
      expect(validateAnswer(p, ['diverges', String(limit)])).toBe(false);
    }
    // single free-text answers are not accepted for a two-part question
    expect(validateAnswer(p, 'yes')).toBe(false);
    expect(validateAnswer(p, 'converges')).toBe(false);
    expect(validateAnswer(p, String(limit ?? 'diverges'))).toBe(false);
  };

  it('sequences-series and sequences (nth terms)', () => {
    for (const p of [...sample('sequences-series'), ...sample('sequences', 80)]) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      const ordinal = /\$(\d+)\$(st|nd|rd|th) term/.exec(t);
      if (ordinal) {
        const n = int(ordinal[1]);
        const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
        expect(ordinal[2], t).toBe(suffix);
      }
      if ((m = t.match(/starts at \$(\d+)\$ with common difference \$d = (\d+)\$. Find the \$(\d+)\$\w\w term/))) expect(num(p)).toBe(int(m[1]) + (int(m[3]) - 1) * int(m[2]));
      else if ((m = t.match(/starts at \$(\d+)\$ with common ratio \$r = (\d+)\$. Find the \$(\d+)\$\w\w term/))) expect(num(p)).toBe(int(m[1]) * int(m[2]) ** (int(m[3]) - 1));
      else if ((m = t.match(/Find the \$(\d+)\$\w\w term of the arithmetic sequence:\n\$a_1 = (\d+)\$, \$d = (\d+)\$/))) expect(num(p)).toBe(int(m[2]) + (int(m[1]) - 1) * int(m[3]));
      else if ((m = t.match(/Find the \$(\d+)\$\w\w term of the geometric sequence:\n\$a_1 = (\d+)\$, \$r = (\d+)\$/))) expect(num(p)).toBe(int(m[2]) * int(m[3]) ** (int(m[1]) - 1));
      else if (/\\frac\{1\}\{n\}\$ converge/.test(t)) expectConvergence(p, 0);          // 1/n → 0
      else if (/\\frac\{n\+1\}\{n\}\$ converge/.test(t)) expectConvergence(p, 1);      // 1 + 1/n → 1
      else if (/\\frac\{n\}\{n\+1\}\$ is increasing/.test(t)) expectConvergence(p, 1); // MCT, n/(n+1) → 1
      else if (/\\frac\{1\}\{n!\}\$ is decreasing/.test(t)) expectConvergence(p, 0);  // MCT, 1/n! → 0
      else if (/\(-1\)\^n\$ converge/.test(t) || /n\^2\$ converge/.test(t)) expectConvergence(p, null);
      else if (/monotonic\?/.test(t)) {
        // terms −1, 1/2, −1/3, … alternate in sign: not monotonic
        expect(p.answer.kind).toBe('choice');
        expect(validateAnswer(p, 'no')).toBe(true);
        expect(validateAnswer(p, 'yes')).toBe(false);
      }
      else throw new Error(`Unrecognised sequence problem: ${t}`);
    }
  });
});

describe('independent recomputation: trigonometry', () => {
  it('trig-ratios from the displayed sides', () => {
    for (const p of sample('trig-ratios')) {
      const m = must(p.problemText.match(/sides \$(\d+)\$, \$(\d+)\$, \$(\d+)\$ \(hypotenuse\), find \$\\(sin|cos|tan)\(\\theta\)\$ where \$\\theta\$ is opposite to side \$(\d+)\$/), p);
      const [a, b, c, opp] = [int(m[1]), int(m[2]), int(m[3]), int(m[5])];
      expect(a * a + b * b).toBe(c * c);
      const adj = opp === a ? b : a;
      const expected = m[4] === 'sin' ? opp / c : m[4] === 'cos' ? adj / c : opp / adj;
      expect(num(p)).toBeCloseTo(expected, 12);
      expect(validateAnswer(p, expected.toFixed(3))).toBe(true);
      expect(validateAnswer(p, (Number(expected.toFixed(3)) + 0.002).toFixed(3))).toBe(false);
    }
  });

  it('trig-special-angles against Math.sin/cos/tan', () => {
    for (const p of sample('trig-special-angles')) {
      const m = must(p.problemText.match(/\\(sin|cos|tan)\((\d+)°\)/), p);
      const expected = trig(m[1], int(m[2]));
      expect(num(p)).toBeCloseTo(expected, 12);
      expect(validateAnswer(p, expected.toFixed(3))).toBe(true);
      expect(validateAnswer(p, (Number(expected.toFixed(3)) + 0.002).toFixed(3))).toBe(false);
    }
  });

  it('trig-equations: the displayed exact value is the ratio of the stored angle', () => {
    for (const p of sample('trig-equations')) {
      const m = must(p.problemText.match(/\$\\(sin|cos|tan)\(\\theta\) = (.+)\$$/), p);
      const value = EXACT_LATEX[m[2]];
      expect(value, `unknown exact value ${m[2]}`).toBeDefined();
      expect(trig(m[1], num(p))).toBeCloseTo(value, 12);
      expect(num(p)).toBeGreaterThanOrEqual(0);
      expect(num(p)).toBeLessThanOrEqual(90);
    }
  });

  it('inverse-trig: the stored angle is the principal value', () => {
    for (const p of sample('inverse-trig')) {
      const m = must(p.problemText.match(/\$\\(sin|cos|tan)\^\{-1\}\\left\((.+)\\right\)\$$/), p);
      const value = EXACT_LATEX[m[2]];
      expect(value, `unknown exact value ${m[2]}`).toBeDefined();
      const inverse = { sin: Math.asin, cos: Math.acos, tan: Math.atan }[m[1]]!;
      expect(inverse(value) * 180 / Math.PI).toBeCloseTo(num(p), 9);
    }
  });

  it('trig-identities: the canonical answer equals the left-hand side numerically', () => {
    const lhs: Record<string, (t: number) => number> = {
      '\\sin^2\\theta + \\cos^2\\theta': t => Math.sin(t) ** 2 + Math.cos(t) ** 2,
      '\\tan\\theta': Math.tan,
      '1 + \\tan^2\\theta': t => 1 + Math.tan(t) ** 2,
      '\\sin(90° - \\theta)': t => Math.sin(Math.PI / 2 - t),
      '\\cos(90° - \\theta)': t => Math.cos(Math.PI / 2 - t),
    };
    for (const p of sample('trig-identities')) {
      const m = must(p.problemText.match(/identity: \$(.+) = \\;\?\$/), p);
      const f = lhs[m[1]];
      expect(f, `unknown identity ${m[1]}`).toBeDefined();
      for (const t of [0.3, 0.8, 1.2, 2.4]) {
        expect(evalAt(ref(p), { theta: t })).toBeCloseTo(f(t), 9);
      }
    }
  });
});

describe('independent recomputation: pre-calculus', () => {
  it('functions', () => {
    for (const p of sample('functions')) {
      const m = must(p.problemText.match(/\$f\(x\) = (.+)\$, find \$f\((-?\d+)\)\$/), p);
      const t = terms(m[1]);
      expect(num(p)).toBe(coef(t, 'x') * int(m[2]) + coef(t, ''));
    }
  });

  it('polynomial-functions: the answer is exactly the set of real roots', () => {
    for (const p of sample('polynomial-functions')) {
      const m = must(p.problemText.match(/roots of \$(.+) = 0\$/), p);
      const t = terms(m[1]);
      expect(coef(t, 'x^2')).toBe(1);
      const [s, c] = [coef(t, 'x'), coef(t, '')];
      expect(p.answer.kind).toBe('finiteSet');
      if (p.answer.kind !== 'finiteSet') continue;
      const roots = p.answer.elements;
      for (const root of roots) expect(root * root + s * root + c).toBe(0);
      const disc = s * s - 4 * c;
      expect(roots.length).toBe(disc > 0 ? 2 : disc === 0 ? 1 : 0);
      expect(validateAnswer(p, roots.join(', '))).toBe(true);
      expect(validateAnswer(p, [...roots].reverse().join(' and '))).toBe(true);
      if (roots.length === 2) {
        expect(validateAnswer(p, String(roots[0]))).toBe(false);  // incomplete
        expect(validateAnswer(p, String(roots[1]))).toBe(false);
      }
      expect(validateAnswer(p, [...roots, 99].join(', '))).toBe(false); // extra root
    }
  });

  it('rational-functions', () => {
    for (const p of sample('rational-functions')) {
      const m = must(p.problemText.match(/\\frac\{1\}\{(.+?)\}\$/), p);
      const t = terms(m[1]);
      expect(coef(t, 'x')).toBe(1);
      expect(num(p)).toBe(-coef(t, ''));
    }
  });

  it('exponential-functions', () => {
    for (const p of sample('exponential-functions')) {
      const m = must(p.problemText.match(/starts at \$(\d+)\$ and doubles every period. What is the population after \$(\d+)\$/), p);
      expect(num(p)).toBe(int(m[1]) * 2 ** int(m[2]));
    }
  });

  it('conic-sections', () => {
    for (const p of sample('conic-sections')) {
      const m = must(p.problemText.match(/\$(?:\(x ([+-]) (\d+)\)|x)\^2 \+ (?:\(y ([+-]) (\d+)\)|y)\^2 = (\d+)\$/), p);
      const h = m[1] === undefined ? 0 : (m[1] === '-' ? 1 : -1) * int(m[2]);
      const r2 = int(m[5]);
      if (/radius/.test(p.problemText)) expect(num(p) ** 2).toBe(r2);
      else expect(num(p)).toBe(h);
    }
  });
});

describe('independent recomputation: calculus 1', () => {
  it('limits', () => {
    for (const p of sample('limits')) {
      const m = must(p.problemText.match(/\\lim_\{x \\to (\d+)\} \\left\[(.+)\\right\]/), p);
      const t = terms(m[2]);
      expect(num(p)).toBe(coef(t, 'x') * int(m[1]) + coef(t, ''));
    }
  });

  it('derivatives-basic: coefficient via mathjs derivative', () => {
    for (const p of sample('derivatives-basic')) {
      const m = must(p.problemText.match(/derivative of \$(\d+)x\^\{(\d+)\}\$/), p);
      const d = derivative(`${m[1]}*x^${m[2]}`, 'x');
      expect(d.evaluate({ x: 1 })).toBe(num(p)); // coefficient = derivative at x=1 for a monomial
    }
  });

  it('derivatives-product-quotient: exponent', () => {
    for (const p of sample('derivatives-product-quotient')) {
      let m = p.problemText.match(/x\^\{(\d+)\} \\cdot x\^\{(\d+)\}/);
      if (m) { expect(num(p)).toBe(int(m[1]) + int(m[2]) - 1); continue; }
      m = must(p.problemText.match(/\\frac\{x\^\{(\d+)\}\}\{x\^\{(\d+)\}\}/), p);
      expect(int(m[1])).not.toBe(int(m[2]));
      expect(num(p)).toBe(int(m[1]) - int(m[2]) - 1);
    }
  });

  it('chain-rule: K via mathjs derivative', () => {
    for (const p of sample('chain-rule')) {
      const m = must(p.problemText.match(/\((\d+)x \+ (\d+)\)\^\{(\d+)\}/), p);
      const [a, b, n] = [int(m[1]), int(m[2]), int(m[3])];
      const d = derivative(`(${a}*x+${b})^${n}`, 'x');
      for (const x of [0.5, 1.3]) {
        expect(d.evaluate({ x })).toBeCloseTo(num(p) * (a * x + b) ** (n - 1), 6);
      }
    }
  });

  it('integrals-basic: exponent', () => {
    for (const p of sample('integrals-basic')) {
      const m = must(p.problemText.match(/\\int (\d+)x(?:\^\{(\d+)\})?\\,dx/), p);
      expect(num(p)).toBe((m[2] === undefined ? 1 : int(m[2])) + 1);
    }
  });

  it('integration-substitution: u is the inner function', () => {
    for (const p of sample('integration-substitution')) {
      const m = must(p.problemText.match(/\\int 2x\(x\^2 \+ (\d+)\)\^\{(\d+)\}/), p);
      expect(ref(p)).toBe(`x^2+${m[1]}`);
      expect(validateAnswer(p, `x² + ${m[1]}`)).toBe(true);
      expect(validateAnswer(p, `x^2+${int(m[1]) + 1}`)).toBe(false);
    }
  });
});

describe('independent recomputation: calculus 2 — antiderivatives differentiate back to the integrand', () => {
  const INTEGRANDS: [RegExp, string][] = [
    [/\\int x \\cdot e\^x/, 'x*e^x'],
    [/\\int x \\cdot \\cos\(x\)/, 'x*cos(x)'],
    [/\\int x \\cdot \\sin\(x\)/, 'x*sin(x)'],
    [/\\int \\ln\(x\)/, 'log(x)'],
    [/\\int \\sin\^2\(x\)/, 'sin(x)^2'],
    [/\\int \\cos\^2\(x\)/, 'cos(x)^2'],
    [/\\int \\sin\(x\)\\cos\(x\)/, 'sin(x)*cos(x)'],
    [/\\int \\tan\(x\)/, 'tan(x)'],
    [/\\int \\sec\^2\(x\)\\tan\(x\)/, 'sec(x)^2*tan(x)'],
  ];
  it('integration-by-parts and trig-integrals', () => {
    for (const p of [...sample('integration-by-parts', 20), ...sample('trig-integrals', 25)]) {
      const entry = INTEGRANDS.find(([re]) => re.test(p.problemText));
      if (!entry) throw new Error(`Unrecognised integral: ${p.problemText}`);
      expect(p.answer.kind).toBe('antiderivative');
      if (p.answer.kind !== 'antiderivative') continue;
      // the stored integrand (what the grader differentiates against) is the displayed one
      for (const x of [0.4, 0.9, 1.3, 2.2]) {
        expect(evaluate(p.answer.integrand, { x })).toBeCloseTo(evaluate(entry[1], { x }), 10);
      }
      const d = derivative(ref(p), 'x');
      for (const x of [0.4, 0.9, 1.3, 2.2]) {
        expect(d.evaluate({ x })).toBeCloseTo(evaluate(entry[1], { x }), 8);
      }
      // grader: the stored form and a shifted copy pass; the integrand fails
      expect(validateAnswer(p, ref(p))).toBe(true);
      expect(validateAnswer(p, `${ref(p)} + 5`)).toBe(true);
      expect(validateAnswer(p, `${ref(p)} + C`)).toBe(true);
      expect(validateAnswer(p, entry[1])).toBe(false);
    }
  });
});

describe('independent recomputation: calculus 2 — values', () => {
  it('partial-fractions via cover-up', () => {
    for (const p of sample('partial-fractions', 60)) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/\\frac\{1\}\{\(x - (\d+)\)\(x \+ (\d+)\)\}[\s\S]*What is \$A\$/))) {
        const [a, b] = [int(m[1]), -int(m[2])];
        expect(num(p)).toBeCloseTo(1 / (a - b), 12);
        expect(validateAnswer(p, `1/${a - b}`)).toBe(true);
      } else if ((m = t.match(/\\frac\{1\}\{\(x - (\d+)\)\(x \+ (\d+)\)\}[\s\S]*What is \$B\$/))) {
        const [a, b] = [int(m[1]), -int(m[2])];
        expect(num(p)).toBeCloseTo(1 / (b - a), 12);
        expect(validateAnswer(p, `-1/${a - b}`)).toBe(true);
      } else if ((m = t.match(/\\frac\{(\d+)\}\{\(x - (\d+)\)\^2\}/))) {
        expect(num(p)).toBe(int(m[1]));
      } else if ((m = t.match(/\\frac\{1\}\{\(x - (\d+)\)\(x\^2 \+ 1\)\}/))) {
        expect(num(p)).toBeCloseTo(1 / (int(m[1]) ** 2 + 1), 12);
      } else throw new Error(`Could not parse: ${t}`);
    }
  });

  it('improper integrals by numeric integration to a large bound', () => {
    for (const p of sample('improper-integrals', 30)) {
      const t = p.problemText;
      if (/\\frac\{1\}\{x\^2\}/.test(t)) expect(num(p)).toBeCloseTo(integrate(x => 1 / (x * x), 1, 2000, 400000), 3);
      else if (/\\frac\{1\}\{x\^3\}/.test(t)) expect(num(p)).toBeCloseTo(integrate(x => 1 / (x ** 3), 1, 500, 200000), 4);
      else if (/e\^\{-x\}/.test(t)) expect(num(p)).toBeCloseTo(integrate(x => Math.exp(-x), 0, 60), 6);
      else if (/\\frac\{1\}\{x\}\\,dx\$\nDoes/.test(t)) expect(ref(p)).toBe('diverges');
      else if (/For which \$p\$/.test(t)) expect(validateAnswer(p, 'p > 1')).toBe(true);
      else throw new Error(`Unrecognised: ${t}`);
    }
  });

  it('series sums by partial summation; verdicts by known tests', () => {
    for (const p of sample('series-convergence', 40)) {
      const t = p.problemText;
      const geometric = t.match(/\\left\(\\frac\{(\d+)\}\{(\d+)\}\\right\)\^n/);
      if (geometric && /What is the sum/.test(t)) {
        const r = int(geometric[1]) / int(geometric[2]);
        let s = 0; for (let n = 0; n < 200; n++) s += r ** n;
        expect(num(p)).toBeCloseTo(s, 9);
      } else if (geometric) {
        expect(ref(p)).toBe(int(geometric[1]) > int(geometric[2]) ? 'diverges' : 'converges');
      } else if (/\\frac\{1\}\{n\}\$ converge/.test(t)) expect(ref(p)).toBe('diverges');
      else if (/\\frac\{1\}\{n\^2\}\$ converge or diverge/.test(t)) expect(ref(p)).toBe('converges');
      else if (/\\frac\{n!\}\{2\^n\}/.test(t) || /\\frac\{n\}\{n\+1\}/.test(t)) expect(ref(p)).toBe('diverges');
      else if (/\\frac\{\(-1\)\^\{n\+1\}\}\{n\}/.test(t)) expect(ref(p)).toBe('converges');
      else if (/Nth-Term Test tell us it converges/.test(t)) expect(ref(p)).toBe('no');
      else throw new Error(`Unrecognised: ${t}`);
    }
  });

  it('power series radii by the ratio test on coefficients', () => {
    const radius: [RegExp, number | string][] = [
      [/\\frac\{x\^n\}\{n!\}/, 'infinity'],
      [/\\sum_\{n=0\}\^\{\\infty\} x\^n\$/, 1],
      [/nx\^n/, 1],
      [/\\frac\{x\^n\}\{2\^n\}/, 2],
      [/\\frac\{x\^n\}\{n\}\$/, 1],
    ];
    for (const p of sample('power-series', 25)) {
      const entry = radius.find(([re]) => re.test(p.problemText));
      if (!entry) throw new Error(`Unrecognised: ${p.problemText}`);
      expect(p.answer.kind === 'text' ? ref(p) : num(p)).toBe(entry[1]);
    }
    const [infinite] = sampleWhere('power-series', q => /n!/.test(q.problemText), 1);
    expect(validateAnswer(infinite, '∞')).toBe(true);
    expect(validateAnswer(infinite, 'inf')).toBe(true);
    expect(validateAnswer(infinite, '1')).toBe(false);
    expect(validateAnswer(infinite, '0')).toBe(false);
  });

  it('Maclaurin polynomials approximate their functions with the expected error order', () => {
    const targets: [RegExp, (x: number) => number, number][] = [
      [/for \$e\^x\$\?/, Math.exp, 4],
      [/\\sin\(x\)\$\?/, Math.sin, 7],
      [/\\cos\(x\)\$\?/, Math.cos, 6],
      [/\\frac\{1\}\{1-x\}/, x => 1 / (1 - x), 4],
    ];
    for (const p of sampleWhere('taylor-maclaurin', q => q.answer.kind === 'expression', 12)) {
      const entry = targets.find(([re]) => re.test(p.problemText));
      if (!entry) throw new Error(`Unrecognised: ${p.problemText}`);
      const [, f, order] = entry;
      for (const x of [0.05, 0.1]) {
        const err = Math.abs(evalAt(ref(p), { x }) - f(x));
        expect(err).toBeLessThan(2 * Math.pow(x, order)); // truncation error is O(x^order)
      }
    }
    const [alt] = sampleWhere('taylor-maclaurin', q => /Alternating Series Remainder/.test(q.problemText), 1);
    expect(num(alt)).toBe(0.2);
    expect(validateAnswer(alt, '1/5')).toBe(true);
  });

  it('parametric equations', () => {
    for (const p of sample('parametric-equations', 60)) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/\$x = t \+ (\d+)\$, \$y = t\^2(?: ([+-]) (\d+))?\$/))) {
        const a = int(m[1]); const b = m[2] === undefined ? 0 : (m[2] === '-' ? -1 : 1) * int(m[3]);
        for (const tt of [0.3, 1.7, -2.1]) {
          expect(evalAt(ref(p), { x: tt + a })).toBeCloseTo(tt * tt + b, 9);
        }
        expect(validateAnswer(p, `y = ${ref(p)}`)).toBe(true);
        expect(validateAnswer(p, `x = ${ref(p)}`)).toBe(false);
      } else if ((m = t.match(/\$x = t\^2\$, \$y = t\^3\$\nFind \$\\frac\{dy\}\{dx\}\$ at \$t = (\d+)\$/))) {
        const tt = int(m[1]);
        expect(num(p)).toBeCloseTo(3 * tt * tt / (2 * tt), 12);
        expect(validateAnswer(p, `${3 * tt}/2`)).toBe(true);
      } else if ((m = t.match(/\$x = (\d+)t\$, \$y = t\^2\$\nWhat is the \$y\$-coordinate when \$t = (\d+)\$/))) {
        expect(num(p)).toBe(int(m[2]) ** 2);
      } else throw new Error(`Could not parse: ${t}`);
    }
  });

  it('polar coordinates with atan2 / sqrt / cos / sin', () => {
    for (const p of sample('polar-coordinates', 80)) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/Convert \$\((\d+), (\d+)\)\$ from Cartesian to polar.\nWhat is \$r\$/))) {
        const r = Math.hypot(int(m[1]), int(m[2]));
        expect(num(p)).toBeCloseTo(r, 12);
        expect(validateAnswer(p, r.toFixed(2))).toBe(true);
        expect(validateAnswer(p, (Number(r.toFixed(2)) + 0.02).toFixed(2))).toBe(false);
      } else if ((m = t.match(/Convert \$\((\d+), (\d+)\)\$ from Cartesian to polar.\nWhat is \$\\theta\$/))) {
        const deg = ((Math.atan2(int(m[2]), int(m[1])) * 180 / Math.PI) + 360) % 360;
        expect(num(p)).toBeCloseTo(deg, 9);
      } else if ((m = t.match(/\$\(r=(\d+),\\; \\theta=(\d+)°\)\$ to Cartesian.\nWhat is \$x\$/))) {
        const x = int(m[1]) * Math.cos(int(m[2]) * Math.PI / 180);
        expect(num(p)).toBeCloseTo(x, 9);
        expect(validateAnswer(p, x.toFixed(2))).toBe(true);
      } else if ((m = t.match(/\$\(r=(\d+),\\; \\theta=(\d+)°\)\$ to Cartesian.\nWhat is \$y\$/))) {
        expect(num(p)).toBeCloseTo(int(m[1]) * Math.sin(int(m[2]) * Math.PI / 180), 9);
      } else if (/What type of curve/.test(t)) {
        expect(/\\theta = /.test(t) ? 'line' : 'circle').toBe(ref(p));
        if (/\\theta = /.test(t)) {
          expect(t).toMatch(/allowed to be negative/); // the convention that makes "line" the unique answer
          expect(validateAnswer(p, 'ray')).toBe(false);
        }
      } else throw new Error(`Could not parse: ${t}`);
    }
  });

  it('integration applications by Simpson\'s rule', () => {
    for (const p of sample('integration-applications', 60)) {
      const t = p.problemText;
      let m: RegExpMatchArray | null;
      let expected: number;
      if ((m = t.match(/revolving \$y = x\$ around the x-axis from \$x = 0\$ to \$x = (\d+)\$/))) {
        const a = int(m[1]); expected = Math.PI * integrate(x => x * x, 0, a);
      } else if (/between \$y = x\$ and \$y = x\^2\$/.test(t)) {
        expected = Math.PI * integrate(x => x * x - x ** 4, 0, 1);
      } else if ((m = t.match(/shell method[\s\S]*from \$x=0\$ to \$x=(\d+)\$/))) {
        const a = int(m[1]); expected = 2 * Math.PI * integrate(x => x * x * x, 0, a);
      } else if ((m = t.match(/arc length of \$y = x\$ from \$x = 0\$ to \$x = (\d+)\$/))) {
        const a = int(m[1]); expected = integrate(() => Math.SQRT2, 0, a);
      } else if ((m = t.match(/surface area when \$y = x\$ from \$x = 0\$ to \$x = (\d+)\$/))) {
        const a = int(m[1]); expected = 2 * Math.PI * integrate(x => x * Math.SQRT2, 0, a);
      } else throw new Error(`Could not parse: ${t}`);
      expect(num(p)).toBeCloseTo(expected, 6);
      const tolerance = numberSpec(p).tolerance;
      if (tolerance.kind !== 'decimalPlaces') throw new Error(`expected a rounding tolerance: ${t}`);
      const places = tolerance.places;
      expect(validateAnswer(p, expected.toFixed(places))).toBe(true);
      expect(validateAnswer(p, (Number(expected.toFixed(places)) + 2 * Math.pow(10, -places)).toFixed(places))).toBe(false);
    }
  });

  it('trig substitutions turn the radicand into a perfect square; quarter circle integrates to π/4', () => {
    for (const p of sample('trig-substitution', 30)) {
      const t = p.problemText;
      if (/4 - x\^2/.test(t)) {
        for (const th of [0.3, 1.1]) expect(Math.sqrt(4 - (2 * Math.sin(th)) ** 2)).toBeCloseTo(2 * Math.cos(th), 12);
        expect(validateAnswer(p, 'x = 2 sin(theta)')).toBe(true);
      } else if (/x\^2 \+ 9/.test(t)) {
        for (const th of [0.3, 1.1]) expect(Math.sqrt((3 * Math.tan(th)) ** 2 + 9)).toBeCloseTo(3 / Math.cos(th), 12);
        expect(validateAnswer(p, 'x = 3tan(θ)')).toBe(true);
      } else if (/x\^2 - 16/.test(t)) {
        for (const th of [0.3, 1.1]) expect(Math.sqrt((4 / Math.cos(th)) ** 2 - 16)).toBeCloseTo(4 * Math.tan(th), 12);
        expect(validateAnswer(p, 'x = 4sec(θ)')).toBe(true);
      } else if (/quarter-circle/.test(t)) {
        expect(num(p)).toBeCloseTo(integrate(x => Math.sqrt(1 - x * x), 0, 1, 20000), 3);
        expect(validateAnswer(p, 'pi/4')).toBe(true);
        expect(validateAnswer(p, '0.79')).toBe(false);
      } else throw new Error(`Unrecognised: ${t}`);
    }
  });
});

// ===========================================================================
// Every generated problem: the canonical answer passes, a perturbed one fails
// ===========================================================================

describe('every family rejects a perturbed answer', () => {
  for (const topic of GENERATORS.keys()) {
    it(topic, () => {
      for (const p of sample(topic, 15)) {
        const correct = canonicalInput(p.answer);
        expect(validateAnswer(p, correct), `${p.problemText} rejected ${JSON.stringify(correct)}`).toBe(true);
        for (const wrong of wrongInputs(p.answer)) {
          expect(validateAnswer(p, wrong), `${p.problemText} accepted ${JSON.stringify(wrong)}`).toBe(false);
        }
        // a single string for a multipart answer, or several strings for a single one, is never an answer
        if (Array.isArray(correct)) expect(validateAnswer(p, correct.join(' '))).toBe(false);
        else expect(validateAnswer(p, [correct])).toBe(false);
        expect(validateAnswer(p, '0/0')).toBe(false);
        expect(validateAnswer(p, '')).toBe(false);
      }
    });
  }
});
