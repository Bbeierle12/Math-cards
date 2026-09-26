import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface CalculusFormulaSheetProps {
  onComplete: () => void;
}

/** Renders the Calculus formula sheet from the fact registry (data/facts.ts). */
export default function CalculusFormulaSheet({ onComplete }: CalculusFormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.calculus} onComplete={onComplete} />;
}
