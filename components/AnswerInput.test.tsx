import { describe, it, expect } from 'vitest';
import { toSubmission, emptyValues } from './AnswerInput';
import { generateProblem, validateAnswer } from '../services/mathService';
import { Problem } from '../types';

const convergence = (): Problem => {
  for (let i = 0; i < 500; i++) {
    const p = generateProblem('sequences');
    if (p.answerType === 'multipart') return p;
  }
  throw new Error('no multipart sequence problem generated');
};

describe('toSubmission', () => {
  it('builds a fraction from both boxes, or nothing', () => {
    const p = generateProblem('fractions-basic');
    expect(emptyValues(p)).toEqual(['', '']);
    expect(toSubmission(p, ['3', ''])).toBeNull();
    expect(toSubmission(p, [' 3 ', '4'])).toBe('3/4');
  });

  it('requires the limit only when "converges" is selected', () => {
    const p = convergence();
    expect(emptyValues(p)).toEqual(['', '']);
    expect(toSubmission(p, ['', ''])).toBeNull();
    expect(toSubmission(p, ['converges', ''])).toBeNull();
    expect(toSubmission(p, ['converges', ' 0 '])).toEqual(['converges', '0']);
    // a limit typed before switching to "diverges" is dropped, not graded
    expect(toSubmission(p, ['diverges', '5'])).toEqual(['diverges', '']);
  });

  it('round-trips through validateAnswer for the reference answer', () => {
    for (let i = 0; i < 30; i++) {
      const p = convergence();
      const values = p.parts!.map(part => (part.answer === null ? '' : String(part.answer)));
      const submission = toSubmission(p, values);
      expect(submission).not.toBeNull();
      expect(validateAnswer(p, submission!)).toBe(true);
    }
  });

  it('passes single answers through unchanged', () => {
    const p = generateProblem('addition');
    expect(toSubmission(p, [''])).toBeNull();
    expect(toSubmission(p, ['12'])).toBe('12');
  });
});
