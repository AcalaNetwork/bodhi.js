import { ApiPromise } from '@polkadot/api';
import { Codec } from '@polkadot/types/types';
import { decorateStorage, unwrapStorageType } from '@polkadot/types';
import { isNull, u8aToU8a } from '@polkadot/util';

export const queryStorage = async <T extends Codec = Codec>(
  api: ApiPromise,
  module: `${string}.${string}`,
  args: any[],
  blockHash: string,
): Promise<T> => {
  const apiAt = await api.at(blockHash);
  const [section, method] = module.split('.');
  const res = await apiAt.query[section][method](...args);
  return res as T;
};

// export const queryStorage = async <T extends Codec = Codec>(
//   api: ApiPromise,
//   module: `${string}.${string}`,
//   args: any[],
//   blockHash: string,
// ): Promise<T> => {
//   const registry = await api.getBlockRegistry(u8aToU8a(blockHash));

//   const storage = decorateStorage(
//     registry.registry,
//     registry.metadata.asLatest,
//     registry.metadata.version,
//   );

//   const [section, method] = module.split('.');

//   const entry = storage[section][method];
//   const key = entry(...args);

//   const outputType = unwrapStorageType(
//     registry.registry,
//     entry.meta.type,
//     entry.meta.modifier.isOptional,
//   );


//   const value: any = await api.rpc.state.getStorage(key, blockHash);

//   // we convert to Uint8Array since it maps to the raw encoding, all
//   // data will be correctly encoded (incl. numbers, excl. :code)
//   const input = value === null
//     ? null
//     : u8aToU8a(
//       entry.meta.modifier.isOptional
//         ? value.toU8a()
//         : value.isSome
//           ? value.unwrap().toU8a()
//           : null,
//     );


//   const result = registry.registry.createTypeUnsafe<T>(outputType, [input], {
//     blockHash,
//     isPedantic: !entry.meta.modifier.isOptional,
//   });

//   return result;
// };
