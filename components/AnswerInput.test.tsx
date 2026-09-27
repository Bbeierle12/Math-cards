import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AnswerInput, { toSubmission, emptyValues, slotCount, symbolsFor, insertAt } from './AnswerInput';
import { generateProblem, validateAnswer } from '../services/mathService';
import { canonicalInput } from '../services/grading';
import { GENERATORS } from '../services/generators';
import { AnswerSpec, Problem } from '../types';

const convergence = (want: 'converges' | 'diverges' | 'any' = 'any'): Problem[] => {
  const out: Problem[] = [];
  for (let i = 0; i < 400 && out.length < 10; i++) {
    const p = generateProblem('sequences', {}, `ai-${i}`);
    if (p.answer.kind !== 'multipart') continue;
    const verdict = p.answer.parts[0].spec;
    if (want === 'any' || (verdict?.kind === 'choice' && verdict.answer === want)) out.push(p);
  }
  if (out.length === 0) throw new Error('no multipart sequence problem generated');
  return out;
};

describe('toSubmission', () => {
  it('builds a fraction from both boxes, or nothing', () => {
    const p = generateProblem('fractions-basic', {}, 'f');
    expect(emptyValues(p)).toEqual(['', '']);
    expect(toSubmission(p, ['3', ''])).toBeNull();
    expect(toSubmission(p, [' 3 ', '4'])).toBe('3/4');
  });

  it('requires the limit only when "converges" is selected', () => {
    const [p] = convergence();
    expect(emptyValues(p)).toEqual(['', '']);
    expect(toSubmission(p, ['', ''])).toBeNull();
    expect(toSubmission(p, ['converges', ''])).toBeNull();
    expect(toSubmission(p, ['converges', ' 0 '])).toEqual(['converges', '0']);
    // a limit typed before switching to "diverges" is dropped, not graded
    expect(toSubmission(p, ['diverges', '5'])).toEqual(['diverges', '']);
  });

  it('convergent and divergent questions have the same shape', () => {
    const [c] = convergence('converges');
    const [d] = convergence('diverges');
    expect(slotCount(c)).toBe(slotCount(d));
    expect(toSubmission(d, ['converges', '1'])).toEqual(['converges', '1']);
    expect(validateAnswer(d, ['converges', '1'])).toBe(false);
  });

  it('passes single answers through unchanged', () => {
    const p = generateProblem('addition', {}, 'a');
    expect(toSubmission(p, [''])).toBeNull();
    expect(toSubmission(p, ['12'])).toBe('12');
  });

  it('the canonical answer of every generator survives the input controls', () => {
    for (const topic of GENERATORS.keys()) {
      for (let i = 0; i < 5; i++) {
        const p = generateProblem(topic, {}, `ui-${i}`);
        const canonical = canonicalInput(p.answer);
        // what the student would put in the slots
        const values = Array.isArray(canonical) ? canonical
          : p.answer.kind === 'fraction' ? String(canonical).split('/')
            : [String(canonical)];
        expect(values.length).toBe(slotCount(p));
        const submission = toSubmission(p, values);
        expect(submission, `${topic}: ${p.problemText}`).not.toBeNull();
        expect(validateAnswer(p, submission!), `${topic}: ${JSON.stringify(submission)}`).toBe(true);
      }
    }
  });
});

describe('input preview and symbol keys', () => {
  it('symbol keys depend on the answer kind, never on the instance', () => {
    const [c] = convergence('converges');
    const [d] = convergence('diverges');
    const keys = (p: Problem) => (p.answer.kind === 'multipart' ? p.answer.parts.map(part => symbolsFor(part.spec)) : [symbolsFor(p.answer)]);
    expect(keys(c)).toEqual(keys(d));
    expect(symbolsFor(generateProblem('addition', {}, 'k').answer)).toEqual([]);   // evaluated arithmetic: digits only
    for (let i = 0; i < 20; i++) {
      const p = generateProblem('power-series', {}, `k-${i}`);
      expect(symbolsFor(p.answer)).toEqual(['π', '√', '^', '∞']);   // R = ∞ or not, the same keys
    }
    expect(symbolsFor({ kind: 'interval', variable: 'x', set: [] })).toEqual(['≤', '≥', '∞', '∪']);
  });

  it('every key inserts text the grader reads', () => {
    const withAnswer = (answer: AnswerSpec): Problem => ({ ...generateProblem('addition', {}, 'k'), answer });
    const exactly = (value: number, extra: Partial<AnswerSpec> = {}) => withAnswer({ kind: 'number', value, tolerance: { kind: 'exact' }, ...extra } as AnswerSpec);
    expect(validateAnswer(exactly(Math.PI / 4), 'π/4')).toBe(true);
    expect(validateAnswer(exactly(Math.sqrt(3) / 2), '√3/2')).toBe(true);
    expect(validateAnswer(exactly(2 ** 10), '2^10')).toBe(true);
    expect(validateAnswer(exactly(Infinity, { extended: true }), '∞')).toBe(true);
    expect(validateAnswer(exactly(45, { unit: 'degree' }), '45°')).toBe(true);
    const union: AnswerSpec = { kind: 'interval', variable: 'x', set: [
      { lo: -Infinity, hi: 1, loClosed: false, hiClosed: false }, { lo: 3, hi: Infinity, loClosed: true, hiClosed: false }] };
    expect(validateAnswer(withAnswer(union), '(-∞, 1) ∪ [3, ∞)')).toBe(true);
    const ray: AnswerSpec = { kind: 'interval', variable: 'x', set: [{ lo: 2, hi: Infinity, loClosed: true, hiClosed: false }] };
    expect(validateAnswer(withAnswer(ray), 'x ≥ 2')).toBe(true);
    expect(validateAnswer(withAnswer({ kind: 'expression', reference: 'sin(theta)^2', parameters: ['theta'] }), 'sin²θ')).toBe(true);
  });

  it('inserts at the caret, replacing a selection', () => {
    expect(insertAt('3/2', 0, 0, '√')).toEqual({ value: '√3/2', caret: 1 });
    expect(insertAt('x2', 1, 1, '^')).toEqual({ value: 'x^2', caret: 2 });
    expect(insertAt('2pi', 1, 3, 'π')).toEqual({ value: '2π', caret: 2 });
  });

  it('shows how the typed answer is read', () => {
    const p = { ...generateProblem('addition', {}, 'k'), answer: { kind: 'number', value: Math.sqrt(3) / 2, tolerance: { kind: 'exact' } } } as Problem;
    const html = renderToStaticMarkup(React.createElement(AnswerInput, {
      problem: p, values: ['√3/2'], onChange: () => {}, disabled: false, status: 'idle', animate: false,
    }));
    expect(html).toContain('Reads as:');
    expect(html).toContain('katex');
    expect(html).not.toMatch(/katex-error/);
    expect(html).toContain('Insert √');
  });
});
