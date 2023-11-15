import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    threads: false,
    testTimeout: 300_000,
    hookTimeout: 60_000,
    environment: 'node',
    exclude: ['src/__tests__/utils.test.ts'],
    bail: 999,
  },
  plugins: [swc.vite(), tsconfigPaths()],
});
