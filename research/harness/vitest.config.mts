import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

// Isolated config for the research harness so `npm test` (the app suite)
// and the fidelity eval never pick up each other's files.
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['research/harness/*.eval.ts'],
    environment: 'node',
    watch: false,
  },
});
