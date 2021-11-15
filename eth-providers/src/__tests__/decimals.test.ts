import { BigNumber } from '@ethersproject/bignumber';
import { convertNativeToken } from '../utils';
import { expect } from 'chai';
import { hexValue } from '@ethersproject/bytes';

describe('decimals', () => {
  it('convertNativeToken', async () => {
    const value = BigNumber.from('300000000');
    const covertedToken = convertNativeToken(value, 12);
    expect(covertedToken.toString()).to.equal('300000000000000');
  });

  it('hexValue', async () => {
    expect(hexValue(1)).to.equal('0x1');
    expect(hexValue(BigInt(1))).to.equal('0x1');
    expect(hexValue(BigNumber.from(1))).to.equal('0x1');
  });
});
