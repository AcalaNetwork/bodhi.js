import { BigNumber } from '@ethersproject/bignumber';
import { convertNativeToken } from '../utils';

describe('decimals', () => {
  it('convertNativeToken', async () => {
    const value = BigNumber.from('300000000');
    const covertedToken = convertNativeToken(value, 12);
    expect(covertedToken.toString()).toBe('300000000000000');
  });
});
