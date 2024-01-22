import { ApiPromise, WsProvider } from '@polkadot/api';
import { acalaRuntime, acalaTypesBundle } from '@acala-network/types';

import { BaseProvider, BaseProviderOptions } from './base-provider';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const api = new ApiPromise({
      provider: new WsProvider(endpoint),
      runtime: acalaRuntime,
      typesBundle: acalaTypesBundle,
    });

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
