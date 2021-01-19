import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { SubmittableResult } from '@polkadot/api';
import {
  bufferToU8a,
  hexToBn,
  hexToString,
  isBuffer,
  isHex,
  isU8a,
  u8aToBn,
  u8aToHex
} from '@polkadot/util';
import BN from 'bn.js';

export function decodeMessage(reason: any, code: string) {
  const reasonString = JSON.stringify(reason).toLowerCase();
  let codeString = `0x${code.substr(138)}`.replace(/0+$/, '');

  // If the codeString is an odd number of characters, add a trailing 0
  if (codeString.length % 2 === 1) {
    codeString += '0';
  }

  return `${reasonString} ${hexToString(codeString)}`;
}

export function handleTxResponse(
  result: SubmittableResult,
  api: any
): Promise<{
  result: SubmittableResult;
  message?: string;
}> {
  return new Promise((resolve, reject) => {
    if (result.status.isFinalized || result.status.isInBlock) {
      const createdFailed = result.findRecord('evm', 'CreatedFailed');
      const executedFailed = result.findRecord('evm', 'ExecutedFailed');

      result.events
        .filter(({ event: { section } }: any): boolean => section === 'system')
        .forEach((event: any): void => {
          const {
            event: { data, method }
          } = event;
          if (method === 'ExtrinsicFailed') {
            const [dispatchError] = data;
            let message = dispatchError.type;

            if (dispatchError.isModule) {
              try {
                const mod = dispatchError.asModule;
                const error = api.registry.findMetaError(
                  new Uint8Array([mod.index.toNumber(), mod.error.toNumber()])
                );
                message = `${error.section}.${error.name}`;
              } catch (error) {
                // swallow
              }
            }

            reject({ message, result });
          } else if (method === 'ExtrinsicSuccess') {
            const failed = createdFailed || executedFailed;
            if (failed) {
              reject({
                message: decodeMessage(
                  failed.event.data[1].toJSON(),
                  failed.event.data[2].toJSON() as string
                ),
                result
              });
            }
            resolve({ result });
          }
        });
    } else if (result.isError) {
      reject({ result });
    }
  });
}

export function toBN(bigNumberis: BigNumberish) {
  if (isU8a(bigNumberis)) {
    return u8aToBn(bigNumberis);
  }
  if (isHex(bigNumberis)) {
    return hexToBn(bigNumberis);
  }

  if (BigNumber.isBigNumber(bigNumberis)) {
    return hexToBn(bigNumberis.toHexString());
  }

  return new BN(bigNumberis as any);
}

export function dataToString(bytes: BytesLike) {
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
