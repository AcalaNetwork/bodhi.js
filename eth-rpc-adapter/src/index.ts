import 'dd-trace/init';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Eip1193Bridge } from './eip1193-bridge';
import { Router } from './router';
import { version } from './_version';
import { yargsOptions as opts } from './utils';
import EthRpcServer from './server';

export async function start(): Promise<void> {
  console.log('starting server ...');

  const provider = EvmRpcProvider.from(opts.endpoint.split(','), {
    safeMode: opts.safeMode,
    localMode: opts.localMode,
    richMode: opts.richMode,
    verbose: opts.verbose,
    subqlUrl: opts.subqlUrl,
    maxBlockCacheSize: opts.maxBlockCacheSize,
    storageCacheSize: opts.storageCacheSize
  });

  const bridge = new Eip1193Bridge(provider);

  const router = new Router(bridge);

  const server = new EthRpcServer({
    port: opts.port,
    batchSize: opts.maxBatchSize,
    httpOnly: opts.httpOnly
  });

  server.addRouter(router as any);
  server.start();

  await provider.isReady();
  if (provider.subql) {
    await provider.subql?.checkGraphql();
  }

  console.log(`
  --------------------------------------------
               🚀 SERVER STARTED 🚀
  --------------------------------------------
  version         : ${version}
  endpoint url    : ${opts.endpoint}
  subquery url    : ${opts.subqlUrl}
  listening to    : ${opts.port}
  max blockCache  : ${opts.maxBlockCacheSize}
  max batchSize   : ${opts.maxBatchSize}  
  max storageSize : ${opts.storageCacheSize}
  safe mode       : ${opts.safeMode}
  local mode      : ${opts.localMode}
  rich mode       : ${opts.richMode}
  http only       : ${opts.httpOnly}
  verbose         : ${opts.verbose}
  --------------------------------------------
  `);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
