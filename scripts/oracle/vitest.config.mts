import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

// Isolated config for the development-only CAS oracle exporter.
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/oracle/*.eval.ts'],
    environment: 'node',
    watch: false,
  },
});
