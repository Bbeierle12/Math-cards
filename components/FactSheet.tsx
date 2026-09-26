import React from 'react';
import { ArrowLeftIcon } from './Icons';
import MathText from './MathText';
import type { Fact, FactSection, FactSheet } from '../data/facts';

interface FactSheetViewProps {
  sheet: FactSheet;
  onComplete: () => void;
}

/** How a list of facts is drawn: stacked cards, label | formula rows, or the two-column grids of the full-width panels. */
type Variant = 'cards' | 'rows' | 'highlight' | 'wide';

const LIST_CLASS: Record<Variant, string> = {
  cards: 'space-y-3',
  rows: 'space-y-2 text-sm',
  highlight: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  wide: 'grid grid-cols-1 md:grid-cols-2 gap-3 text-sm',
};

const CARD_CLASS: Record<Exclude<Variant, 'rows'>, { item: string; title: string; firstLine: string; line: string }> = {
  cards: {
    item: 'bg-slate-800/50 p-3 rounded',
    title: 'font-semibold text-cyan-300',
    firstLine: 'text-sm text-slate-200 mt-1',
    line: 'text-sm text-slate-200',
  },
  highlight: {
    item: 'bg-slate-800/50 p-4 rounded',
    title: 'font-semibold text-amber-300 mb-2',
    firstLine: 'text-sm text-slate-300',
    line: 'text-sm text-slate-300',
  },
  wide: {
    item: 'bg-slate-800/50 p-3 rounded',
    title: 'font-semibold text-cyan-300',
    firstLine: 'text-slate-200 mt-1',
    line: 'text-slate-200',
  },
};

const SMALL_PRINT = 'text-xs text-slate-400 mt-1';

/** Hypotheses, conclusion, note and counterexample, in that order, as small print. */
function FactDetails({ fact }: { fact: Fact }) {
  return (
    <>
      {fact.hypotheses.length > 0 && (
        <p className={SMALL_PRINT}>
          <span className="font-semibold">Requires:</span>{' '}
          {fact.hypotheses.map((hypothesis, i) => (
            <React.Fragment key={i}>
              {i > 0 && '; '}
              <MathText text={hypothesis} />
            </React.Fragment>
          ))}
        </p>
      )}
      {fact.conclusion && (
        <p className={SMALL_PRINT}>
          <MathText text={fact.conclusion} />
        </p>
      )}
      {fact.note && (
        <p className={SMALL_PRINT}>
          <MathText text={fact.note} />
        </p>
      )}
      {fact.counterexample && (
        <p className={SMALL_PRINT}>
          <span className="font-semibold">Counterexample:</span> <MathText text={fact.counterexample} />
        </p>
      )}
    </>
  );
}

function FactItem({ fact, variant }: { fact: Fact; variant: Variant }) {
  if (variant === 'rows') {
    return (
      <div className="bg-slate-800/50 p-2 rounded">
        <div className="flex justify-between items-center gap-4">
          <p className="text-slate-300">
            <MathText text={fact.title} />
          </p>
          <p className="font-mono text-green-300 text-right">
            {fact.statement.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                <MathText text={line} />
              </React.Fragment>
            ))}
          </p>
        </div>
        <FactDetails fact={fact} />
      </div>
    );
  }

  const style = CARD_CLASS[variant];
  return (
    <div className={style.item}>
      <p className={style.title}>
        <MathText text={fact.title} />
      </p>
      {fact.statement.map((line, i) => (
        <p key={i} className={i === 0 ? style.firstLine : style.line}>
          <MathText text={line} />
        </p>
      ))}
      <FactDetails fact={fact} />
    </div>
  );
}

function SectionBody({ section, variant }: { section: FactSection; variant: Variant }) {
  return (
    <>
      {section.note && (
        <p className={variant === 'wide' ? 'text-xs text-slate-400 mb-3' : 'text-xs text-slate-400 mb-2'}>
          <MathText text={section.note} />
        </p>
      )}
      {section.facts.length > 0 && (
        <div className={LIST_CLASS[variant]}>
          {section.facts.map(fact => (
            <FactItem key={fact.id} fact={fact} variant={variant} />
          ))}
        </div>
      )}
      {section.subsections?.map((sub, i) => (
        <React.Fragment key={i}>
          <h4 className="text-sm font-bold text-cyan-200 mt-4 mb-2">{sub.title}</h4>
          <SectionBody section={sub} variant={sub.layout ?? 'cards'} />
        </React.Fragment>
      ))}
    </>
  );
}

/** Renders one formula sheet from the fact registry (data/facts.ts). */
export function FactSheetView({ sheet, onComplete }: FactSheetViewProps) {
  const gridSections = sheet.sections.filter(s => (s.placement ?? 'grid') === 'grid');
  const panelSections = sheet.sections.filter(s => (s.placement ?? 'grid') !== 'grid');

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">{sheet.title}</h2>
          <p className="text-slate-400 text-sm mt-1">{sheet.subtitle}</p>
        </div>
        <button
          onClick={onComplete}
          className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 ml-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {gridSections.map((section, i) => (
          <div key={i} className="bg-slate-900/50 rounded-lg p-5">
            <h3 className="text-xl font-bold text-amber-300 mb-4">{section.title}</h3>
            <SectionBody section={section} variant={section.layout ?? 'cards'} />
          </div>
        ))}
      </div>

      {panelSections.map((section, i) =>
        section.placement === 'highlight' ? (
          <div
            key={i}
            className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5"
          >
            <h3 className="text-xl font-bold text-cyan-300 mb-4">{section.title}</h3>
            <SectionBody section={section} variant="highlight" />
          </div>
        ) : (
          <div key={i} className="mt-6 bg-slate-900/50 rounded-lg p-5">
            <h3 className="text-xl font-bold text-amber-300 mb-4">{section.title}</h3>
            <SectionBody section={section} variant="wide" />
          </div>
        ),
      )}
    </div>
  );
}

export default FactSheetView;
