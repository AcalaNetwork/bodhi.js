import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'c8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    },
    exclude: ['**/e2e/*'],
  },
  plugins: [swc.vite(), tsconfigPaths()],
});
