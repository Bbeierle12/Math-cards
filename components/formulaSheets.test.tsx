/**
 * Direct tests for the formula-sheet content. Each sheet is rendered to static
 * HTML (no DOM needed); we assert that every LaTeX segment renders without a
 * KaTeX error and that the hypotheses / domain conditions each statement needs
 * are present in the rendered text.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PreAlgebraFormulaSheet from './PreAlgebraFormulaSheet';
import Algebra1FormulaSheet from './Algebra1FormulaSheet';
import GeometryFormulaSheet from './GeometryFormulaSheet';
import Algebra2FormulaSheet from './Algebra2FormulaSheet';
import PreCalculusFormulaSheet from './PreCalculusFormulaSheet';
import CalculusFormulaSheet from './CalculusFormulaSheet';
import Calc2FormulaSheet from './Calc2FormulaSheet';

type Sheet = React.ComponentType<{ onComplete: () => void }>;

const render = (Component: Sheet): string =>
  renderToStaticMarkup(React.createElement(Component, { onComplete: () => {} }));

/** Visible text of the sheet: tags stripped, entities decoded, whitespace collapsed. */
const textOf = (html: string): string =>
  html
    .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, ' ') // KaTeX keeps the LaTeX source here
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');

const decode = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

/** The LaTeX sources KaTeX embedded (one per MathText segment), entity-decoded. */
const latexOf = (html: string): string[] =>
  [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map(m => decode(m[1]));

const SHEETS: [string, Sheet][] = [
  ['PreAlgebra', PreAlgebraFormulaSheet],
  ['Algebra1', Algebra1FormulaSheet],
  ['Geometry', GeometryFormulaSheet],
  ['Algebra2', Algebra2FormulaSheet],
  ['PreCalculus', PreCalculusFormulaSheet],
  ['Calculus', CalculusFormulaSheet],
  ['Calc2', Calc2FormulaSheet],
];

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

describe('formula statements carry their hypotheses', () => {
  it('Pre-Algebra: fraction identities require nonzero denominators', () => {
    const src = latexOf(render(PreAlgebraFormulaSheet)).join(' ');
    expect(src).toMatch(/c \\neq 0/);
    expect(src).toMatch(/b, d \\neq 0/);
    expect(src).toMatch(/b, c, d \\neq 0/);
  });

  it('Algebra 1: slope, quotient rule, zero and negative exponents', () => {
    const t = textOf(render(Algebra1FormulaSheet));
    const src = latexOf(render(Algebra1FormulaSheet)).join(' ');
    expect(src).toMatch(/x_2 \\neq x_1/);
    expect(t).toMatch(/vertical line has no slope/);
    expect(src.match(/a \\neq 0/g)?.length ?? 0).toBeGreaterThanOrEqual(3); // quotient, zero, negative exponent rules
  });

  it('Geometry: sector area in radians, symbols defined', () => {
    const t = textOf(render(GeometryFormulaSheet));
    expect(t).toMatch(/Sector area[\s\S]*\(radians\)/);
    expect(t).toMatch(/apothem/);
    expect(t).toMatch(/slant height/);
  });

  it('Algebra 2: real radical rules need non-negative radicands; logs need b > 0, b ≠ 1, x > 0; r ≠ 1', () => {
    const t = textOf(render(Algebra2FormulaSheet));
    const src = latexOf(render(Algebra2FormulaSheet)).join(' ');
    expect(t).toMatch(/non-negative radicands/);
    expect(src).toMatch(/a, b \\geq 0/);
    expect(src).toMatch(/\\sqrt\{a\^2\} = \|a\|/);
    expect(src).toMatch(/b \\neq 1/);
    expect(src).toMatch(/x, y > 0/);
    expect(src).toMatch(/r \\neq 1/);
    expect(src).toMatch(/\\sqrt\{-1\}\\cdot\\sqrt\{-1\} = i\^2 = -1/); // the a = b = −1 counterexample
  });

  it('Pre-Calculus: asymptote cases, holes vs vertical asymptotes, conic conventions, ln/exp domains', () => {
    const t = textOf(render(PreCalculusFormulaSheet));
    const src = latexOf(render(PreCalculusFormulaSheet)).join(' ');
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
  });

  it('Calculus: FTC continuity, limit-law hypotheses, quotient rule and log/exponential domains', () => {
    const t = textOf(render(CalculusFormulaSheet));
    expect(t).toMatch(/If f is continuous on \[a,b\] and F\(x\) = ∫/);
    expect(t).toMatch(/F is any antiderivative of f/);
    expect(t).toMatch(/both exist and are finite/);
    expect(t).toMatch(/provided lim\[x→c\] g\(x\) ≠ 0/);
    expect(t).toMatch(/g\(x\) ≠ 0/);
    expect(t).toMatch(/= a x ln\(a\) \(a > 0\)/);
    expect(t).toMatch(/\(x > 0, a > 0, a ≠ 1\)/);
  });

  it('Calc 2: series intervals, Integral Test, Taylor remainder, radius, polar, surface area, parametric', () => {
    const t = textOf(render(Calc2FormulaSheet));
    expect(t).toMatch(/−1 < x ≤ 1/);                       // ln(1+x)
    expect(t).toMatch(/\(2n\+1\), \|x\| ≤ 1/);              // arctan
    expect(t).toMatch(/positive, continuous and decreasing/); // Integral Test
    expect(t).toMatch(/bₙ > 0/);                            // AST
    expect(t).toMatch(/Rₙ\(x\) = f\(x\) − Tₙ\(x\) → 0/);    // Taylor equality
    expect(t).toMatch(/f\(0\) = 0/);                        // e^{-1/x^2} defined at 0
    expect(t).toMatch(/provided this limit exists/);        // ratio formula for R
    expect(t).toMatch(/lim sup/);                           // Cauchy–Hadamard
    expect(t).toMatch(/atan2\(y, x\)/);
    expect(t).toMatch(/r = √\(x² \+ y²\) ≥ 0/);
    expect(t).toMatch(/\|f\(x\)\| √\(1 \+ \[f'\(x\)\]²\)/); // surface area
    expect(t).toMatch(/dx\/dt ≠ 0/);
    expect(t).toMatch(/for r ≠ 1/);
    expect(t).toMatch(/n=1 ∞ n·cₙxⁿ⁻¹/);                   // differentiated series starts at n = 1
    expect(t).toMatch(/M = e 0.5 , not 1/);                 // Lagrange M caveat
  });
});
