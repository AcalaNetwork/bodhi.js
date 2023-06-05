import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

export const sleep = async (time = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));

const {
  ENDPOINT_URL,
  SUBQL_URL,
  PORT,
  MAX_CACHE_SIZE,
  MAX_BATCH_SIZE,
  STORAGE_CACHE_SIZE,
  SAFE_MODE,
  LOCAL_MODE,
  HTTP_ONLY,
  VERBOSE,
} = process.env;

export const parseBooleanOption = (option: string, defaultValue: boolean, value?: string): boolean => {
  if (value === undefined) return defaultValue;

  if (!['0', '1', 'true', 'false'].includes(value)) {
    throw new Error(`boolean env ${option} should be any of { true, false, 1, 0 }, got ${value}`);
  }

  return ['1', 'true'].includes(value);
};

export const yargsOptions = yargs(hideBin(process.argv))
  .options({
    endpoint: {
      alias: 'e',
      demandOption: false,
      default: ENDPOINT_URL ?? 'ws://localhost:9944',
      describe: 'Node websocket endpoint(s): can provide one or more endpoints, seperated by comma',
      type: 'string',
    },
    subqlUrl: {
      alias: 'subql',
      demandOption: false,
      default: SUBQL_URL,
      describe:
        'Subquery url: *optional* if testing contracts locally that doesn\'t query logs or historical Tx, otherwise *required*',
      type: 'string',
    },
    port: {
      alias: 'p',
      demandOption: false,
      default: Number(PORT ?? 8545),
      describe: 'port to listen for http and ws requests',
      type: 'number',
    },
    maxBlockCacheSize: {
      demandOption: false,
      default: Number(MAX_CACHE_SIZE ?? 200),
      describe: 'max number of blocks that lives in the cache. https://evmdocs.acala.network/network/network',
      type: 'number',
    },
    maxBatchSize: {
      demandOption: false,
      default: Number(MAX_BATCH_SIZE ?? 50),
      describe: 'max batch size for RPC request',
      type: 'number',
    },
    storageCacheSize: {
      demandOption: false,
      default: Number(STORAGE_CACHE_SIZE ?? 5000),
      describe: 'max storage cache size',
      type: 'number',
    },
    safeMode: {
      alias: 's',
      demandOption: false,
      default: parseBooleanOption('SAFE_MODE', false, SAFE_MODE),
      describe: 'if enabled, Tx and logs can only be found after they are finalized',
      type: 'boolean',
    },
    localMode: {
      alias: 'l',
      demandOption: false,
      default: parseBooleanOption('LOCAL_MODE', false, LOCAL_MODE),
      describe: 'enable this mode when testing with locally running instant-sealing mandala',
      type: 'boolean',
    },
    httpOnly: {
      demandOption: false,
      default: parseBooleanOption('HTTP_ONLY', false, HTTP_ONLY),
      describe: 'only allow http requests, disable ws connections',
      type: 'boolean',
    },
    verbose: {
      alias: 'v',
      demandOption: false,
      default: parseBooleanOption('VERBOSE', true, VERBOSE),
      describe: 'print some extra info',
      type: 'boolean',
    },
  })
  .help().argv;
