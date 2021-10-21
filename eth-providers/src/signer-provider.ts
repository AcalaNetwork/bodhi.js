import { options } from '@acala-network/api';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { ApiPromise } from '@polkadot/api';
import type { ApiOptions } from '@polkadot/api/types';
import { BaseProvider } from './base-provider';
import { throwNotImplemented } from './utils';

export class SignerProvider extends BaseProvider {
  constructor(apiOptions: ApiOptions) {
    super();
    const api = new ApiPromise(options(apiOptions));
    this.setApi(api);
  }

  // This method will be implemented in the signer
  sendTransaction = (signedTransaction: string | Promise<string>): Promise<TransactionResponse> =>
    throwNotImplemented('sendTransaction');

  static from(apiOptions: ApiOptions) {
    return new SignerProvider(apiOptions);
  }
}
