import { encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a, stringToU8a, u8aConcat } from '@polkadot/util';

export const evmAddressToSubstrateAddress = (address: string): string => {
  return encodeAddress(u8aConcat(stringToU8a('evm:'), hexToU8a(address), new Uint8Array(8).fill(0)));
};
