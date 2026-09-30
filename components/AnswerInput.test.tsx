import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AnswerInput, { toSubmission, emptyValues, slotCount, symbolsFor, insertAt } from './AnswerInput';
import { generateProblem, validateAnswer } from '../services/mathService';
import { canonicalInput } from '../services/grading';
import { GENERATORS } from '../services/generators';
import { AnswerSpec, Problem } from '../types';

/** Geometric-series questions: common ratio, verdict word, and the sum (asked only after "converges"). */
const geometric = (want: 'converges' | 'diverges' | 'any' = 'any'): Problem[] => {
  const out: Problem[] = [];
  for (let i = 0; i < 600 && out.length < 10; i++) {
    const p = generateProblem('series-convergence', {}, `ai-${i}`);
    if (p.templateId !== 'geometric' || p.answer.kind !== 'multipart') continue;
    const verdict = p.answer.parts[1].spec;
    if (want === 'any' || (verdict?.kind === 'choice' && verdict.answer === want)) out.push(p);
  }
  if (out.length === 0) throw new Error('no geometric series problem generated');
  return out;
};

/** Sequence-limit questions whose limit is finite, infinite, or does not exist. */
const limitProblem = (want: 'finite' | 'infinite' | 'none'): Problem => {
  for (let i = 0; i < 2000; i++) {
    const p = generateProblem('sequences', {}, `al-${i}`);
    if (p.answer.kind !== 'limit') continue;
    const v = p.answer.value;
    const kind = v === null ? 'none' : Number.isFinite(v) ? 'finite' : 'infinite';
    if (kind === want) return p;
  }
  throw new Error(`no ${want} limit generated`);
};

describe('toSubmission', () => {
  it('builds a fraction from both boxes, or nothing', () => {
    const p = generateProblem('fractions-basic', {}, 'f');
    expect(emptyValues(p)).toEqual(['', '']);
    expect(toSubmission(p, ['3', ''])).toBeNull();
    expect(toSubmission(p, [' 3 ', '4'])).toBe('3/4');
  });

  it('requires the sum only when "converges" is typed', () => {
    const [p] = geometric();
    expect(emptyValues(p)).toEqual(['', '', '']);
    expect(toSubmission(p, ['', '', ''])).toBeNull();
    expect(toSubmission(p, ['', 'diverges', ''])).toBeNull();          // the ratio is always required
    expect(toSubmission(p, ['1/2', 'converges', ''])).toBeNull();
    expect(toSubmission(p, ['1/2', 'converges', ' 4 '])).toEqual(['1/2', 'converges', '4']);
    // a sum typed before switching to "diverges" is dropped, not graded
    expect(toSubmission(p, ['2', 'diverges', '5'])).toEqual(['2', 'diverges', '']);
  });

  it('the shape of the answer never reveals it', () => {
    const [c] = geometric('converges');
    const [d] = geometric('diverges');
    expect(slotCount(c)).toBe(slotCount(d));
    expect(validateAnswer(d, [canonicalInput(d.answer)[0], 'converges', '1'])).toBe(false);
    // a finite, infinite or nonexistent limit is typed into the same single box
    const limits = [limitProblem('finite'), limitProblem('infinite'), limitProblem('none')];
    expect(new Set(limits.map(slotCount))).toEqual(new Set([1]));
    expect(new Set(limits.map(q => JSON.stringify(symbolsFor(q.answer)))).size).toBe(1);
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
    const [c] = geometric('converges');
    const [d] = geometric('diverges');
    const keys = (p: Problem) => (p.answer.kind === 'multipart' ? p.answer.parts.map(part => symbolsFor(part.spec)) : [symbolsFor(p.answer)]);
    expect(keys(c)).toEqual(keys(d));
    const limits = [limitProblem('finite'), limitProblem('infinite'), limitProblem('none')];
    expect(limits.map(keys)).toEqual([keys(limits[0]), keys(limits[0]), keys(limits[0])]);
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
