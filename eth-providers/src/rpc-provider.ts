import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BaseProvider } from './base-provider';
import { createApi } from './chain-api';
import { throwNotImplemented } from './utils';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[]) {
    super();
    const api = createApi(endpoint);
    this.setApi(api);
  }

  sendTransaction = (signedTransaction: string | Promise<string>): Promise<TransactionResponse> =>
    throwNotImplemented('sendTransaction');

  static from(endpoint: string | string[]) {
    return new EvmRpcProvider(endpoint);
  }
}
