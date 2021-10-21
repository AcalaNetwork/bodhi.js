import { BigNumber } from '@ethersproject/bignumber';

const ETH_DECIMALS = 18;

export const convertNativeToken = (value: BigNumber, decimals: number): BigNumber => {
  if (!value) return value;
  return value.mul(10 ** (ETH_DECIMALS - decimals));
};
