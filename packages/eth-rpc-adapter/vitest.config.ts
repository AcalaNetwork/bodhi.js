import { mergeConfig } from 'vitest/config';
import configShared from '../../vitest.shared';

export default mergeConfig(
  configShared,
  {
    test: {
      // include: ['**/*.test.ts'],  // TODO: run all tests
      include: ['src/__tests__/errors.test.ts'],
    },
  }
);
