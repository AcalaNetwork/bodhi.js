import { BigNumber } from '@ethersproject/bignumber';

export const ZERO = 0;
export const EMPTY_HEX_STRING = '0x';

export const BIGNUMBER_ZERO = BigNumber.from(ZERO);
export const U32_MAX = 4_294_967_295n;

export const U32MAX = BigNumber.from('0xffffffff');
export const U64MAX = BigNumber.from('0xffffffffffffffff');

export const ERROR_PATTERN = [
  // Assume that Error is nested only once
  /execution fatal: Module\(ModuleError { index: (\d+), error: \[(\d+), 0, 0, 0\], message: None }\)/,
  /execution fatal: Module\(ModuleError { index: (\d+), error: (\d+), message: None }\)/,
];
