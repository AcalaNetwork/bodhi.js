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
  http: number;
  ws: number;
  cache: number;
  batch: number;
  storage: number;
  safe: number;
  local: number;
  verbose: number;
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
  verbose: boolean;
}

const DEFAULT_SERVER_OPTS: ServerArgs = {
  e: undefined,
  h: undefined,
  w: undefined,
  s: undefined,
  l: undefined,
  v: undefined,
  endpoint: 'ws://0.0.0.0::9944',
  subql: undefined,
  http: 8545,
  ws: 3331,
  cache: 200,
  batch: 50,
  storage: 5000,
  safe: 0,
  local: 0,
  verbose: 1
};

export const parseOptions = (): ServerOpts => {
  const argv = minimist<ServerArgs>(process.argv.slice(2), { default: DEFAULT_SERVER_OPTS });
  const { e, h, w, s, l, v, endpoint, subql, http, ws, cache, batch, storage, safe, local, verbose } = argv;

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
    VERBOSE
  } = process.env;

  return {
    endpoints: ENDPOINT_URL || e || endpoint,
    subqlUrl: SUBQL_URL || subql,
    httpPort: Number(HTTP_PORT || h || http),
    wsPort: Number(WS_PORT || w || ws),
    maxBlockCacheSize: Number(MAX_CACHE_SIZE || cache),
    maxBatchSize: Number(MAX_BATCH_SIZE || batch),
    storageCacheSize: Number(STORAGE_CACHE_SIZE || storage),
    safeMode: !!Number(SAFE_MODE || s || safe),
    localMode: !!Number(LOCAL_MODE || local || l),
    verbose: !!Number(VERBOSE || verbose || v)
  };
};
