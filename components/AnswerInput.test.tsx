import { describe, it, expect } from 'vitest';
import { toSubmission, emptyValues, slotCount } from './AnswerInput';
import { generateProblem, validateAnswer } from '../services/mathService';
import { canonicalInput } from '../services/grading';
import { GENERATORS } from '../services/generators';
import { Problem } from '../types';

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
