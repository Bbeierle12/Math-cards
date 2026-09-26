import { defineConfig } from 'vitest/config';

// `npm run test:sweep`: every generator × 2,000 seeds, and the independent
// recomputation suite on the same number of seeds per family.
export default defineConfig({
  test: {
    include: ['services/generators/sweep.test.ts', 'services/mathCorrectness.test.ts'],
    environment: 'node',
    env: { SWEEP_SEEDS: '2000' },
    testTimeout: 600_000,
    watch: false,
  },
});
