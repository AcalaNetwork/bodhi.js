import { options } from '@acala-network/api';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { BaseProvider, BaseProviderOptions } from './base-provider';

export class EvmRpcProvider extends BaseProvider {

  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const provider = new WsProvider(endpoint);
    const api = new ApiPromise(options({ provider }));

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
