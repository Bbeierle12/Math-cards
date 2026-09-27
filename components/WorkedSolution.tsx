import React from 'react';
import MathText from './MathText';
import type { SolutionStep } from '../types';

/**
 * A worked solution, one step per line. A theorem step names the result,
 * lists each hypothesis with its check for this problem, then gives what the
 * theorem yields — so the conclusion is never shown without its conditions.
 */
export default function WorkedSolution({ steps }: { steps: SolutionStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="mt-3 space-y-2 text-left text-sm text-slate-300 list-decimal list-inside" aria-label="Worked solution">
      {steps.map((s, i) => (
        <li key={i}>
          {s.kind === 'step' ? (
            <MathText text={s.text} />
          ) : (
            <span>
              <strong className="text-slate-200"><MathText text={s.name} /></strong>
              <ul className="mt-1 ml-5 space-y-1">
                {s.hypotheses.map((h, j) => (
                  <li key={j}>
                    <span aria-hidden="true" className="text-green-400 mr-1">✓</span>
                    <MathText text={h.condition} /> <span className="text-slate-400">— <MathText text={h.check} /></span>
                  </li>
                ))}
              </ul>
              <span className="block mt-1 ml-5">
                <span aria-hidden="true" className="mr-1">⇒</span><MathText text={s.conclusion} />
              </span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
