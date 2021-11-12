import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { toBN } from '../utils';

describe('utils', () => {
  it('works with positive numbers', () => {
    expect(toBN('1').toString()).to.equal('1');
    expect(toBN('0xff').toString()).to.equal('255');
    expect(toBN(123).toString()).to.equal('123');
    expect(toBN(BigNumber.from(123)).toString()).to.equal('123');
  });

  it('works with negative numbers', () => {
    expect(toBN('-1').toString()).to.equal('-1');
    expect(toBN(-123).toString()).to.equal('-123');
    expect(toBN(BigNumber.from(-123)).toString()).to.equal('-123');
  });
});
