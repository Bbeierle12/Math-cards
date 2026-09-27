/**
 * Tests for the formula sheets and the fact registry they render from
 * (data/facts.ts).
 *
 * - Registry: ids, required fields, hypotheses on every theorem/test/rule, and
 *   every LaTeX segment compiles with KaTeX in strict throwing mode.
 * - Rendering: each sheet is rendered to static HTML (no DOM needed); it must
 *   contain every string of every fact on that sheet, and the hypotheses /
 *   domain conditions each statement needs must appear next to it.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import katex from 'katex';
import MathText from './MathText';
import PreAlgebraFormulaSheet from './PreAlgebraFormulaSheet';
import Algebra1FormulaSheet from './Algebra1FormulaSheet';
import GeometryFormulaSheet from './GeometryFormulaSheet';
import Algebra2FormulaSheet from './Algebra2FormulaSheet';
import PreCalculusFormulaSheet from './PreCalculusFormulaSheet';
import CalculusFormulaSheet from './CalculusFormulaSheet';
import Calc2FormulaSheet from './Calc2FormulaSheet';
import {
  ALL_FACTS,
  FACT_SHEETS,
  factById,
  sheetFacts,
  type Fact,
  type FactSection,
  type FactSheet,
  type FactSheetKey,
} from '../data/facts';

const raw = String.raw;

type Sheet = React.ComponentType<{ onComplete: () => void }>;

const render = (Component: Sheet): string =>
  renderToStaticMarkup(React.createElement(Component, { onComplete: () => {} }));

const decode = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

/** Visible text of the sheet: tags stripped, entities decoded, whitespace collapsed. */
const textOf = (html: string): string =>
  decode(
    html
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, ' ') // KaTeX keeps the LaTeX source here
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

/** The LaTeX sources KaTeX embedded (one per MathText segment), entity-decoded. */
const latexOf = (html: string): string[] =>
  [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map(m => decode(m[1]));

/**
 * The sheet as a reader sees it, with every formula replaced by its LaTeX
 * source: e.g. "Natural log \frac{d}{dx}[\ln x] = \frac{1}{x} Requires: x > 0".
 * Lets a test assert that a hypothesis sits right after its statement.
 */
const readable = (html: string): string => {
  const OPEN = '<span class="katex">';
  let out = '';
  let i = 0;
  for (;;) {
    const start = html.indexOf(OPEN, i);
    if (start < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, start);
    const tags = /<span\b|<\/span>/g;
    tags.lastIndex = start;
    let depth = 0;
    let end = html.length;
    for (let m = tags.exec(html); m; m = tags.exec(html)) {
      depth += m[0] === '</span>' ? -1 : 1;
      if (depth === 0) {
        end = tags.lastIndex;
        break;
      }
    }
    const block = html.slice(start, end);
    out += block.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/)?.[1] ?? '';
    i = end;
  }
  return decode(
    out
      .replace(/<\/?(?:p|div|h[1-6]|br|button|svg)\b[^>]*>/g, ' ') // block boundaries separate words
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
};

/** The markup MathText produces for a registry string; a sheet shows the string iff it contains this. */
const markupOf = (text: string): string => renderToStaticMarkup(<MathText text={text} />);

const SHEETS: [string, Sheet, FactSheetKey][] = [
  ['PreAlgebra', PreAlgebraFormulaSheet, 'preAlgebra'],
  ['Algebra1', Algebra1FormulaSheet, 'algebra1'],
  ['Geometry', GeometryFormulaSheet, 'geometry'],
  ['Algebra2', Algebra2FormulaSheet, 'algebra2'],
  ['PreCalculus', PreCalculusFormulaSheet, 'preCalculus'],
  ['Calculus', CalculusFormulaSheet, 'calculus'],
  ['Calc2', Calc2FormulaSheet, 'calc2'],
];

/** Every section of a sheet, subsections included. */
const allSections = (sheet: FactSheet): FactSection[] => {
  const walk = (s: FactSection): FactSection[] => [s, ...(s.subsections ?? []).flatMap(walk)];
  return sheet.sections.flatMap(walk);
};

/** Every displayed MathText string of a fact, labelled for failure messages. */
const factStrings = (f: Fact): [string, string][] => [
  [`${f.id}.title`, f.title],
  ...f.statement.map((s, i): [string, string] => [`${f.id}.statement[${i}]`, s]),
  ...f.hypotheses.map((s, i): [string, string] => [`${f.id}.hypotheses[${i}]`, s]),
  ...(f.conclusion !== undefined ? [[`${f.id}.conclusion`, f.conclusion] as [string, string]] : []),
  ...(f.note !== undefined ? [[`${f.id}.note`, f.note] as [string, string]] : []),
  ...(f.counterexample !== undefined ? [[`${f.id}.counterexample`, f.counterexample] as [string, string]] : []),
];

/** Every displayed string in the registry, including sheet and section headings and notes. */
const allStrings = (): [string, string][] =>
  Object.entries(FACT_SHEETS).flatMap(([key, sheet]): [string, string][] => [
    [`${key}.title`, sheet.title],
    [`${key}.subtitle`, sheet.subtitle],
    ...allSections(sheet).flatMap((s): [string, string][] => [
      [`${key} section "${s.title}"`, s.title],
      ...(s.note !== undefined ? [[`${key} section "${s.title}" note`, s.note] as [string, string]] : []),
    ]),
    ...sheetFacts(sheet).flatMap(factStrings),
  ]);

/** Same delimiters as MathText: $$...$$ (display) or $...$ (inline). */
const MATH_SEGMENT = /\$\$(.*?)\$\$|\$(.*?)\$/g;

/**
 * Facts that are theorems, tests or rules with conditions: each must carry
 * explicit hypotheses.
 */
const THEOREM_IDS = [
  // Calculus 2: series tests, Taylor, applications
  'calc2-integral-test',
  'calc2-ratio-test',
  'calc2-root-test',
  'calc2-alternating-series-test',
  'calc2-comparison-test',
  'calc2-comparison-test-integrals',
  'calc2-divergence-test',
  'calc2-geometric-series',
  'calc2-p-series',
  'calc2-p-integral',
  'calc2-taylor-series',
  'calc2-lagrange-remainder',
  'calc2-alternating-series-remainder',
  'calc2-monotone-convergence',
  'calc2-radius-of-convergence',
  'calc2-power-series-derivative',
  'calc2-power-series-integral',
  'calc2-maclaurin-geometric',
  'calc2-maclaurin-ln',
  'calc2-maclaurin-arctan',
  'calc2-integration-by-parts',
  'calc2-trig-substitution',
  'calc2-partial-fractions',
  'calc2-parametric-derivative',
  'calc2-parametric-arc-length',
  'calc2-polar-area',
  'calc2-polar-arc-length',
  'calc2-washer-method',
  'calc2-shell-method',
  'calc2-arc-length',
  'calc2-surface-area',
  // Calculus: FTC, MVT, EVT, differentiation/integration rules, limit laws
  'calc-ftc-1',
  'calc-ftc-2',
  'calc-mean-value-theorem',
  'calc-extreme-value-theorem',
  'calc-power-rule',
  'calc-product-rule',
  'calc-quotient-rule',
  'calc-chain-rule',
  'calc-deriv-exp-a',
  'calc-deriv-ln',
  'calc-deriv-log-a',
  'calc-int-power-rule',
  'calc-int-reciprocal',
  'calc-int-exp-a',
  'calc-u-substitution',
  'calc-integration-by-parts',
  'calc-limit-sum-law',
  'calc-limit-product-law',
  'calc-limit-quotient-law',
  'calc-limit-constant-multiple-law',
  // Algebra 2: logarithms, radicals, series, rational expressions
  'alg2-log-definition',
  'alg2-log-product',
  'alg2-log-quotient',
  'alg2-log-power',
  'alg2-log-change-of-base',
  'alg2-radical-product',
  'alg2-radical-quotient',
  'alg2-rational-exponent',
  'alg2-rationalizing',
  'alg2-square-root-of-square',
  'alg2-geometric-sum-finite',
  'alg2-geometric-sum-infinite',
  'alg2-rational-multiply',
  'alg2-rational-divide',
  // Algebra 1: exponent rules, slope, quadratic formula
  'alg1-exponent-product',
  'alg1-exponent-quotient',
  'alg1-exponent-power',
  'alg1-exponent-zero',
  'alg1-exponent-negative',
  'alg1-exponent-product-to-power',
  'alg1-slope-formula',
  'alg1-quadratic-formula',
  'alg1-discriminant',
  // Pre-Algebra: fraction identities with nonzero denominators
  'prealg-fraction-add-same-denominator',
  'prealg-fraction-add-different-denominators',
  'prealg-fraction-multiply',
  'prealg-fraction-divide',
  'prealg-fraction-cross-multiply',
  'prealg-integer-division',
  // Pre-Calculus and Geometry theorems
  'precalc-rational-root-theorem',
  'precalc-remainder-theorem',
  'precalc-fundamental-theorem-of-algebra',
  'precalc-ln-inverse',
  'precalc-holes',
  'geo-pythagorean-theorem',
  'geo-arc-length',
  'geo-sector-area',
];

/** Conditions that specific facts must state (regexes over the raw MathText hypothesis strings). */
const REQUIRED_HYPOTHESES: Record<string, RegExp[]> = {
  'prealg-fraction-add-same-denominator': [/^\$c \\neq 0\$$/],
  'prealg-fraction-add-different-denominators': [/^\$b, d \\neq 0\$$/],
  'prealg-fraction-multiply': [/^\$b, d \\neq 0\$$/],
  'prealg-fraction-divide': [/^\$b, c, d \\neq 0\$$/],
  'prealg-fraction-cross-multiply': [/^\$b, d \\neq 0\$$/],
  'alg1-slope-formula': [/^\$x_2 \\neq x_1\$$/],
  'alg1-exponent-quotient': [/^\$a \\neq 0\$$/],
  'alg1-exponent-zero': [/^\$a \\neq 0\$$/],
  'alg1-exponent-negative': [/^\$a \\neq 0\$$/],
  'alg1-quadratic-formula': [/a \\neq 0/],
  'geo-sector-area': [/^\$\\theta\$ in radians$/],
  'geo-arc-length': [/^\$\\theta\$ in radians$/],
  'geo-pythagorean-theorem': [/right triangle/],
  'alg2-radical-product': [/^\$a, b \\geq 0\$$/],
  'alg2-radical-quotient': [/^\$a \\geq 0\$$/, /^\$b > 0\$$/],
  'alg2-rational-exponent': [/^\$a > 0\$$/],
  'alg2-rationalizing': [/^\$a > 0\$$/],
  'alg2-log-definition': [/^\$b > 0\$$/, /^\$b \\neq 1\$$/, /^\$x > 0\$$/],
  'alg2-log-product': [/^\$b > 0\$$/, /^\$b \\neq 1\$$/, /^\$x, y > 0\$$/],
  'alg2-log-quotient': [/^\$b > 0\$$/, /^\$b \\neq 1\$$/, /^\$x, y > 0\$$/],
  'alg2-log-power': [/^\$b > 0\$$/, /^\$b \\neq 1\$$/, /^\$x > 0\$$/],
  'alg2-log-change-of-base': [/^\$b > 0\$$/, /^\$b \\neq 1\$$/, /^\$x > 0\$$/],
  'alg2-geometric-sum-finite': [/^\$r \\neq 1\$$/],
  'alg2-geometric-sum-infinite': [/^\$\|r\| < 1\$$/],
  'alg2-rational-divide': [/^\$b, c, d \\neq 0\$$/],
  'precalc-rational-root-theorem': [/integer coefficients/],
  'precalc-ellipse': [/^\$a \\geq b > 0\$$/],
  'precalc-ln-inverse': [/^\$x > 0\$ for \$e\^\{\\ln x\} = x\$$/, /for all real \$x\$$/],
  'calc-ftc-1': [/^\$f\$ is continuous on \$\[a, b\]\$$/, /^\$F\(x\) = \\int_a\^x f\(t\)\\,dt\$$/],
  'calc-ftc-2': [/^\$f\$ is continuous on \$\[a, b\]\$$/, /^\$F\$ is any antiderivative of \$f\$ on \$\[a, b\]\$/],
  'calc-mean-value-theorem': [/continuous on \$\[a, b\]\$/, /differentiable on \$\(a, b\)\$/],
  'calc-extreme-value-theorem': [/continuous on the closed interval \$\[a, b\]\$/],
  'calc-quotient-rule': [/^\$g\(x\) \\neq 0\$$/],
  'calc-deriv-exp-a': [/^\$a > 0\$$/],
  'calc-deriv-ln': [/^\$x > 0\$$/],
  'calc-deriv-log-a': [/^\$x > 0\$$/, /^\$a > 0\$$/, /^\$a \\neq 1\$$/],
  'calc-int-power-rule': [/^\$n \\neq -1\$$/],
  'calc-int-exp-a': [/^\$a > 0\$$/, /^\$a \\neq 1\$$/],
  'calc-limit-quotient-law': [/both exist and are finite/, /^\$\\lim_\{x \\to c\} g\(x\) \\neq 0\$$/],
  'calc2-integral-test': [/positive, continuous and decreasing on \$\[N, \\infty\)\$/, /^\$a_n = f\(n\)\$$/],
  'calc2-alternating-series-test': [/^\$b_n > 0\$$/, /decreasing/, /^\$\\lim_\{n\\to\\infty\} b_n = 0\$$/],
  'calc2-ratio-test': [/a_n \\neq 0/, /limit \$L\$ exists/],
  'calc2-root-test': [/limit \$L\$ exists/],
  'calc2-comparison-test': [/0 \\leq a_n \\leq b_n/],
  'calc2-comparison-test-integrals': [/0 \\leq f\(x\) \\leq g\(x\)/],
  'calc2-geometric-series': [/^\$\|r\| < 1\$$/],
  'calc2-lagrange-remainder': [/M \\geq \|f\^\{\(n\+1\)\}\(c\)\|\$ for every \$c\$ between \$a\$ and \$x\$/],
  'calc2-maclaurin-geometric': [/^\$\|x\| < 1\$$/],
  'calc2-maclaurin-ln': [/^\$-1 < x \\leq 1\$$/],
  'calc2-maclaurin-arctan': [/^\$\|x\| \\leq 1\$$/],
  'calc2-parametric-derivative': [/^\$dx\/dt \\neq 0\$$/],
  'calc2-shell-method': [/^\$0 \\leq a \\leq b\$$/, /f\(x\) \\geq 0/],
  'calc2-radius-of-convergence': [/provided this limit exists/],
};

describe('fact registry', () => {
  it('covers every item of every sheet', () => {
    const counts = Object.fromEntries(Object.entries(FACT_SHEETS).map(([k, s]) => [k, sheetFacts(s).length]));
    expect(counts).toEqual({
      preAlgebra: 22,
      algebra1: 22,
      geometry: 24,
      algebra2: 24,
      preCalculus: 22,
      calculus: 42,
      calc2: 44,
    });
  });

  it('ids are unique, kebab-case and prefixed with their sheet id', () => {
    const ids = ALL_FACTS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sheet of Object.values(FACT_SHEETS)) {
      expect(sheet.id, sheet.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      for (const f of sheetFacts(sheet)) {
        expect(f.id, f.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(f.id.startsWith(`${sheet.id}-`), f.id).toBe(true);
      }
    }
  });

  it('every fact has a title, a statement and a source; no string is blank', () => {
    for (const f of ALL_FACTS) {
      expect(f.title.trim(), f.id).not.toBe('');
      expect(f.statement.length, f.id).toBeGreaterThan(0);
      expect(f.source.trim(), f.id).not.toBe('');
      expect(f.source, f.id).toMatch(/^(Standard|OpenStax .+, §\d|DLMF \d)/);
      for (const [where, s] of factStrings(f)) expect(s.trim(), where).not.toBe('');
    }
  });

  it('theorems, tests and rules with conditions carry explicit hypotheses', () => {
    for (const id of THEOREM_IDS) {
      const f = factById(id);
      expect(f, id).toBeDefined();
      expect(f!.hypotheses.length, id).toBeGreaterThan(0);
    }
    // Anything named a theorem, test, rule or law must state its hypotheses too.
    for (const f of ALL_FACTS) {
      if (/\b(Theorem|Test|Rule|Law)\b/.test(f.title)) expect(f.hypotheses.length, f.id).toBeGreaterThan(0);
    }
  });

  it('specific facts state the conditions they need', () => {
    for (const [id, patterns] of Object.entries(REQUIRED_HYPOTHESES)) {
      const f = factById(id);
      expect(f, id).toBeDefined();
      for (const p of patterns) expect(f!.hypotheses.some(h => p.test(h)), `${id}: ${p}`).toBe(true);
    }
  });

  it('statements do not hide conditions in parentheses: they belong in hypotheses', () => {
    for (const f of ALL_FACTS) {
      for (const s of f.statement) expect(s, f.id).not.toMatch(/\(\$[^$]*(\\neq|\\geq|\\leq|<|>)[^$]*\$\)/);
    }
  });

  it('every LaTeX segment compiles with KaTeX (throwOnError) and every $ is paired', () => {
    for (const [where, s] of allStrings()) {
      expect(s, where).not.toMatch(/[\u0000-\u001f]/); // e.g. '\n' from an unescaped \neq
      expect(s, where).not.toContain('$$');
      const segments = [...s.matchAll(MATH_SEGMENT)].map(m => m[2] ?? m[1]);
      for (const tex of segments) {
        expect(() => katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }), `${where}: ${tex}`).not.toThrow();
        expect(tex, where).not.toMatch(/\\frac\{[^}]*\}\{\}/);
      }
      expect(s.replace(MATH_SEGMENT, ''), `${where}: unpaired $`).not.toContain('$');
    }
  });
});

describe('formula sheets render without KaTeX errors', () => {
  for (const [name, Sheet] of SHEETS) {
    it(name, () => {
      const html = render(Sheet);
      expect(html.length).toBeGreaterThan(1000);
      expect(html).not.toContain('katex-error');
      // no empty fractions like \frac{...}{}
      for (const src of latexOf(html)) expect(src, src).not.toMatch(/\\frac\{[^}]*\}\{\}/);
    });
  }
});

describe('formula sheets render every fact of the registry', () => {
  for (const [name, Sheet, key] of SHEETS) {
    it(name, () => {
      const html = render(Sheet);
      const sheet = FACT_SHEETS[key];
      expect(html).toContain(renderToStaticMarkup(<>{sheet.title}</>));
      for (const s of allSections(sheet)) {
        expect(html, s.title).toContain(renderToStaticMarkup(<>{s.title}</>));
        if (s.note !== undefined) expect(html, s.note).toContain(markupOf(s.note));
      }
      for (const f of sheetFacts(sheet)) {
        for (const [where, s] of factStrings(f)) expect(html, where).toContain(markupOf(s));
      }
      // Hypotheses are shown after "Requires:", in order, next to their statement.
      const text = readable(html);
      for (const f of sheetFacts(sheet)) {
        if (f.hypotheses.length === 0) continue;
        const shown = readable(markupOf(f.statement[f.statement.length - 1]))
          + ' Requires: '
          + f.hypotheses.map(h => readable(markupOf(h))).join('; ');
        expect(text, f.id).toContain(shown);
      }
    });
  }
});

describe('formula statements carry their hypotheses', () => {
  it('Pre-Algebra: fraction identities require nonzero denominators', () => {
    const html = render(PreAlgebraFormulaSheet);
    const src = latexOf(html).join(' ');
    expect(src).toMatch(/c \\neq 0/);
    expect(src).toMatch(/b, d \\neq 0/);
    expect(src).toMatch(/b, c, d \\neq 0/);
    const r = readable(html);
    expect(r).toContain(raw`\frac{a}{c} + \frac{b}{c} = \frac{a+b}{c} Requires: c \neq 0`);
    expect(r).toContain(raw`\frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \times \frac{d}{c} Requires: b, c, d \neq 0`);
  });

  it('Algebra 1: slope, quotient rule, zero and negative exponents', () => {
    const html = render(Algebra1FormulaSheet);
    const t = textOf(html);
    const src = latexOf(html).join(' ');
    expect(src).toMatch(/x_2 \\neq x_1/);
    expect(t).toMatch(/vertical line has no slope/);
    expect(src.match(/a \\neq 0/g)?.length ?? 0).toBeGreaterThanOrEqual(3); // quotient, zero, negative exponent rules
    const r = readable(html);
    expect(r).toContain(raw`Quotient Rule \frac{a^m}{a^n} = a^{m-n} Requires: a \neq 0`);
    expect(r).toContain(raw`Zero Exponent a^0 = 1 Requires: a \neq 0`);
    expect(r).toContain(raw`Negative Exponent a^{-n} = \frac{1}{a^n} Requires: a \neq 0`);
  });

  it('Geometry: sector area in radians, symbols defined', () => {
    const html = render(GeometryFormulaSheet);
    const t = textOf(html);
    const r = readable(html);
    expect(r).toContain(raw`Sector area A = \frac{1}{2}r^2\theta Requires: \theta in radians`);
    expect(r).toContain(raw`Arc length s = r\theta Requires: \theta in radians`);
    expect(t).toMatch(/apothem/);
    expect(t).toMatch(/slant height/);
  });

  it('Algebra 2: real radical rules need non-negative radicands; logs need b > 0, b ≠ 1, x > 0; r ≠ 1', () => {
    const html = render(Algebra2FormulaSheet);
    const t = textOf(html);
    const src = latexOf(html).join(' ');
    expect(t).toMatch(/non-negative radicands/);
    expect(src).toMatch(/a, b \\geq 0/);
    expect(src).toMatch(/\\sqrt\{a\^2\} = \|a\|/);
    expect(src).toMatch(/b \\neq 1/);
    expect(src).toMatch(/x, y > 0/);
    expect(src).toMatch(/r \\neq 1/);
    expect(src).toMatch(/\\sqrt\{-1\}\\cdot\\sqrt\{-1\} = i\^2 = -1/); // the a = b = −1 counterexample
    const r = readable(html);
    expect(r).toContain(raw`\log_b(xy) = \log_b x + \log_b y Requires: b > 0; b \neq 1; x, y > 0`);
  });

  it('Pre-Calculus: asymptote cases, holes vs vertical asymptotes, conic conventions, ln/exp domains', () => {
    const html = render(PreCalculusFormulaSheet);
    const t = textOf(html);
    const src = latexOf(html).join(' ');
    expect(src).toMatch(/y = \\frac\{a_n\}\{b_n\}/);
    expect(t).toMatch(/deg\(num\) = deg\(den\) \+ 1/);
    expect(t).toMatch(/deg\(num\) ≥ deg\(den\) \+ 2/);
    expect(src).toMatch(/\\frac\{x-1\}\{\(x-1\)\^2\}/);
    expect(src).toMatch(/a \\geq b > 0/);
    expect(src).toMatch(/\|p\|/);
    expect(t).toMatch(/integer coefficients/);
    expect(t).toMatch(/for all real/);           // ln(e^x) = x for all real x
    expect(src).toMatch(/e\^\{\\ln x\} = x/);
    expect(src).toMatch(/x > 0/);                 // e^{ln x} = x only for x > 0
    const r = readable(html);
    expect(r).toContain(raw`Requires: x > 0 for e^{\ln x} = x; \ln(e^x) = x holds for all real x`);
  });

  it('Calculus: FTC continuity, limit-law hypotheses, quotient rule and log/exponential domains', () => {
    const r = readable(render(CalculusFormulaSheet));
    expect(r).toContain(
      raw`Fundamental Theorem of Calculus (Part 1) F is differentiable on (a, b) and F'(x) = f(x) Requires: f is continuous on [a, b]; F(x) = \int_a^x f(t)\,dt`,
    );
    expect(r).toContain(
      raw`Fundamental Theorem of Calculus (Part 2) \int_a^b f(x)\,dx = F(b) - F(a) Requires: f is continuous on [a, b]; F is any antiderivative of f on [a, b] (F' = f)`,
    );
    expect(r.match(/both exist and are finite/g)?.length ?? 0).toBeGreaterThanOrEqual(3); // sum, product, quotient laws
    expect(r).toContain(
      raw`\frac{\lim_{x \to c} f(x)}{\lim_{x \to c} g(x)} Requires: \lim_{x \to c} f(x) and \lim_{x \to c} g(x) both exist and are finite; \lim_{x \to c} g(x) \neq 0`,
    );
    expect(r).toContain(raw`{[g(x)]^2} Requires: f and g differentiable at x; g(x) \neq 0`);
    expect(r).toContain(raw`\frac{d}{dx}[a^x] = a^x \ln a Requires: a > 0`);
    expect(r).toContain(raw`\frac{d}{dx}[\log_a x] = \frac{1}{x \ln a} Requires: x > 0; a > 0; a \neq 1`);
    expect(r).toContain(raw`\int a^x\,dx = \frac{a^x}{\ln a} + C Requires: a > 0; a \neq 1`);
    expect(r).toContain(raw`\int x^n\,dx = \frac{x^{n+1}}{n+1} + C Requires: n \neq -1`);
  });

  it('Calc 2: series intervals, Integral Test, Taylor remainder, radius, polar, surface area, parametric', () => {
    const r = readable(render(Calc2FormulaSheet));
    expect(r).toContain(raw`\ln(1+x) = \sum_{n=1}^{\infty} \frac{(-1)^{n+1} x^n}{n} Requires: -1 < x \leq 1`);
    expect(r).toContain(raw`\arctan x = \sum_{n=0}^{\infty} \frac{(-1)^n x^{2n+1}}{2n+1} Requires: |x| \leq 1`);
    expect(r).toContain(raw`Requires: f is positive, continuous and decreasing on [N, \infty); a_n = f(n)`); // Integral Test
    expect(r).toContain(raw`\sum (-1)^n b_n converges Requires: b_n > 0; b_n is (eventually) decreasing; \lim_{n\to\infty} b_n = 0`); // AST
    expect(r).toContain(raw`R_n(x) = f(x) - T_n(x) \to 0`); // Taylor equality
    expect(r).toContain(raw`with f(0) = 0`); // e^{-1/x^2} defined at 0
    expect(r).toContain('provided this limit exists'); // ratio formula for R
    expect(r).toContain('lim sup'); // Cauchy–Hadamard
    expect(r).toContain(raw`\theta = \operatorname{atan2}(y, x)`);
    expect(r).toContain(raw`r = \sqrt{x^2 + y^2} \geq 0`);
    expect(r).toContain(raw`|f(x)|\sqrt{1 + [f'(x)]^2}`); // surface area
    expect(r).toContain(raw`Requires: x(t) and y(t) differentiable; dx/dt \neq 0`);
    expect(r).toContain(raw`S_n = \frac{a_1(1-r^n)}{1-r} Requires: r \neq 1 for the sum S_n`);
    expect(r).toContain(raw`= \sum_{n=1}^{\infty} n \cdot c_n x^{n-1}`); // differentiated series starts at n = 1
    expect(r).toContain(raw`use M = e^{0.5}, not 1`); // Lagrange M caveat
  });
});
