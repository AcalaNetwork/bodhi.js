import { BigNumber } from '@ethersproject/bignumber';
import { describe, expect, it } from 'vitest';
import { hexValue } from '@ethersproject/bytes';

import { nativeToEthDecimal } from '../utils';

describe('decimals', () => {
  it('nativeToEthDecimal', async () => {
    expect(nativeToEthDecimal(BigNumber.from('300000000')).toString()).to.equal('300000000000000');
    expect(nativeToEthDecimal(123).toString()).to.equal('123000000');
    expect(nativeToEthDecimal('111').toString()).to.equal('111000000');
    expect(nativeToEthDecimal('0xf').toString()).to.equal('15000000');
  });

  it('hexValue', async () => {
    expect(hexValue(1)).to.equal('0x1');
    expect(hexValue(BigInt(1))).to.equal('0x1');
    expect(hexValue(BigNumber.from(1))).to.equal('0x1');
  });
});
