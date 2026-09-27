import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface Calc2FormulaSheetProps {
  onComplete: () => void;
}

/** Renders the Calc2 formula sheet from the fact registry (data/facts.ts). */
export default function Calc2FormulaSheet({ onComplete }: Calc2FormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.calc2} onComplete={onComplete} />;
}
