import { ApiPromise, WsProvider } from '@polkadot/api';
import { acalaTypesBundle } from '@acala-network/types';

import { BaseProvider, BaseProviderOptions } from './base-provider';

export type EvmRpcProviderOptions = BaseProviderOptions & {
  rpcCacheCapacity?: number;
};

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opts?: EvmRpcProviderOptions) {
    super(opts);

    const api = new ApiPromise({
      provider: new WsProvider(endpoint),
      typesBundle: acalaTypesBundle,
      rpcCacheCapacity: opts?.rpcCacheCapacity,
    });

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: EvmRpcProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
