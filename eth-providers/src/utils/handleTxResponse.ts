/* eslint-disable prefer-promise-reject-errors */
import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { hexToString } from '@polkadot/util';

// https://ethereum.stackexchange.com/questions/84545/how-to-get-reason-revert-using-web3-eth-call
export function decodeMessage(reason: any, code?: string): string {
  const reasonString = JSON.stringify(reason).toLowerCase();

  if (code) {
    let codeString = `0x${code.substring(138)}`.replace(/0+$/, '');

    // If the codeString is an odd number of characters, add a trailing 0
    if (codeString.length % 2 === 1) {
      codeString += '0';
    }

    return `${reasonString} ${hexToString(codeString)}`;
  } else {
    return reasonString;
  }
}

function makeError<T>(message: string, props: T): Error {
  const err = new Error(message);
  Object.assign(err, props);
  return err;
}

export function handleTxResponse(
  result: SubmittableResult,
  api: ApiPromise
): Promise<{
  result: SubmittableResult;
  message?: string;
}> {
  return new Promise((resolve, reject) => {
    if (result.status.isFinalized || result.status.isInBlock) {
      const createdFailed = result.findRecord('evm', 'CreatedFailed');
      const executedFailed = result.findRecord('evm', 'ExecutedFailed');

      result.events
        .filter(({ event: { section } }): boolean => section === 'system')
        .forEach((event): void => {
          const {
            event: { data, method }
          } = event;

          if (method === 'ExtrinsicFailed') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [dispatchError] = data as any[];

            let message = dispatchError.type;

            if (dispatchError.isModule) {
              try {
                const mod = dispatchError.asModule;
                const error = api.registry.findMetaError(new Uint8Array([mod.index.toNumber(), mod.error.toNumber()]));
                message = `${error.section}.${error.name}: ${error.docs}`;
              } catch (error) {
                // swallow
              }
            }

            reject(makeError(message, { result }));
          } else if (method === 'ExtrinsicSuccess') {
            if (createdFailed || executedFailed) {
              const [exitReason, output] = createdFailed
                ? [createdFailed.event.data[2].toJSON(), '']
                : [executedFailed!.event.data[2].toJSON(), executedFailed!.event.data[3].toJSON() || ''];

              reject(
                makeError(decodeMessage(exitReason, output as string), {
                  result
                })
              );
            }
            resolve({ result });
          }
        });
    } else if (result.isError) {
      reject({ result });
    }
  });
}
