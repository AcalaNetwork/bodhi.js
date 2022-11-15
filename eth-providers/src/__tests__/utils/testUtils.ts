import { createType, TypeRegistry } from '@polkadot/types';
import { Block } from '@polkadot/types/interfaces';

export const hydrateBlock = (data: any): Block => {
  const registry = new TypeRegistry();
  return createType(registry, 'Block', data);
};
