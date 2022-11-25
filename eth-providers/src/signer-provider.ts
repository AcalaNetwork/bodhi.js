import { ApiPromise } from '@polkadot/api';
import type { ApiOptions } from '@polkadot/api/types';
import { BaseProvider } from './base-provider';
import { createApiOptions } from './chain-api';

export class SignerProvider extends BaseProvider {
  constructor(apiOptions: ApiOptions) {
    super();
    const api = new ApiPromise(createApiOptions(apiOptions));
    this.setApi(api);
  }

  static from(apiOptions: ApiOptions): SignerProvider {
    return new SignerProvider(apiOptions);
  }
}
