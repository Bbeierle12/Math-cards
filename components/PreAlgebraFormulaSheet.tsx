import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface PreAlgebraFormulaSheetProps {
  onComplete: () => void;
}

/** Renders the PreAlgebra formula sheet from the fact registry (data/facts.ts). */
export default function PreAlgebraFormulaSheet({ onComplete }: PreAlgebraFormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.preAlgebra} onComplete={onComplete} />;
}
