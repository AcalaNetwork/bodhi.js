import { ApiPromise, WsProvider } from '@polkadot/api';
import { withAcalaTypes } from '@acala-network/api';

import { BaseProvider, BaseProviderOptions } from './base-provider';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const api = new ApiPromise(withAcalaTypes({
      provider: new WsProvider(endpoint),
    }));

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
