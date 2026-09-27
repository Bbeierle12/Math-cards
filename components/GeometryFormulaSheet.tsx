import FactSheetView from './FactSheet';
import { FACT_SHEETS } from '../data/facts';

interface GeometryFormulaSheetProps {
  onComplete: () => void;
}

/** Renders the Geometry formula sheet from the fact registry (data/facts.ts). */
export default function GeometryFormulaSheet({ onComplete }: GeometryFormulaSheetProps) {
  return <FactSheetView sheet={FACT_SHEETS.geometry} onComplete={onComplete} />;
}
