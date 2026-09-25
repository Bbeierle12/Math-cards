import React from 'react';
import { Problem } from '../types';
import { partIsActive } from '../services/mathService';

/**
 * Answer controls for every answer kind. The parent keeps one string per
 * input slot in `values`:
 *  - fraction: [numerator, denominator]
 *  - multiple-choice: [selected option]
 *  - multipart: one entry per part
 *  - everything else: [text]
 */
interface AnswerInputProps {
  problem: Problem;
  values: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
  status: 'idle' | 'correct' | 'incorrect';
  animate: boolean;
}

export const slotCount = (problem: Problem): number =>
  problem.answerType === 'fraction' ? 2
    : problem.answerType === 'multipart' ? (problem.parts?.length ?? 0)
      : 1;

export const emptyValues = (problem: Problem): string[] => Array(slotCount(problem)).fill('');

/**
 * What validateAnswer receives for the current inputs, or null when the
 * answer is incomplete (the Check button stays disabled).
 */
export const toSubmission = (problem: Problem, values: string[]): string | string[] | null => {
  const filled = (v: string | undefined) => !!v && v.trim().length > 0;
  switch (problem.answerType) {
    case 'fraction':
      return filled(values[0]) && filled(values[1]) ? `${values[0].trim()}/${values[1].trim()}` : null;
    case 'multipart': {
      const parts = problem.parts ?? [];
      const complete = parts.every((_, i) => !partIsActive(parts, i, values) || filled(values[i]));
      if (!complete) return null;
      return parts.map((_, i) => (partIsActive(parts, i, values) ? values[i].trim() : ''));
    }
    default:
      return filled(values[0]) ? values[0] : null;
  }
};

const isNumericInput = (problem: Problem) =>
  problem.answerType === 'numeric' || problem.answerType === 'decimal-tolerance';

const textInputClass = (status: AnswerInputProps['status'], animate: boolean, width = 'w-full') =>
  `${width} text-xl p-4 bg-slate-700 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50 ${
    status === 'incorrect' ? `border-red-500 ${animate ? 'animate-shake' : ''}` : 'border-slate-600'
  }`;

function ChoiceButtons({ options, value, onSelect, disabled, label }: {
  options: string[]; value: string; onSelect: (v: string) => void; disabled: boolean; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap justify-center gap-2">
      {options.map(opt => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className={`min-w-[8rem] px-5 py-3 rounded-lg text-lg font-semibold capitalize border-2 transition-colors disabled:opacity-60 ${
              selected ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function AnswerInput({ problem, values, onChange, disabled, status, animate }: AnswerInputProps) {
  const set = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };

  if (problem.answerType === 'fraction') {
    return (
      <div className="flex flex-col items-center gap-2">
        <input
          type="text" inputMode="numeric" autoComplete="off" aria-label="Numerator"
          value={values[0] ?? ''} onChange={e => set(0, e.target.value)} disabled={disabled}
          placeholder="Numerator" autoFocus className={textInputClass(status, false, 'w-48')}
        />
        <div className="w-48 h-0.5 bg-slate-400" />
        <input
          type="text" inputMode="numeric" autoComplete="off" aria-label="Denominator"
          value={values[1] ?? ''} onChange={e => set(1, e.target.value)} disabled={disabled}
          placeholder="Denominator" className={textInputClass(status, animate, 'w-48')}
        />
      </div>
    );
  }

  if (problem.answerType === 'multiple-choice') {
    return (
      <ChoiceButtons
        options={problem.multipleChoiceOptions ?? []} value={values[0] ?? ''}
        onSelect={v => set(0, v)} disabled={disabled} label="Answer"
      />
    );
  }

  if (problem.answerType === 'multipart') {
    const parts = problem.parts ?? [];
    return (
      <div className="flex flex-col gap-4">
        {parts.map((part, i) => {
          if (!partIsActive(parts, i, values)) return null;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-slate-300">{part.label}</span>
              {part.kind === 'choice' ? (
                <ChoiceButtons
                  options={part.options ?? []} value={values[i] ?? ''}
                  onSelect={v => set(i, v)} disabled={disabled} label={part.label}
                />
              ) : (
                <input
                  type="text" inputMode="decimal" autoComplete="off" spellCheck={false} aria-label={part.label}
                  value={values[i] ?? ''} onChange={e => set(i, e.target.value)} disabled={disabled}
                  placeholder="e.g. 0, 1, 3/2" className={textInputClass(status, animate, 'w-64')}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <input
      // A text input (not type="number") so fractions like "3/5" and exact
      // forms like "sqrt(3)/2" or "pi/4" can be typed for numeric answers.
      type="text"
      inputMode={isNumericInput(problem) ? 'decimal' : 'text'}
      autoComplete="off"
      spellCheck={false}
      aria-label="Answer"
      value={values[0] ?? ''}
      onChange={e => set(0, e.target.value)}
      disabled={disabled}
      placeholder={isNumericInput(problem) ? 'Your answer (e.g. 12, -3, 3/5, 0.75)' : 'Your answer...'}
      autoFocus
      className={textInputClass(status, animate)}
    />
  );
}
