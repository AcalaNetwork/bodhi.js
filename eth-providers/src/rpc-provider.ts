import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BaseProvider, BlockTag } from './base-provider';
import { createApi } from './chain-api';
import { throwNotImplemented } from './utils';

export interface BaseProviderOptions {
  safemode?: boolean;
  maxCacheSize?: number;
}

const defaultOpts: BaseProviderOptions = {
  safemode: false,
  maxCacheSize: 200
};

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opt: BaseProviderOptions = defaultOpts) {
    super(opt.safemode);
    const api = createApi(endpoint);
    this.setApi(api);
    this.startSubscription(opt.maxCacheSize) as unknown as void;
  }

  static from(endpoint: string | string[], opt: BaseProviderOptions = defaultOpts): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
