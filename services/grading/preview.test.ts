import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { previewInput } from './preview';
import type { AnswerSpec } from '../../types';

const num: AnswerSpec = { kind: 'number', value: 1, tolerance: { kind: 'exact' } };
const tex = (spec: AnswerSpec | null, input: string): string => {
  const p = previewInput(spec, input);
  if (p === null || !('tex' in p)) throw new Error(`no preview for ${input}: ${JSON.stringify(p)}`);
  katex.renderToString(p.tex, { throwOnError: true });
  return p.tex.replace(/\s+/g, '');
};

describe('previewInput', () => {
  it('shows how a radical, π and implicit products are grouped', () => {
    expect(tex(num, '√3/2')).toBe('\\frac{\\sqrt{3}}{2}');
    expect(tex(num, 'sqrt(3/2)')).toBe('\\sqrt{\\frac{3}{2}}');
    expect(tex(num, '2pi')).toBe('2\\cdot\\pi');
    expect(tex(num, 'π/4')).toBe('\\frac{\\pi}{4}');
    expect(tex(num, '1/2x')).toBe('\\frac{1}{2}\\cdotx');   // (1/2)·x, not 1/(2x): visible before submitting
  });

  it('reads numbers the way their spec does', () => {
    expect(tex(null, '3/5')).toBe('\\frac{3}{5}');   // a part asked only when the answer converges
    expect(tex({ ...num, extended: true }, 'infinity')).toBe('\\infty');
    expect(tex({ ...num, extended: true }, '∞')).toBe('\\infty');
    expect(tex({ ...num, unit: 'degree' }, '45°')).toBe('45^{\\circ}');
  });

  it('reads expressions, assignments and equations', () => {
    const ex: AnswerSpec = { kind: 'expression', reference: 'x', assignable: ['u'] };
    expect(tex(ex, 'sin^2(x)')).toBe('{\\left(\\sin\\left(x\\right)\\right)}^{2}');
    expect(tex(ex, 'x√2')).toBe('x\\cdot\\sqrt{2}');
    expect(tex(ex, 'sec^2θ')).toBe('{\\sec\\left(\\theta\\right)}^{2}');
    expect(tex(ex, 'u = x^2+5')).toBe('u={x}^{2}+5');
    expect(tex({ kind: 'antiderivative', integrand: 'x', variable: 'x' }, '-ln|cos x|')).toBe('-\\ln\\left(\\left|\\cos\\left(x\\right)\\right|\\right)');
    expect(tex({ kind: 'equation', lhs: 'y', rhs: 'x' }, 'y = 2x + 1')).toBe('y=2\\cdotx+1');
    expect(previewInput({ kind: 'equation', lhs: 'y', rhs: 'x' }, '2x + 1')).toHaveProperty('error');
  });

  it('reads solution sets as the grader parses them', () => {
    const iv: AnswerSpec = { kind: 'interval', variable: 'x', set: [] };
    expect(tex(iv, 'x < 3')).toBe('(-\\infty,3)');
    expect(tex(iv, 'x >= -2')).toBe('[-2,\\infty)');
    expect(tex(iv, '1 < x <= 3')).toBe('(1,3]');
    expect(tex(iv, '(-inf,1) U (3,inf)')).toBe('(-\\infty,1)\\cup(3,\\infty)');
    expect(previewInput(iv, 'y < 3')).toHaveProperty('error');   // a different variable is not read as this set
    const fs: AnswerSpec = { kind: 'finiteSet', elements: [] };
    expect(tex(fs, 'x = 2 or x = -3')).toBe('\\left\\{2,-3\\right\\}');
    expect(tex(fs, 'sqrt(2), -sqrt(2)')).toBe('\\left\\{\\sqrt{2},-\\sqrt{2}\\right\\}');
    expect(tex(fs, '∅')).toBe('\\varnothing');
  });

  it('reports incomplete input and skips what it cannot preview', () => {
    expect(previewInput(num, 'sin(')).toEqual({ error: 'Not a complete expression yet' });
    expect(previewInput(num, '   ')).toBeNull();
    expect(previewInput({ kind: 'choice', options: ['yes', 'no'], answer: 'yes' }, 'yes')).toBeNull();
    expect(previewInput({ kind: 'text', accepted: ['circle'] }, 'circle')).toBeNull();
  });
});
