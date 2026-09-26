import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface PreCalculusFormulaSheetProps {
  onComplete: () => void;
}

/** Renders the PreCalculus formula sheet from the fact registry (data/facts.ts). */
export default function PreCalculusFormulaSheet({ onComplete }: PreCalculusFormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.preCalculus} onComplete={onComplete} />;
}
