/* eslint-disable prefer-promise-reject-errors */
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { bufferToU8a, hexToBn, isBuffer, isHex, isU8a, u8aToBn, u8aToHex } from '@polkadot/util';
import BN from 'bn.js';

export const U32MAX = BigNumber.from('0xffffffff');
export const U64MAX = BigNumber.from('0xffffffffffffffff');

export function toBN(bigNumberis: BigNumberish = 0): BN {
  if (isU8a(bigNumberis)) {
    return u8aToBn(bigNumberis);
  }
  if (isHex(bigNumberis)) {
    return hexToBn(bigNumberis);
  }

  if (BigNumber.isBigNumber(bigNumberis)) {
    const hex = bigNumberis.toHexString();
    if (hex[0] === '-') {
      return new BN('-' + hex.substring(3), 16);
    }
    return new BN(hex.substring(2), 16);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BN(bigNumberis as any);
}

export function dataToString(bytes: BytesLike): string {
  if (isBuffer(bytes)) {
    return u8aToHex(bufferToU8a(bytes));
  }
  if (isU8a(bytes)) {
    return u8aToHex(bytes);
  }
  if (Array.isArray(bytes)) {
    return u8aToHex(Buffer.from(bytes));
  }

  return bytes as string;
}
