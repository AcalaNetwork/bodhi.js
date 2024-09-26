import { defineConfig, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.shared';

export default mergeConfig(
  configShared,
  defineConfig({
    test: {
      include: ['**/*.test.ts'],
      exclude: ['**/safemode.test.ts'],
      coverage: {
        provider: 'istanbul',
      },
    },
  })
);
