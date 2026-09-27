/**
 * Review scheduling (docs/PLAN.md 3.3): a stability ladder of review
 * intervals, 1 → 3 → 7 → 21 → 60 days. A passed review moves to the next rung
 * above both the current interval and the time actually elapsed (so a late
 * success lengthens the interval); a failed review halves it.
 */
export const DAY = 24 * 60 * 60 * 1000;

export const LADDER = [1, 3, 7, 21, 60] as const;

export const firstInterval = (): number => LADDER[0];

export const nextInterval = (stability: number, elapsedDays: number): number => {
  const reached = Math.max(stability, elapsedDays);
  const rung = LADDER.find(r => r > reached + 1e-9);
  return rung ?? Math.round(reached * 2.5);
};

export const lapseInterval = (stability: number): number => Math.max(LADDER[0], stability / 2);
