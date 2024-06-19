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
    chainId: '0x5820dd20052b531310e9d7c0c7c3f3fd70188fe436ab9faca028f393bee8ecc0',
    endpoint: ['wss://acala-testnet.aca-staging.network/rpc/ws'],
    startBlock: 1,
  },
  karuraTestnet: {
    chainId: '0xd5f7c90bd50e61d833e3f0836b0f3e1503054200ef5aa32856f8da5ce1213b01',
    endpoint: ['wss://karura-dev.aca-dev.network/rpc/ws'],
    startBlock: 1,
  },
  localMandala: {
    chainId: '0xfed39d074b506cd8979ba50d64489dd11226eef1275917de229642edd4cec132',
    endpoint: ['ws://localhost:9944'],
    startBlock: 1,
  },
};

