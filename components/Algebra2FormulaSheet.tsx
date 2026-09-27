import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface Algebra2FormulaSheetProps {
  onComplete: () => void;
}

/** Renders the Algebra2 formula sheet from the fact registry (data/facts.ts). */
export default function Algebra2FormulaSheet({ onComplete }: Algebra2FormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.algebra2} onComplete={onComplete} />;
}
