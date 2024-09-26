import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 9999_000,
    hookTimeout: 300_000,
  },
  plugins: [tsconfigPaths()],
});
