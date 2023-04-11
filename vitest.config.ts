import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    testTimeout: 300000,
    hookTimeout: 60000,
    dangerouslyIgnoreUnhandledErrors: true,
    threads: false,
    coverage: {
      provider: 'c8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    },
    include: ['packages/**/*.test.ts'],
    exclude: ['**/e2e/*'],
  },
  plugins: [swc.vite(), tsconfigPaths()],
});
