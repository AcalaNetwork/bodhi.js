import { BigNumber } from '@ethersproject/bignumber';
import { toBN } from '../utils';

describe('utils', () => {
  it('works with positive numbers', () => {
    expect(toBN('1').toString()).toEqual('1');
    expect(toBN('0xff').toString()).toEqual('255');
    expect(toBN(123).toString()).toEqual('123');
    expect(toBN(BigNumber.from(123)).toString()).toEqual('123');
  });

  it('works with negative numbers', () => {
    expect(toBN('-1').toString()).toEqual('-1');
    expect(toBN(-123).toString()).toEqual('-123');
    expect(toBN(BigNumber.from(-123)).toString()).toEqual('-123');
  });
});
