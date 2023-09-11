import { mergeConfig } from 'vitest/config';
import configShared from '../../vitest.shared';

export default mergeConfig(
  configShared,
  {
    test: {
      environment: 'jsdom',
    },
  }
);
