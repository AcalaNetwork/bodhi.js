import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BaseProvider, BlockTag } from './base-provider';
import { createApi } from './chain-api';
import { throwNotImplemented } from './utils';

export interface BaseProviderOptions {
  safeMode?: boolean;
  maxCacheSize?: number;
  subqlUrl?: string;
}

const defaultOpts: BaseProviderOptions = {
  safeMode: false,
  maxCacheSize: 200,
  subqlUrl: undefined,
};

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opt: BaseProviderOptions = defaultOpts) {
    super({
      safeMode: opt.safeMode,
      subqlUrl: opt.subqlUrl,
    });
    const api = createApi(endpoint);
    this.setApi(api);
    this.startSubscription(opt.maxCacheSize) as unknown as void;
  }

  static from(endpoint: string | string[], opt: BaseProviderOptions = defaultOpts): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
