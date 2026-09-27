import { defineConfig } from 'vitest/config';

// `npm run test:sweep`: every generator × 2,000 seeds, and the independent
// recomputation suite on the same number of seeds per family, and the
// guessability gate (services/learning/guessing.gate.ts).
export default defineConfig({
  test: {
    include: ['services/generators/sweep.test.ts', 'services/mathCorrectness.test.ts', 'services/learning/guessing.gate.ts'],
    environment: 'node',
    env: { SWEEP_SEEDS: '2000' },
    testTimeout: 600_000,
    watch: false,
  },
});
