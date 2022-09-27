import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { assignTracerSpan, buildTracerSpan } from './datadog-util';

export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));
export const DataDogUtil = {
  buildTracerSpan,
  assignTracerSpan
};

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
  VERBOSE
} = process.env;

export const yargsOptions = yargs(hideBin(process.argv))
  .options({
    endpoint: {
      alias: 'e',
      demandOption: false,
      default: ENDPOINT_URL ?? 'ws://localhost:9944',
      describe: 'Node websocket endpoint(s), seperated by comma, such as xxx,yyy,zzz',
      type: 'string'
    },
    subqlUrl: {
      alias: 'subql',
      demandOption: false,
      default: SUBQL_URL,
      describe: '',
      type: 'string'
    },
    port: {
      alias: 'p',
      demandOption: false,
      default: Number(PORT ?? 8545),
      describe: '',
      type: 'number'
    },
    maxBlockCacheSize: {
      alias: 'mbcs',
      demandOption: false,
      default: Number(MAX_CACHE_SIZE ?? 200),
      describe: '',
      type: 'number'
    },
    maxBatchSize: {
      alias: 'mbs',
      demandOption: false,
      default: Number(MAX_BATCH_SIZE ?? 50),
      describe: '',
      type: 'number'
    },
    storageCacheSize: {
      alias: 'scs',
      demandOption: false,
      default: Number(STORAGE_CACHE_SIZE ?? 5000),
      describe: '',
      type: 'number'
    },
    safeMode: {
      alias: 's',
      demandOption: false,
      default: Boolean(SAFE_MODE ?? false),
      describe: '',
      type: 'boolean'
    },
    localMode: {
      alias: 'l',
      demandOption: false,
      default: Boolean(LOCAL_MODE ?? false),
      describe: '',
      type: 'boolean'
    },
    richMode: {
      alias: 'r',
      demandOption: false,
      default: Boolean(RICH_MODE ?? false),
      describe: '',
      type: 'boolean'
    },
    verbose: {
      alias: 'v',
      demandOption: false,
      default: Boolean(VERBOSE ?? true),
      describe: '',
      type: 'boolean'
    }
  })
  .help().argv;
