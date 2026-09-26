import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface Algebra1FormulaSheetProps {
  onComplete: () => void;
}

/** Renders the Algebra1 formula sheet from the fact registry (data/facts.ts). */
export default function Algebra1FormulaSheet({ onComplete }: Algebra1FormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.algebra1} onComplete={onComplete} />;
}
