import { Store } from '@subql/types';

declare global {
    const store: Store;
}

//Exports all handler functions
export * from './mappings/mappingHandlers';
