import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateProject,
} from '@subql/types';

interface ProjectParams {
  chainId: string;
  endpoint: string[];
  startBlock: number;
}

export const getProjectConfig = ({ chainId, endpoint, startBlock }: ProjectParams): SubstrateProject => ({
  specVersion: '1.0.0',
  version: '0.0.1',
  name: '@acala-network/evm-subql',
  description:
    'subquery for Acala EVM+',
  runner: {
    node: {
      name: '@subql/node',
      version: '>=3.0.1',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  schema: {
    file: './schema.graphql',
  },
  network: {
    chainId,
    endpoint,
    chaintypes: {
      file: './dist/chain-types/index.js',
    },
  },
  dataSources: [
    {
      kind: SubstrateDatasourceKind.Runtime,
      startBlock,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            kind: SubstrateHandlerKind.Block,
            handler: 'handleBlock',
          },
        ],
      },
    },
  ],
});

const ACALA_BASE = {
  chainId: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
  endpoint: ['wss://acala-rpc.aca-api.network'],
};

const KARURA_BASE = {
  chainId: '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
  endpoint: ['wss://karura-rpc.aca-api.network'],
};

export const PROJECT_PARAMS = {
  acala: {
    ...ACALA_BASE,
    startBlock: 1,
  },
  acala840000: {
    ...ACALA_BASE,
    startBlock: 840000,
  },
  karura: {
    ...KARURA_BASE,
    startBlock: 1,
  },
  karura1780000: {
    ...KARURA_BASE,
    startBlock: 1780000,
  },
  tc9: {
    chainId: '0x3035b88c212be330a1a724c675d56d53a5016ec32af1790738832db0227ac54c',
    endpoint: ['wss://mandala-tc9-rpc.aca-staging.network'],
    startBlock: 1,
  },
  acalaTestnet: {
    chainId: '0xd878fca7d80ffa1630527d63a835c0f1862f10c80657bf2be8e5dfcf9d1b0a7d',
    endpoint: ['wss://acala-dev.aca-dev.network/rpc/ws'],
    startBlock: 1,
  },
  karuraTestnet: {
    chainId: '0xd5f7c90bd50e61d833e3f0836b0f3e1503054200ef5aa32856f8da5ce1213b01',
    endpoint: ['wss://karura-dev.aca-dev.network/rpc/ws'],
    startBlock: 1,
  },
  localMandala: {
    chainId: '0x8837eb25f126806eca5012c67621cca1c04fadb6c93b3488e63fe94f872e2387',
    endpoint: ['ws://localhost:9944'],
    startBlock: 1,
  },
};

