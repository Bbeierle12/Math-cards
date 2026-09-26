/**
 * Development-only CAS oracle, step 1 of 2: turn generated problems into
 * symbolic claims.
 *
 * For every generator and seed, the claim is reconstructed from what the
 * student SEES (the prompt text, parsed independently of the generator) and
 * the answer key; scripts/oracle/check.py then proves or refutes each claim
 * with SymPy. The seeds are the ones the sweep uses (`sweep-${i}`).
 *
 * Run: npm run oracle   (needs python3 with sympy; not part of the app build)
 */
import { it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from 'mathjs';
import { GENERATORS, generateProblem } from '../../services/generators';
import { normalizeMathExpr, referenceNumber } from '../../services/grading';
import { coef, latexToExpr, terms } from '../../services/testing/latex';
import type { Problem } from '../../types';

const SEEDS = Number(process.env.ORACLE_SEEDS || 300);
const OUT = process.env.ORACLE_OUT || 'scripts/oracle/out/claims.json';

/**
 * A claim for SymPy. Expressions are SymPy-parsable strings (`^` is accepted
 * as power). `value` strings may be exact SymPy expressions ('pi/4', 'oo').
 */
type Claim =
  | { type: 'identity'; a: string; b: string }                                  // a ≡ b
  | { type: 'derivative'; f: string; g: string; x: string }                    // f' ≡ g
  | { type: 'antiderivative'; F: string; f: string; x: string }                // F' ≡ f
  | { type: 'definite'; f: string; x: string; a: string; b: string; value: string } // ∫_a^b f = value
  | { type: 'roots'; poly: string; x: string; roots: number[]; exact: boolean } // real roots of poly = 0 (exactly these, or including these)
  | { type: 'limit'; expr: string; x: string; at: string; value: string }      // 'none' = no limit
  | { type: 'sum'; term: string; n: string; start: number; value: string }     // Σ = value
  | { type: 'converges'; term: string; n: string; start: number; value: boolean }
  | { type: 'radius'; coef: string; n: string; value: string }                 // radius of Σ coef·x^n
  | { type: 'maclaurin'; f: string; x: string; order: number; poly: string }
  | { type: 'value'; expr: string; value: string }                             // expr = value
  | { type: 'monotonic'; expr: string; n: string; value: boolean };           // a_n monotonic for n ≥ 1

interface Record_ { topic: string; seed: string; templateId: string; problemText: string; claims: Claim[] }

/** mathjs reference → SymPy/Python text (explicit products; e → E; abs → Abs; ^ → **). */
const sym = (expr: string): string => {
  const node = parse(normalizeMathExpr(expr));
  return node.toString({ implicit: 'show', parenthesis: 'keep' })
    .replace(/\be\b/g, 'E')
    .replace(/\babs\(/g, 'Abs(')
    .replace(/\b(\w+)!/g, 'factorial($1)')
    .replace(/\^/g, '**');
};
/** Displayed polynomial ("x^2 - 5x") → SymPy text. */
const poly = (latex: string, v = 'x'): string =>
  Object.entries(terms(latex)).map(([mono, c]) => `(${c})*${mono === '' ? '1' : mono.replace('^', '**')}`).join(' + ') || '0';
const num = (p: Problem): string => {
  const v = referenceNumber(p.answer);
  if (v === null) throw new Error(`not numeric: ${p.problemText}`);
  return String(v);
};
const verdict = (p: Problem): string | null => (p.answer.kind === 'choice' ? p.answer.answer : null);
/** Displayed LaTeX → SymPy text. */
const texSym = (tex: string): string => sym(latexToExpr(tex));
/** The key of a convergence question: its value as a string, or null for "diverges". */
const convergenceValue = (p: Problem): string | null => {
  if (p.answer.kind !== 'multipart') throw new Error(`not a convergence question: ${p.problemText}`);
  const [v, value] = p.answer.parts;
  if (v.spec?.kind !== 'choice') throw new Error('no verdict');
  return v.spec.answer === 'diverges' ? null : value.spec && value.spec.kind === 'number' ? String(value.spec.value) : 'nan';
};
const m = (p: Problem, re: RegExp): RegExpMatchArray => {
  const r = p.problemText.match(re);
  if (!r) throw new Error(`unparsed prompt for ${p.topicId}/${p.templateId}: ${p.problemText}`);
  return r;
};

const claimsFor = (p: Problem): Claim[] | null => {
  switch (p.topicId) {
    case 'quadratic-equations': {
      const [, q] = m(p, /Solve for \$x\$: \$(.+) = 0\$/);
      return [{ type: 'roots', poly: poly(q), x: 'x', roots: [Number(num(p))], exact: false }, { type: 'value', expr: `Max(*solve(${poly(q)}, x))`, value: num(p) }];
    }
    case 'factoring': {
      const [, q] = m(p, /Factor: \$(.+)\$/);
      // the constants k in (x + k): negatives of the roots; the answer is the smaller one
      return [{ type: 'value', expr: `Min(*[-r for r in solve(${poly(q)}, x)])`, value: num(p) }];
    }
    case 'polynomial-functions': {
      const [, q] = m(p, /roots of \$(.+) = 0\$/);
      return p.answer.kind === 'finiteSet' ? [{ type: 'roots', poly: poly(q), x: 'x', roots: p.answer.elements, exact: true }] : null;
    }
    case 'rational-functions': {
      const [, top, bottom] = m(p, /\\frac\{(.+?)\}\{(.+?)\}\$/);
      if (/vertical asymptote/.test(p.problemText)) {
        // a pole: the denominator vanishes and the function is unbounded there
        return [
          { type: 'roots', poly: poly(bottom), x: 'x', roots: [Number(num(p))], exact: true },
          { type: 'value', expr: `Piecewise((1, Ne(S(${poly(top)}).subs(x, ${num(p)}), 0)), (0, True))`, value: '1' },
        ];
      }
      return [{ type: 'limit', expr: `(${poly(top)})/(${poly(bottom)})`, x: 'x', at: 'oo', value: num(p) }];
    }
    case 'limits': {
      const [, at, body] = m(p, /\\lim_\{x \\to (-?\d+)\} \\left\[(.+)\\right\]/);
      return [{ type: 'limit', expr: poly(body), x: 'x', at, value: num(p) }];
    }
    case 'derivatives-basic': {
      const [, c, n] = m(p, /derivative of \$(\d+)x\^\{(\d+)\}\$/);
      return [{ type: 'derivative', f: `${c}*x**${n}`, g: `${num(p)}*x**(${n}-1)`, x: 'x' }];
    }
    case 'derivatives-product-quotient': {
      const e = num(p);
      const prod = p.problemText.match(/x\^\{(\d+)\} \\cdot x\^\{(\d+)\}/);
      const quot = p.problemText.match(/\\frac\{x\^\{(\d+)\}\}\{x\^\{(\d+)\}\}/);
      const f = prod ? `x**${prod[1]}*x**${prod[2]}` : quot ? `x**${quot[1]}/x**${quot[2]}` : null;
      return f ? [{ type: 'derivative', f, g: `(${e}+1)*x**(${e})`, x: 'x' }] : null;
    }
    case 'chain-rule': {
      const [, inner, n] = m(p, /\\left\[\((.+)\)\^\{(\d+)\}\\right\]/);
      const u = poly(inner);
      return [{ type: 'derivative', f: `(${u})**${n}`, g: `${num(p)}*(${u})**(${n}-1)`, x: 'x' }];
    }
    case 'integrals-basic': {
      const [, c, n] = m(p, /\\int (\d+)x(?:\^\{(\d+)\})?\\,dx/);
      const e = num(p);
      return [{ type: 'antiderivative', F: `${c}/(${e})*x**(${e})`, f: `${c}*x**${n ?? 1}`, x: 'x' }];
    }
    case 'integration-substitution': {
      const [, factor, inner, n] = m(p, /\\int (.+?)\(((?:\\sin\(x\)|e\^x|x\^\d) \+ \d+)\)\^\{(\d+)\}\\,dx/);
      if (p.answer.kind !== 'anyOf') return null;
      const options = p.answer.options.filter((o): o is Extract<typeof o, { kind: 'expression' }> => o.kind === 'expression');
      // every accepted u has derivative equal to the displayed factor
      return [
        ...options.map(o => ({ type: 'derivative', f: sym(o.reference), g: texSym(factor), x: 'x' } as Claim)),
        { type: 'identity', a: sym(options[0].reference), b: texSym(inner) },
        { type: 'antiderivative', F: `(${texSym(inner)})**(${n}+1)/(${n}+1)`, f: `${texSym(factor)}*(${texSym(inner)})**${n}`, x: 'x' },
      ];
    }
    case 'integration-by-parts':
    case 'trig-integrals': {
      // the integrand as displayed, not the one stored for the grader
      const [, shown] = m(p, /\\int (.+?)\\,dx\$/);
      return p.answer.kind === 'antiderivative' && p.answer.reference
        ? [
          { type: 'antiderivative', F: sym(p.answer.reference), f: texSym(shown), x: 'x' },
          { type: 'identity', a: sym(p.answer.integrand), b: texSym(shown) },
        ]
        : null;
    }
    case 'improper-integrals': {
      if (p.templateId === 'p-threshold') {
        // sample exponents on both sides of the claimed boundary
        const atInfinity = /int_1\^\{\\infty\}/.test(p.problemText);
        const claim = (pw: string, a: string, b: string, value: string): Claim => ({ type: 'definite', f: `x**(-(${pw}))`, x: 'x', a, b, value });
        const inSet = (v: number) => (p.answer.kind === 'interval' ? p.answer.set.some(iv => v > iv.lo && v < iv.hi) : false);
        // [exponent for SymPy, its value, ∫ x^(−p) over the interval]
        const rows: [string, number, string][] = atInfinity
          ? [['2', 2, '1'], ['Rational(3, 2)', 1.5, '2'], ['1', 1, 'oo'], ['Rational(1, 2)', 0.5, 'oo']]
          : [['Rational(1, 2)', 0.5, '2'], ['-1', -1, 'Rational(1, 2)'], ['1', 1, 'oo'], ['2', 2, 'oo']];
        // each sample must be in the key's set exactly when its integral converges
        return rows.map(([pw, v, value]) => (inSet(v) === (value !== 'oo')
          ? claim(pw, atInfinity ? '1' : '0', atInfinity ? 'oo' : '1', value)
          : { type: 'value', expr: '0', value: '1' }));
      }
      const [, lo, hi, integrand] = m(p, /\\int_(\d)\^\{(\\infty|1)\} (.+?)\\,dx\$ converge/);
      const value = convergenceValue(p);
      return [{ type: 'definite', f: texSym(integrand), x: 'x', a: lo, b: hi === '1' ? '1' : 'oo', value: value === null ? 'oo' : value }];
    }
    case 'partial-fractions': {
      if (p.templateId.startsWith('distinct-linear')) {
        const [, a, c] = m(p, /\\frac\{1\}\{\(x - (\d+)\)\(x \+ (\d+)\)\}/);
        const pole = p.templateId.endsWith('A') ? a : `-${c}`;
        return [{ type: 'value', expr: `cancel((x - (${pole}))/((x - ${a})*(x + ${c}))).subs(x, ${pole})`, value: num(p) }];
      }
      if (p.templateId === 'repeated-linear') {
        const [, n, a] = m(p, /\\frac\{(\d+)\}\{\(x - (\d+)\)\^2\}/);
        return [{ type: 'value', expr: `cancel((x - ${a})**2*${n}/(x - ${a})**2).subs(x, ${a})`, value: num(p) }];
      }
      const [, a] = m(p, /\\frac\{1\}\{\(x - (\d+)\)\(x\^2 \+ 1\)\}/);
      return [{ type: 'value', expr: `cancel((x - ${a})/((x - ${a})*(x**2 + 1))).subs(x, ${a})`, value: num(p) }];
    }
    case 'sequences': {
      let r: RegExpMatchArray | null;
      if ((r = p.problemText.match(/Does the sequence \$a_n = (.+)\$ converge or diverge/))) {
        return [{ type: 'limit', expr: texSym(r[1]), x: 'n', at: 'oo', value: convergenceValue(p) ?? 'none' }];
      }
      if ((r = p.problemText.match(/The sequence \$a_n = (.+)\$ is increasing and bounded above by \$(\d+)\$/))) {
        return [
          { type: 'monotonic', expr: texSym(r[1]), n: 'n', value: true },
          { type: 'value', expr: `Piecewise((1, Max(*[(${texSym(r[1])}).subs(n, k) for k in range(1, 200)]) <= ${r[2]}), (0, True))`, value: '1' },
          { type: 'limit', expr: texSym(r[1]), x: 'n', at: 'oo', value: convergenceValue(p) ?? 'none' },
        ];
      }
      if ((r = p.problemText.match(/Is the sequence \$a_n = (.+)\$ \(for \$n \\geq 1\$\) monotonic\?/))) {
        return [{ type: 'monotonic', expr: texSym(r[1]), n: 'n', value: verdict(p) === 'yes' }];
      }
      return null; // n-th term questions: arithmetic, recomputed in mathCorrectness.test.ts
    }
    case 'series-convergence': {
      const [, start, term] = m(p, /\\sum_\{n=(\d)\}\^\{\\infty\} (.+?)\$/);
      const v = verdict(p);
      if (v === null) {
        const value = convergenceValue(p);
        return value === null
          ? [{ type: 'converges', term: texSym(term), n: 'n', start: Number(start), value: false }]
          : [{ type: 'sum', term: texSym(term), n: 'n', start: Number(start), value }];
      }
      return [{ type: 'converges', term: texSym(term), n: 'n', start: Number(start), value: v === 'converges' }];
    }
    case 'power-series': {
      const [, series] = m(p, /\\sum_\{n=0\}\^\{\\infty\} (.+)\$/);
      const coefficient = texSym(series.replace(/\((x [+-] \d+)\)\^n/, '(1)').replace(/x\^n/, '(1)'));
      return [{ type: 'radius', coef: coefficient, n: 'n', value: referenceNumber(p.answer) === Infinity ? 'oo' : num(p) }];
    }
    case 'taylor-maclaurin': {
      let r: RegExpMatchArray | null;
      if ((r = p.problemText.match(/Maclaurin polynomial of degree \$(\d)\$ for \$(.+)\$\./)) && p.answer.kind === 'expression') {
        return [{ type: 'maclaurin', f: texSym(r[2]), x: 'x', order: Number(r[1]) + 1, poly: sym(p.answer.reference) }];
      }
      if ((r = p.problemText.match(/Maclaurin series for \$\\(sin|cos)\((.*?)\)\$\?/)) && p.answer.kind === 'expression') {
        return [{ type: 'maclaurin', f: texSym(`\\${r[1]}(${r[2]})`), x: 'x', order: r[1] === 'sin' ? 6 : 5, poly: sym(p.answer.reference) }];
      }
      if ((r = p.problemText.match(/coefficient of \$x\^\{(\d)\}\$ in the Maclaurin series for \$(.+?)\$\?/))) {
        return [{ type: 'value', expr: `series(${texSym(r[2])}, x, 0, ${Number(r[1]) + 1}).removeO().coeff(x, ${r[1]})`, value: num(p) }];
      }
      if ((r = p.problemText.match(/coefficient of \$\(x - (\d)\)\^\{(\d)\}\$ in the Taylor series of \$e\^x\$ centred at \$x = (\d)\$/))) {
        return [
          { type: 'value', expr: `diff(exp(x), x, ${r[2]}).subs(x, ${r[3]}) / factorial(${r[2]})`, value: num(p) },
          { type: 'value', expr: `${r[1]} - ${r[3]}`, value: '0' },
        ];
      }
      if ((r = p.problemText.match(/degree-\$(\d)\$ Maclaurin polynomial at \$x = (-?[\d.]+)\$/))) {
        const [n, h] = [r[1], `Rational('${r[2]}')`];
        return [
          { type: 'value', expr: `exp(Max(${h}, 0)) * Abs(${h})**(${n}+1) / factorial(${n}+1)`, value: num(p) },
          { type: 'value', expr: `Piecewise((1, Abs(exp(${h}) - series(exp(x), x, 0, ${n}+1).removeO().subs(x, ${h})) <= ${num(p)}), (0, True))`, value: '1' },
        ];
      }
      if ((r = p.problemText.match(/\\frac\{\(-1\)\^\{n\+1\}\}\{(n|n\^\{2\})\}\$ is approximated by its first \$(\d+)\$ terms/))) {
        const term = r[1] === 'n' ? '(-1)**(n+1)/n' : '(-1)**(n+1)/n**2';
        return [
          { type: 'value', expr: `(${term}).subs(n, ${Number(r[2]) + 1}) * (-1)**${Number(r[2])}`, value: num(p) },
          { type: 'value', expr: `Piecewise((1, Abs(summation(${term}, (n, 1, oo)) - summation(${term}, (n, 1, ${r[2]}))) <= ${num(p)}), (0, True))`, value: '1' },
        ];
      }
      return null;
    }
    case 'parametric-equations': {
      if (p.templateId === 'eliminate-shifted-parabola' && p.answer.kind === 'expression') {
        const [, a, sign, b] = m(p, /\$x = t \+ (\d+)\$, \$y = t\^2(?: ([+-]) (\d+))?\$/);
        const bb = sign ? `${sign}${b}` : '0';
        return [{ type: 'identity', a: `(${sym(p.answer.reference)}).subs(x, t + ${a})`, b: `t**2 + (${bb})` }];
      }
      if (p.templateId === 'dydx-t^2-t^3') {
        const [, t] = m(p, /at \$t = (\d+)\$/);
        return [{ type: 'value', expr: `(diff(t**3, t)/diff(t**2, t)).subs(t, ${t})`, value: num(p) }];
      }
      return null;
    }
    case 'integration-applications': {
      const t = p.problemText;
      let r: RegExpMatchArray | null;
      if ((r = t.match(/revolving \$y = (\d*)x\$ around the x-axis from \$x = 0\$ to \$x = (\d+)\$/))) {
        return [{ type: 'definite', f: `pi*(${r[1] || 1}*x)**2`, x: 'x', a: '0', b: r[2], value: num(p) }];
      }
      if ((r = t.match(/between \$y = (\d*)x\$ and \$y = x\^2\$ \(from \$x=0\$ to \$x=(\d+)\$\)/))) {
        return [
          { type: 'definite', f: `pi*((${r[1] || 1}*x)**2 - x**4)`, x: 'x', a: '0', b: r[2], value: num(p) },
          { type: 'roots', poly: `${r[1] || 1}*x - x**2`, x: 'x', roots: [0, Number(r[2])], exact: true }, // the region's ends
        ];
      }
      if ((r = t.match(/shell method[\s\S]*\$y = (\d*)x\^2\$ \(from \$x=0\$ to \$x=(\d+)\$\)/))) {
        return [{ type: 'definite', f: `2*pi*x*${r[1] || 1}*x**2`, x: 'x', a: '0', b: r[2], value: num(p) }];
      }
      if ((r = t.match(/arc length of \$y = (.+)\$ from \$x = 0\$ to \$x = (\d+)\$/))) {
        return [{ type: 'definite', f: `sqrt(1 + diff(${poly(r[1])}, x)**2)`, x: 'x', a: '0', b: r[2], value: num(p) }];
      }
      if ((r = t.match(/surface area when \$y = (\d*)x\$ from \$x = 0\$ to \$x = (\d+)\$/))) {
        return [{ type: 'definite', f: `2*pi*${r[1] || 1}*x*sqrt(1 + ${r[1] || 1}**2)`, x: 'x', a: '0', b: r[2], value: num(p) }];
      }
      return null;
    }
    case 'trig-substitution': {
      if (p.templateId === 'quarter-circle') {
        const [, r, r2] = m(p, /\\int_0\^\{(\d+)\} \\sqrt\{(\d+) - x\^2\}/);
        return [{ type: 'definite', f: `sqrt(${r2} - x**2)`, x: 'x', a: '0', b: r, value: num(p) }];
      }
      // with the key's substitution the displayed radicand becomes a perfect square
      if (p.answer.kind !== 'anyOf') return null;
      const primary = p.answer.options[0];
      if (primary.kind !== 'equation') return null;
      const x = sym(primary.rhs);
      const k = x.match(/^(\d+)/)?.[1] ?? '1';
      const [minus, plus, over] = [p.problemText.match(/\{(\d+) - x\^2\}/), p.problemText.match(/x\^2 \+ (\d+)/), p.problemText.match(/x\^2 - (\d+)/)];
      if (minus) return [{ type: 'identity', a: `(${minus[1]} - x**2).subs(x, ${x})`, b: `(${k}*cos(theta))**2` }];
      if (plus) return [{ type: 'identity', a: `(x**2 + ${plus[1]}).subs(x, ${x})`, b: `(${k}*sec(theta))**2` }];
      if (over) return [{ type: 'identity', a: `(x**2 - ${over[1]}).subs(x, ${x})`, b: `(${k}*tan(theta))**2` }];
      return null;
    }
    case 'trig-identities': {
      const [, lhsTex] = m(p, /identity: \$(.+) = \\;\?\$/);
      // degrees in the prompt: 90° is pi/2 for SymPy
      const lhs = texSym(lhsTex.replace(/(\d+)°/g, '($1*\\pi/180)'));
      return p.answer.kind === 'expression' ? [{ type: 'identity', a: lhs, b: sym(p.answer.reference) }] : null;
    }
    case 'trig-special-angles': {
      const [, fn, deg] = m(p, /\\(sin|cos|tan)\((\d+)°\)/);
      return [{ type: 'value', expr: `N(${fn}(${deg}*pi/180), 30)`, value: num(p) }];
    }
    case 'inverse-trig': {
      const [, fn, arg] = m(p, /\$\\(sin|cos|tan)\^\{-1\}\\left\((.+)\\right\)\$$/);
      return [{ type: 'value', expr: `a${fn}(${texSym(arg)})*180/pi`, value: num(p) }];
    }
    case 'trig-equations': {
      const [, fn, rhs] = m(p, /\$\\(sin|cos|tan)\(\\theta\) = (.+?)\$/);
      if (p.answer.kind === 'finiteSet') {
        // the solution set of fn(θ) = rhs on [0, 2π), in degrees
        return [{ type: 'value', expr: `Piecewise((1, Eq(FiniteSet(*[s*180/pi for s in solveset(Eq(${fn}(x), ${texSym(rhs)}), x, Interval.Ropen(0, 2*pi))]), FiniteSet(${p.answer.elements.join(', ')}))), (0, True))`, value: '1' }];
      }
      return [{ type: 'value', expr: `${fn}(${num(p)}*pi/180) - (${texSym(rhs)})`, value: '0' }];
    }
    case 'systems-of-equations': {
      const lines = p.problemText.split('\n');
      const eqs = lines.slice(0, 2).map(l => l.match(/^\$(.+) = (-?\d+)\$$/));
      if (!eqs[0] || !eqs[1]) return null;
      const e = eqs.map(q => `Eq(${poly(q![1])}, ${q![2]})`);
      return [{ type: 'value', expr: `solve([${e.join(', ')}], [x, y], dict=True)[0][x]`, value: num(p) }];
    }
    case 'complex-numbers': {
      const [, z1, op, z2] = m(p, /^\$\((.+)\) ([+-]) \((.+)\)\$/);
      const z = (s: string) => { const t = terms(s); return `(${coef(t, '')} + ${coef(t, 'i')}*I)`; };
      return [{ type: 'value', expr: `im(${z(z1)} ${op} ${z(z2)})`, value: num(p) }];
    }
    case 'logarithms': {
      const [, base, arg] = m(p, /\\log_\{(\d+)\}(?:\\left)?\((.+?)(?:\\right)?\) = /);
      return [{ type: 'value', expr: `log(${texSym(arg)}, ${base})`, value: num(p) }];
    }
    case 'polar-coordinates': {
      let r: RegExpMatchArray | null;
      if ((r = p.problemText.match(/Convert \$\((-?\d+), (-?\d+)\)\$ from Cartesian to polar.\nWhat is \$r\$/))) {
        return [{ type: 'value', expr: `sqrt(${r[1]}**2 + ${r[2]}**2)`, value: num(p) }];
      }
      if ((r = p.problemText.match(/Convert \$\((-?\d+), (-?\d+)\)\$ from Cartesian to polar.\nWhat is \$\\theta\$/))) {
        return [{ type: 'value', expr: `Mod(atan2(${r[2]}, ${r[1]})*180/pi, 360)`, value: num(p) }];
      }
      if ((r = p.problemText.match(/\(r=(\d+),\\; \\theta=(\d+)°\)\$ to Cartesian.\nWhat is \$(x|y)\$/))) {
        return [{ type: 'value', expr: `${r[1]}*${r[3] === 'x' ? 'cos' : 'sin'}(${r[2]}*pi/180)`, value: num(p) }];
      }
      return null; // curve identification: recomputed in mathCorrectness.test.ts
    }
    default:
      return null; // families without a symbolic claim (arithmetic, geometry, word problems): covered by mathCorrectness.test.ts
  }
};

it('exports symbolic claims for the CAS oracle', () => {
  const records: Record_[] = [];
  const uncovered = new Set<string>();
  for (const topic of GENERATORS.keys()) {
    const seen = new Set<string>();
    for (let i = 0; i < SEEDS; i++) {
      const p = generateProblem(topic, {}, `sweep-${i}`);
      const key = JSON.stringify([p.problemText, p.answer]);
      if (seen.has(key)) continue;
      seen.add(key);
      const claims = claimsFor(p);
      if (!claims) { uncovered.add(`${topic}/${p.templateId}`); continue; }
      records.push({ topic, seed: p.seed, templateId: p.templateId, problemText: p.problemText, claims });
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ seeds: SEEDS, records, uncovered: [...uncovered].sort() }, null, 1));
  // eslint-disable-next-line no-console
  console.log(`exported ${records.length} problems (${records.reduce((s, r) => s + r.claims.length, 0)} claims) to ${OUT}; ${uncovered.size} templates without a symbolic claim`);
}, 300_000);
