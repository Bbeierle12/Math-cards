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
import { coef, terms } from '../../services/testing/latex';
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
  | { type: 'value'; expr: string; value: string };                            // expr = value

interface Record_ { topic: string; seed: string; templateId: string; problemText: string; claims: Claim[] }

/** mathjs reference → SymPy/Python text (explicit products; e → E; abs → Abs; ^ → **). */
const sym = (expr: string): string => {
  const node = parse(normalizeMathExpr(expr));
  return node.toString({ implicit: 'show', parenthesis: 'keep' })
    .replace(/\be\b/g, 'E')
    .replace(/\babs\(/g, 'Abs(')
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
      const [, d] = m(p, /\\frac\{1\}\{(.+?)\}\$/);
      return [{ type: 'roots', poly: poly(d), x: 'x', roots: [Number(num(p))], exact: true }];
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
      const [, c, n] = m(p, /\\int 2x\(x\^2 \+ (\d+)\)\^\{(\d+)\}/);
      if (p.answer.kind !== 'expression') return null;
      // u is the inner function and its derivative 2x is the factor present
      return [
        { type: 'identity', a: sym(p.answer.reference), b: `x**2 + ${c}` },
        { type: 'derivative', f: sym(p.answer.reference), g: '2*x', x: 'x' },
        { type: 'antiderivative', F: `(x**2 + ${c})**(${n}+1)/(${n}+1)`, f: `2*x*(x**2 + ${c})**${n}`, x: 'x' },
      ];
    }
    case 'integration-by-parts':
    case 'trig-integrals':
      return p.answer.kind === 'antiderivative' && p.answer.reference
        ? [{ type: 'antiderivative', F: sym(p.answer.reference), f: sym(p.answer.integrand), x: 'x' }]
        : null;
    case 'improper-integrals': {
      const table: Record<string, [string, string, string]> = {
        '1/x^2': ['1/x**2', '1', 'oo'], '1/x^3': ['1/x**3', '1', 'oo'], 'e^-x': ['exp(-x)', '0', 'oo'], '1/x': ['1/x', '1', 'oo'],
      };
      if (p.templateId === 'p-integral') {
        // converges for p = 2 and p = 1.01, diverges for p = 1 and p = 1/2: consistent with the interval p > 1
        return [
          { type: 'definite', f: 'x**(-2)', x: 'x', a: '1', b: 'oo', value: '1' },
          { type: 'definite', f: 'x**(-1)', x: 'x', a: '1', b: 'oo', value: 'oo' },
          { type: 'definite', f: 'x**(-Rational(1, 2))', x: 'x', a: '1', b: 'oo', value: 'oo' },
        ];
      }
      const row = table[p.templateId];
      if (!row) return null;
      const v = verdict(p);
      return [{ type: 'definite', f: row[0], x: 'x', a: row[1], b: row[2], value: v === 'diverges' ? 'oo' : num(p) }];
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
      if (p.answer.kind !== 'multipart') return null;
      const limit = p.answer.parts[1].spec;
      const v = limit && limit.kind === 'number' ? String(limit.value) : 'none';
      const table: [RegExp, string][] = [
        [/a_n = \\frac\{1\}\{n\}\$/, '1/n'], [/a_n = \\frac\{n\+1\}\{n\}\$/, '(n+1)/n'], [/a_n = \(-1\)\^n\$/, '(-1)**n'],
        [/a_n = n\^2\$/, 'n**2'], [/a_n = \\frac\{n\}\{n\+1\}\$/, 'n/(n+1)'], [/a_n = \\frac\{1\}\{n!\}\$/, '1/factorial(n)'],
      ];
      const row = table.find(([re]) => re.test(p.problemText));
      return row ? [{ type: 'limit', expr: row[1], x: 'n', at: 'oo', value: v }] : null;
    }
    case 'series-convergence': {
      const v = verdict(p);
      const table: Record<string, [string, number]> = {
        'geometric-sum-1/2': ['(1/2)**n', 0], 'geometric-sum-1/3': ['(1/3)**n', 0], harmonic: ['1/n', 1], 'p-series-2': ['1/n**2', 1],
        'ratio-n!/2^n': ['factorial(n)/2**n', 0], 'alternating-harmonic': ['(-1)**(n+1)/n', 1], 'geometric-3/2': ['(3/2)**n', 0],
        'nth-term-n/(n+1)': ['n/(n+1)', 1],
      };
      if (p.templateId === 'nth-term-inconclusive') {
        // the n-th term tends to 0, so the n-th term test says nothing ("no")
        return v === 'no' ? [{ type: 'limit', expr: '1/n**2', x: 'n', at: 'oo', value: '0' }] : [{ type: 'value', expr: '0', value: '1' }];
      }
      const row = table[p.templateId];
      if (!row) return null;
      return v === null
        ? [{ type: 'sum', term: row[0], n: 'n', start: row[1], value: num(p) }]
        : [{ type: 'converges', term: row[0], n: 'n', start: row[1], value: v === 'converges' }];
    }
    case 'power-series': {
      const table: Record<string, string> = { 'x^n/n!': '1/factorial(n)', 'x^n': '1', 'nx^n': 'n', 'x^n/2^n': '1/2**n', 'x^n/n': '1/n' };
      const c = table[p.templateId];
      if (!c) return null;
      return [{ type: 'radius', coef: c, n: 'n', value: p.answer.kind === 'text' ? 'oo' : num(p) }];
    }
    case 'taylor-maclaurin': {
      const table: Record<string, [string, number]> = {
        'maclaurin-e^x': ['exp(x)', 4], 'maclaurin-sin': ['sin(x)', 6], 'maclaurin-cos': ['cos(x)', 5], 'maclaurin-1/(1-x)': ['1/(1-x)', 4],
      };
      if (p.templateId === 'coefficient-x^2-e^x') return [{ type: 'value', expr: 'series(exp(x), x, 0, 3).removeO().coeff(x, 2)', value: num(p) }];
      if (p.templateId === 'lagrange-e^x') {
        // the bound is max|f''''| on [0, 0.5] · 0.5^4 / 4!, and it does bound the actual error
        return [
          { type: 'value', expr: 'exp(Rational(1, 2)) * Rational(1, 2)**4 / factorial(4)', value: num(p) },
          { type: 'value', expr: `Piecewise((1, exp(Rational(1,2)) - series(exp(x), x, 0, 4).removeO().subs(x, Rational(1,2)) <= ${num(p)}), (0, True))`, value: '1' },
        ];
      }
      if (p.templateId === 'alternating-remainder') return [{ type: 'value', expr: 'Rational(1, 5)', value: num(p) }];
      const row = table[p.templateId];
      return row && p.answer.kind === 'expression' ? [{ type: 'maclaurin', f: row[0], x: 'x', order: row[1], poly: sym(p.answer.reference) }] : null;
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
      const a = p.problemText.match(/to \$x ?= ?(\d+)\$/)?.[1];
      const table: Record<string, [string, string]> = {
        'disk-y=x': ['pi*x**2', a ?? ''], 'washer-x-x^2': ['pi*(x**2 - x**4)', '1'], 'shell-y=x^2': ['2*pi*x*x**2', a ?? ''],
        'arc-length-y=x': ['sqrt(1 + diff(x, x)**2)', a ?? ''], 'surface-area-y=x': ['2*pi*x*sqrt(1 + diff(x, x)**2)', a ?? ''],
      };
      const row = table[p.templateId];
      return row && row[1] ? [{ type: 'definite', f: row[0], x: 'x', a: '0', b: row[1], value: num(p) }] : null;
    }
    case 'trig-substitution':
      return p.templateId === 'quarter-circle'
        ? [{ type: 'definite', f: 'sqrt(1 - x**2)', x: 'x', a: '0', b: '1', value: num(p) }]
        : null;
    case 'trig-identities': {
      const lhs: Record<string, string> = {
        pythagorean: 'sin(theta)**2 + cos(theta)**2', quotient: 'tan(theta)', 'pythagorean-tan': '1 + tan(theta)**2',
        'cofunction-sin': 'sin(pi/2 - theta)', 'cofunction-cos': 'cos(pi/2 - theta)',
      };
      const l = lhs[p.templateId];
      return l && p.answer.kind === 'expression' ? [{ type: 'identity', a: l, b: sym(p.answer.reference) }] : null;
    }
    case 'trig-special-angles': {
      const [, fn, deg] = m(p, /\\(sin|cos|tan)\((\d+)°\)/);
      return [{ type: 'value', expr: `N(${fn}(${deg}*pi/180), 30)`, value: num(p) }];
    }
    case 'inverse-trig': {
      const [, fn] = m(p, /\\(sin|cos|tan)\^\{-1\}/);
      const arg = p.problemText.match(/\\left\((.+)\\right\)\$$/)?.[1] ?? '';
      const value = ({ '\\frac{1}{2}': '1/2', '\\frac{\\sqrt{3}}{2}': 'sqrt(3)/2', '\\frac{\\sqrt{2}}{2}': 'sqrt(2)/2', '\\frac{\\sqrt{3}}{3}': 'sqrt(3)/3', '\\sqrt{3}': 'sqrt(3)', '1': '1' } as Record<string, string>)[arg];
      return value ? [{ type: 'value', expr: `a${fn}(${value})*180/pi`, value: num(p) }] : null;
    }
    case 'trig-equations': {
      const [, fn, rhs] = m(p, /\$\\(sin|cos|tan)\(\\theta\) = (.+)\$$/);
      const value = ({ '\\frac{1}{2}': '1/2', '\\frac{\\sqrt{3}}{2}': 'sqrt(3)/2', '\\frac{\\sqrt{2}}{2}': 'sqrt(2)/2', '\\frac{\\sqrt{3}}{3}': 'sqrt(3)/3', '\\sqrt{3}': 'sqrt(3)', '1': '1' } as Record<string, string>)[rhs];
      return value ? [{ type: 'value', expr: `${fn}(${num(p)}*pi/180) - (${value})`, value: '0' }] : null;
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
      const [, b, v] = m(p, /\\log_\{(\d+)\}\((\d+)\)/);
      return [{ type: 'value', expr: `log(${v}, ${b})`, value: num(p) }];
    }
    case 'polar-coordinates': {
      if (p.templateId === 'cartesian-to-polar-r') {
        const [, x, y] = m(p, /Convert \$\((\d+), (\d+)\)\$/);
        return [{ type: 'value', expr: `sqrt(${x}**2 + ${y}**2)`, value: num(p) }];
      }
      if (p.templateId === 'cartesian-to-polar-theta') {
        const [, x, y] = m(p, /Convert \$\((\d+), (\d+)\)\$/);
        return [{ type: 'value', expr: `atan2(${y}, ${x})*180/pi`, value: num(p) }];
      }
      const pc = p.problemText.match(/\(r=(\d+),\\; \\theta=(\d+)°\)/);
      if (pc && p.templateId === 'polar-to-cartesian-x') return [{ type: 'value', expr: `${pc[1]}*cos(${pc[2]}*pi/180)`, value: num(p) }];
      if (pc && p.templateId === 'polar-to-cartesian-y') return [{ type: 'value', expr: `${pc[1]}*sin(${pc[2]}*pi/180)`, value: num(p) }];
      return null;
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
