import { mergeConfig } from 'vitest/config';
import configShared from '../../vitest.shared';

export default mergeConfig(
  configShared,
  {
    test: {
      include: ['**/*.test.ts'],
      exclude: ['**/safemode.test.ts'],
      coverage: {
        provider: 'istanbul',
      },
    },
  }
);
