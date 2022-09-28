import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));

const {
  ENDPOINT_URL,
  SUBQL_URL,
  PORT,
  MAX_CACHE_SIZE,
  MAX_BATCH_SIZE,
  STORAGE_CACHE_SIZE,
  SAFE_MODE,
  LOCAL_MODE,
  RICH_MODE,
  HTTP_ONLY,
  VERBOSE
} = process.env;

export const yargsOptions = yargs(hideBin(process.argv))
  .options({
    endpoint: {
      alias: 'e',
      demandOption: false,
      default: ENDPOINT_URL ?? 'ws://localhost:9944',
      describe: 'Node websocket endpoint(s): can provide one or more endpoints, seperated by comma',
      type: 'string'
    },
    subqlUrl: {
      alias: 'subql',
      demandOption: false,
      default: SUBQL_URL,
      describe:
        "Subquery url: *optional* if testing contracts locally that doesn't query logs or historical Tx, otherwise *required*",
      type: 'string'
    },
    port: {
      alias: 'p',
      demandOption: false,
      default: Number(PORT ?? 8545),
      describe: 'port to listen for http and ws requests',
      type: 'number'
    },
    maxBlockCacheSize: {
      demandOption: false,
      default: Number(MAX_CACHE_SIZE ?? 200),
      describe: 'max number of blocks that lives in the cache. https://evmdocs.acala.network/network/network',
      type: 'number'
    },
    maxBatchSize: {
      demandOption: false,
      default: Number(MAX_BATCH_SIZE ?? 50),
      describe: 'max batch size for RPC request',
      type: 'number'
    },
    storageCacheSize: {
      demandOption: false,
      default: Number(STORAGE_CACHE_SIZE ?? 5000),
      describe: 'max storage cache size',
      type: 'number'
    },
    safeMode: {
      alias: 's',
      demandOption: false,
      default: Boolean(SAFE_MODE ?? false),
      describe: 'if enabled, Tx and logs can only be found after they are finalized',
      type: 'boolean'
    },
    localMode: {
      alias: 'l',
      demandOption: false,
      default: Boolean(LOCAL_MODE ?? false),
      describe: 'enable this mode when testing with locally running instant-sealing mandala',
      type: 'boolean'
    },
    richMode: {
      alias: 'r',
      demandOption: false,
      default: Boolean(RICH_MODE ?? false),
      describe:
        'if enabled, default gas params is big enough for most contract deployment and calls, so contract tests from traditional evm world can run unchanged. Note this mode is helpful for testing contracts, but is different than production envionment, please refer to https://evmdocs.acala.network/network/gas-parameters for more info',
      type: 'boolean'
    },
    httpOnly: {
      demandOption: false,
      default: Boolean(HTTP_ONLY ?? false),
      describe: 'only allow http requests, disable ws connections',
      type: 'boolean'
    },
    verbose: {
      alias: 'v',
      demandOption: false,
      default: Boolean(VERBOSE ?? true),
      describe: 'print some extra info',
      type: 'boolean'
    }
  })
  .help().argv;
