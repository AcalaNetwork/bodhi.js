import type { ApiPromise } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import { handleTxResponse } from './handleTxResponse';

export const sendTx = (api: ApiPromise, extrinsic: SubmittableExtrinsic<'promise'>) => {
  return new Promise<void>((resolve, reject) => {
    extrinsic
      .send((result) => {
        handleTxResponse(result, api)
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
};
