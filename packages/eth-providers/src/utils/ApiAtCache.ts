import { ApiDecoration } from '@polkadot/api/types';
import { ApiPromise } from '@polkadot/api';
import LRUCache from 'lru-cache';

class ApiAtCache {
  #cache: LRUCache<string, ApiDecoration<'promise'>>;

  constructor(maxCacheSize: number = 100) {
    this.#cache = new LRUCache<string, ApiDecoration<'promise'>>({
      max: maxCacheSize,
    });
  }

  getApiAt = async (
    api: ApiPromise,
    blockHash: string
  ): Promise<ApiDecoration<'promise'>> => {
    const cached = this.#cache.get(blockHash);
    if (cached) return cached;

    const apiAt = await api.at(blockHash);

    // do we need to check for finalization here?
    // ApiAt is only a decoration and the actuall result is from rpc call, so should be fine?
    this.#cache.set(blockHash, apiAt);

    return apiAt;
  };
}

export const apiCache = new ApiAtCache(100);
