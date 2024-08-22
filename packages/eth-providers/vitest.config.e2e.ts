import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    threads: false,
    testTimeout: 300_000,
    hookTimeout: 60_000,
    environment: 'jsdom',
    // exclude: ['src/__tests__/utils.test.ts'],
  },
  plugins: [swc.vite(), tsconfigPaths()],
});
