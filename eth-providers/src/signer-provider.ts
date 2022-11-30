import { ApiPromise } from '@polkadot/api';
import type { ApiOptions } from '@polkadot/api/types';
import { options } from '@acala-network/api';
import { BaseProvider } from './base-provider';
import { extraRuntimeTypes } from './utils';

export class SignerProvider extends BaseProvider {
  constructor(apiOptions: ApiOptions) {
    super();
    const api = new ApiPromise(
      options({
        ...apiOptions,
        types: extraRuntimeTypes
      })
    );
    this.setApi(api);
  }

  static from(apiOptions: ApiOptions): SignerProvider {
    return new SignerProvider(apiOptions);
  }
}
