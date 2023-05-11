import { ApiPromise, WsProvider } from '@polkadot/api';
import { BaseProvider, BaseProviderOptions } from './base-provider';
import { options } from '@acala-network/api';
import { runtimePatch } from './utils/temp-runtime-patch';

export class EvmRpcProvider extends BaseProvider {

  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const provider = new WsProvider(endpoint);
    // const api = new ApiPromise(options({ provider }));
    const api = new ApiPromise({
      ...options({ provider }),
      runtime: {
        ...options({ provider }).runtime,
        ...(runtimePatch as any),
      },
    } );

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
