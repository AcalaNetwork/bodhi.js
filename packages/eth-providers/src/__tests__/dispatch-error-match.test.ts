import { ERROR_PATTERN } from '../consts';
import { describe, it } from 'vitest';
import { expect } from 'chai';

describe('filterLog', () => {
  const err0 =
    'Error: -32603: execution fatal: Module(ModuleError { index: 180, error: [11, 0, 0, 0], message: None })';
  const err1 = 'Error: -32603: execution fatal: Module(ModuleError { index: 180, error: 11, message: None })';

  it('match the error1', () => {
    const match = err0.match(ERROR_PATTERN[0]);
    if (match) {
      expect(match[1]).to.equal('180');
      expect(match[2]).to.equal('11');
    }
  });
  it('match the error2', () => {
    const match = err1.match(ERROR_PATTERN[1]);
    if (match) {
      expect(match[1]).to.equal('180');
      expect(match[2]).to.equal('11');
    }
  });
});
