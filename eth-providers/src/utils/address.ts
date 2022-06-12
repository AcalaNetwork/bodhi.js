import { getAddress } from '@ethersproject/address';
import { hexToU8a, u8aConcat, u8aEq, u8aFixLength, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import type { HexString } from '@polkadot/util/types';
import { logger } from './logger';

export const isSubstrateAddress = (address: HexString | string | Uint8Array): boolean => {
  try {
    decodeAddress(address);
    return true;
  } catch {
    return false;
  }
};

export const isEvmAddress = (address: string): boolean => {
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
};

export const computeDefaultEvmAddress = (substrateAddress: HexString | string | Uint8Array): string => {
  if (!isSubstrateAddress) {
    return logger.throwArgumentError('invalid substrate address', 'address', substrateAddress);
  }

  const publicKey = decodeAddress(substrateAddress);

  const isStartWithEvm = u8aEq('evm:', publicKey.slice(0, 4));

  if (isStartWithEvm) {
    return getAddress(u8aToHex(publicKey.slice(4, 24)));
  }

  return getAddress(u8aToHex(blake2AsU8a(u8aConcat('evm:', publicKey), 256).slice(0, 20)));
};

export const computeDefaultSubstrateAddress = (evmAddress: string): string => {
  if (!isEvmAddress(evmAddress)) {
    return logger.throwArgumentError('invalid evm address', 'address', evmAddress);
  }

  const address = encodeAddress(u8aFixLength(u8aConcat('evm:', hexToU8a(evmAddress)), 256, true));

  return address.toString();
};
