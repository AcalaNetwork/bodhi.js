import minimist from 'minimist';
import dotenv from 'dotenv';
import { assignTracerSpan, buildTracerSpan } from './datadog-util';

export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));
export const DataDogUtil = {
  buildTracerSpan,
  assignTracerSpan
};

export interface ServerArgs {
  e?: string;
  h?: number;
  w?: number;
  s?: boolean;
  l?: boolean;
  v?: boolean;
  endpoint: string;
  subql?: string;
  'http-port': number;
  'ws-port': number;
  'cache-size': number;
  'max-batch-size': number;
  'max-storage-size': number;
  safe: number | boolean;
  local: number | boolean;
  forward: number | boolean;
  verbose: number | boolean;
}

export interface ServerOpts {
  endpoints: string;
  subqlUrl?: string;
  httpPort: number;
  wsPort: number;
  maxBlockCacheSize: number;
  maxBatchSize: number;
  storageCacheSize: number;
  safeMode: boolean;
  localMode: boolean;
  forwardMode: boolean;
  richMode: boolean;
  verbose: boolean;
}

const DEFAULT_SERVER_ARGS: ServerArgs = {
  e: undefined,
  h: undefined,
  w: undefined,
  s: undefined,
  l: undefined,
  v: undefined,
  endpoint: 'ws://0.0.0.0::9944',
  subql: undefined,
  'http-port': 8545,
  'ws-port': 3331,
  'cache-size': 200,
  'max-batch-size': 50,
  'max-storage-size': 5000,
  forward: 0,
  safe: 0,
  local: 0,
  verbose: 1
};

export const parseOptions = (): ServerOpts => {
  const argv = minimist<ServerArgs>(process.argv.slice(2), { default: DEFAULT_SERVER_ARGS });
  const { e, h, w, s, l, f, r, v, endpoint, subql, safe, local, forward, rich, verbose } = argv;

  dotenv.config();
  const {
    ENDPOINT_URL,
    SUBQL_URL,
    HTTP_PORT,
    WS_PORT,
    MAX_CACHE_SIZE,
    MAX_BATCH_SIZE,
    STORAGE_CACHE_SIZE,
    SAFE_MODE,
    LOCAL_MODE,
    FORWARD_MODE,
    RICH_MODE,
    VERBOSE
  } = process.env;

  return {
    endpoints: ENDPOINT_URL || e || endpoint,
    subqlUrl: SUBQL_URL || subql,
    httpPort: Number(HTTP_PORT || h || argv['http-port']),
    wsPort: Number(WS_PORT || w || argv['ws-port']),
    maxBlockCacheSize: Number(MAX_CACHE_SIZE || argv['cache-size']),
    maxBatchSize: Number(MAX_BATCH_SIZE || argv['max-batch-size']),
    storageCacheSize: Number(STORAGE_CACHE_SIZE || argv['max-storage-size']),
    safeMode: !!Number(SAFE_MODE || s || safe),
    localMode: !!Number(LOCAL_MODE || local || l),
    forwardMode: !!Number(FORWARD_MODE || f || forward),
    richMode: !!Number(RICH_MODE || r || rich),
    verbose: !!Number(VERBOSE || verbose || v)
  };
};
