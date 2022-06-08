import { BigNumber } from '@ethersproject/bignumber';
import { nativeToEthDecimal } from '../utils';
import { expect } from 'chai';
import { hexValue } from '@ethersproject/bytes';

describe('decimals', () => {
  it('nativeToEthDecimal', async () => {
    expect(nativeToEthDecimal(BigNumber.from('300000000'), 12).toString()).to.equal('300000000000000');
    expect(nativeToEthDecimal(123, 12).toString()).to.equal('123000000');
    expect(nativeToEthDecimal('111', 12).toString()).to.equal('111000000');
    expect(nativeToEthDecimal('0xf', 12).toString()).to.equal('16000000');
  });

  it('hexValue', async () => {
    expect(hexValue(1)).to.equal('0x1');
    expect(hexValue(BigInt(1))).to.equal('0x1');
    expect(hexValue(BigNumber.from(1))).to.equal('0x1');
  });
});
