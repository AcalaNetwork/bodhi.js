import { BigNumber } from 'ethers';

export const BLOCK_GAS_LIMIT = 29_990_016;
export const BLOCK_STORAGE_LIMIT = 3_670_016;
export const MAX_GAS_LIMIT_CC = 21;  // log2(BLOCK_STORAGE_LIMIT)

export const ONE_GWEI = 1_000_000_000n;
export const TEN_GWEI = ONE_GWEI * 10n;
export const ONE_HUNDRED_GWEI = ONE_GWEI * 100n;
export const ONE_THOUSAND_GWEI = ONE_GWEI * 1000n;

export const GAS_MASK = 100000;
export const STORAGE_MASK = 100;
export const GAS_LIMIT_CHUNK = BigNumber.from(30000);
