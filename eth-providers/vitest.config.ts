import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 300000,
    hookTimeout: 60000,
    dangerouslyIgnoreUnhandledErrors: true,
    threads: false
  }
});
