import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BaseProvider, BlockTag } from './base-provider';
import { createApi } from './chain-api';
import { throwNotImplemented } from './utils';

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[]) {
    super();
    const api = createApi(endpoint);
    this.setApi(api);
    this.startCache() as unknown as void;
  }

  getTransactionCount = (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    return this.getSubstrateNonce(addressOrName, blockTag);
  };

  static from(endpoint: string | string[]): EvmRpcProvider {
    return new EvmRpcProvider(endpoint);
  }
}
