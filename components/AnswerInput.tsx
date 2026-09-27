import React, { useEffect, useRef } from 'react';
import { AnswerSpec, Problem } from '../types';
import { partIsActive } from '../services/mathService';
import { previewInput } from '../services/grading/preview';
import MathText from './MathText';

/**
 * Answer controls, derived from the problem's answer contract. The parent
 * keeps one string per input slot in `values`:
 *  - fraction: [numerator, denominator]
 *  - choice: [typed word] (there are no answer buttons)
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

/** The spec that decides the controls: anyOf options share one kind, so the first one stands for all. */
const controlSpec = (spec: AnswerSpec): AnswerSpec => (spec.kind === 'anyOf' ? controlSpec(spec.options[0]) : spec);

export const slotCount = (problem: Problem): number => {
  const spec = controlSpec(problem.answer);
  return spec.kind === 'fraction' ? 2 : spec.kind === 'multipart' ? spec.parts.length : 1;
};

export const emptyValues = (problem: Problem): string[] => Array(slotCount(problem)).fill('');

/**
 * What validateAnswer receives for the current inputs, or null when the
 * answer is incomplete (the Check button stays disabled).
 */
export const toSubmission = (problem: Problem, values: string[]): string | string[] | null => {
  const filled = (v: string | undefined) => !!v && v.trim().length > 0;
  const spec = controlSpec(problem.answer);
  switch (spec.kind) {
    case 'fraction':
      return filled(values[0]) && filled(values[1]) ? `${values[0].trim()}/${values[1].trim()}` : null;
    case 'multipart': {
      const { parts } = spec;
      const complete = parts.every((_, i) => !partIsActive(parts, i, values) || filled(values[i]));
      if (!complete) return null;
      return parts.map((_, i) => (partIsActive(parts, i, values) ? values[i].trim() : ''));
    }
    default:
      return filled(values[0]) ? values[0] : null;
  }
};

/**
 * Keyboard and placeholder for a typed answer. A part with no reference
 * answer (`spec: null`, e.g. the limit of a divergent sequence) gets the same
 * control as its numeric counterpart, so the input's shape never reveals the
 * answer.
 */
const typedInput = (spec: AnswerSpec | null): { inputMode: 'decimal' | 'text'; placeholder: string } => {
  const s = spec === null ? null : controlSpec(spec);
  if (s === null || s.kind === 'number') {
    if (s?.kind === 'number' && s.extended) return { inputMode: 'text', placeholder: 'A number, or ∞ (type "infinity")' };
    return s?.kind === 'number' && s.unit === 'degree'
      ? { inputMode: 'decimal', placeholder: 'Angle in degrees (e.g. 45)' }
      : { inputMode: 'decimal', placeholder: 'Your answer (e.g. 12, -3, 3/5, 0.75)' };
  }
  switch (s.kind) {
    case 'limit': return { inputMode: 'text', placeholder: 'A number, ∞, −∞, or DNE' };
    case 'choice': return { inputMode: 'text', placeholder: 'Type your answer' };
    case 'interval': return { inputMode: 'text', placeholder: 'e.g. x < 3, or (-inf, 3]' };
    case 'finiteSet': return { inputMode: 'text', placeholder: 'e.g. 2, -3' };
    default: return { inputMode: 'text', placeholder: 'Your answer...' };
  }
};

/**
 * Symbol keys for a typed answer. They depend only on the answer's kind and
 * the generator's fixed form (never on the instance's value), so they reveal
 * nothing: a part with no reference answer gets the keys of its numeric
 * counterpart, and every key inserts text the grader already reads.
 */
export const symbolsFor = (spec: AnswerSpec | null): string[] => {
  const s = spec === null ? null : controlSpec(spec);
  if (s === null || s.kind === 'number') {
    const n = s?.kind === 'number' ? s : null;
    if (n?.form === 'evaluated') return [];   // arithmetic: the answer is a plain number
    return ['π', '√', '^', ...(n?.extended ? ['∞'] : []), ...(n?.unit === 'degree' ? ['°'] : [])];
  }
  switch (s.kind) {
    case 'expression':
    case 'antiderivative':
    case 'equation':
      return ['π', '√', '^', ...(JSON.stringify(s).includes('theta') ? ['θ'] : [])];
    case 'limit': return ['π', '√', '^', '∞'];
    case 'interval': return ['≤', '≥', '∞', '∪'];
    case 'finiteSet': return ['π', '√'];
    default: return [];
  }
};

/** `value` with `text` replacing the selection [start, end); the caret lands after it. */
export const insertAt = (value: string, start: number, end: number, text: string): { value: string; caret: number } =>
  ({ value: value.slice(0, start) + text + value.slice(end), caret: start + text.length });

/** "Reads as: …": the grader's reading of the input, updated as the student types. */
function InputPreview({ spec, value }: { spec: AnswerSpec | null; value: string }) {
  const preview = previewInput(spec, value);
  return (
    <p className="min-h-[2rem] text-base text-slate-400" aria-live="polite">
      {preview && ('tex' in preview
        ? <>Reads as: <MathText text={`$${preview.tex}$`} /></>
        : <span className="text-amber-400/80"><MathText text={preview.error} /></span>)}
    </p>
  );
}

function SymbolKeys({ symbols, onInsert, disabled }: { symbols: string[]; onInsert: (s: string) => void; disabled: boolean }) {
  if (symbols.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label="Insert a symbol">
      {symbols.map(sym => (
        <button
          key={sym} type="button" disabled={disabled}
          // keep focus (and the caret) in the input
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsert(sym)}
          aria-label={`Insert ${sym}`}
          className="min-w-[2.75rem] px-3 py-1.5 rounded-md bg-slate-700 border border-slate-600 text-lg text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          {sym}
        </button>
      ))}
    </div>
  );
}

const textInputClass = (status: AnswerInputProps['status'], animate: boolean, width = 'w-full') =>
  `${width} text-xl p-4 bg-slate-700 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50 ${
    status === 'incorrect' ? `border-red-500 ${animate ? 'animate-shake' : ''}` : 'border-slate-600'
  }`;

export default function AnswerInput({ problem, values, onChange, disabled, status, animate }: AnswerInputProps) {
  const set = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const spec = controlSpec(problem.answer);

  // Symbol keys insert into the typed input that last had focus, at its caret.
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const activeSlot = useRef(0);
  const pendingCaret = useRef<{ slot: number; caret: number } | null>(null);
  useEffect(() => {
    const pending = pendingCaret.current;
    if (!pending) return;
    pendingCaret.current = null;
    const el = inputs.current[pending.slot];
    el?.focus();
    el?.setSelectionRange(pending.caret, pending.caret);
  });
  const insert = (text: string) => {
    const slot = activeSlot.current;
    const value = values[slot] ?? '';
    const el = inputs.current[slot];
    const start = el?.selectionStart ?? value.length;
    const next = insertAt(value, start, el?.selectionEnd ?? start, text);
    pendingCaret.current = { slot, caret: next.caret };
    set(slot, next.value);
  };
  const typedProps = (slot: number) => ({
    ref: (el: HTMLInputElement | null) => { inputs.current[slot] = el; },
    onFocus: () => { activeSlot.current = slot; },
  });

  if (spec.kind === 'fraction') {
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

  if (spec.kind === 'multipart') {
    const { parts } = spec;
    const typedParts = parts.map((part, i) => ({ part, i })).filter(({ i }) => partIsActive(parts, i, values));
    const symbols = [...new Set(typedParts.flatMap(({ part }) => symbolsFor(part.spec)))];
    if (typedParts.length > 0 && !typedParts.some(({ i }) => i === activeSlot.current)) activeSlot.current = typedParts[0].i;
    return (
      <div className="flex flex-col gap-4">
        {parts.map((part, i) => {
          if (!partIsActive(parts, i, values)) return null;
          const partSpec = part.spec === null ? null : controlSpec(part.spec);
          const typed = typedInput(partSpec);
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-slate-300">{part.label}</span>
              <input
                type="text" inputMode={typed.inputMode} autoComplete="off" spellCheck={false} aria-label={part.label}
                value={values[i] ?? ''} onChange={e => set(i, e.target.value)} disabled={disabled}
                placeholder={typed.placeholder} className={textInputClass(status, animate, 'w-72')} {...typedProps(i)}
                autoFocus={i === 0}
              />
              {partSpec?.kind === 'choice'
                ? <p className="text-sm text-slate-400">One of: {partSpec.options.map(o => `“${o}”`).join(' · ')}</p>
                : <InputPreview spec={part.spec} value={values[i] ?? ''} />}
            </div>
          );
        })}
        {typedParts.length > 0 && <SymbolKeys symbols={symbols} onInsert={insert} disabled={disabled} />}
      </div>
    );
  }

  const typed = typedInput(spec);
  return (
    <div className="flex flex-col items-center gap-2">
      <input
        // A text input (not type="number") so fractions like "3/5" and exact
        // forms like "sqrt(3)/2" or "pi/4" can be typed for numeric answers.
        type="text"
        inputMode={typed.inputMode}
        autoComplete="off"
        spellCheck={false}
        aria-label="Answer"
        value={values[0] ?? ''}
        onChange={e => set(0, e.target.value)}
        disabled={disabled}
        placeholder={typed.placeholder}
        autoFocus
        className={textInputClass(status, animate)}
        {...typedProps(0)}
      />
      {spec.kind === 'choice'
        ? <p className="text-sm text-slate-400">One of: {spec.options.map(o => `“${o}”`).join(' · ')}</p>
        : <InputPreview spec={spec} value={values[0] ?? ''} />}
      <SymbolKeys symbols={symbolsFor(spec)} onInsert={insert} disabled={disabled} />
    </div>
  );
}
