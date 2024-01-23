import { ApiPromise, WsProvider } from '@polkadot/api';

import { BaseProvider, BaseProviderOptions } from './base-provider';
import { options } from '@acala-network/api';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const api = new ApiPromise(options({
      provider: new WsProvider(endpoint),
    }));

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
