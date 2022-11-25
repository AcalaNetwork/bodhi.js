import { BaseProvider, BaseProviderOptions } from './base-provider';
import { createApi } from './chain-api';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const api = createApi(endpoint);
    this.setApi(api);
    this.startSubscription() as unknown as void;
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
