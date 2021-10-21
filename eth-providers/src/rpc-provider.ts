import { BaseProvider } from './base-provider';
import { createApi } from './chain-api';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[]) {
    super();
    const api = createApi(endpoint);
    this.setApi(api);
  }

  static from(endpoint: string | string[]) {
    return new EvmRpcProvider(endpoint);
  }
}
