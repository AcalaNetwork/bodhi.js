import type { ApiPromise } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import { SubmittableResult } from '@polkadot/api';
import { handleTxResponse } from './handleTxResponse';

export const sendTx = (api: ApiPromise, extrinsic: SubmittableExtrinsic<'promise'>): Promise<SubmittableResult> => {
  return new Promise((resolve, reject) => {
    extrinsic
      .send((result) => {
        handleTxResponse(result, api)
          .then(({ result }) => {
            resolve(result);
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
