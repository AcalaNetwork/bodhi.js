import './utils/tracer';

import { Eip1193Bridge } from './eip1193-bridge';
import { EvmRpcProviderWithTrace } from './wrapped-provider';
import { Router } from './router';
import { monitorRuntime } from './utils/monitor-runtime';
import { yargsOptions as opts } from './utils';
import { version } from './_version';
import EthRpcServer from './server';

export async function start(): Promise<void> {
  console.log('starting server ...');

  const provider = EvmRpcProviderWithTrace.from(opts.endpoint.split(','), {
    safeMode: opts.safeMode,
    localMode: opts.localMode,
    verbose: opts.verbose,
    subqlUrl: opts.subqlUrl,
    maxBlockCacheSize: opts.maxBlockCacheSize,
    storageCacheSize: opts.storageCacheSize,
    rpcCacheCapacity: opts.rpcCacheCapacity,
  });

  const bridge = new Eip1193Bridge(provider);

  const router = new Router(bridge);

  const server = new EthRpcServer({
    port: opts.port,
    batchSize: opts.maxBatchSize,
    httpOnly: opts.httpOnly,
  });

  server.addRouter(router);
  server.start();

  await provider.isReady();
  await monitorRuntime(provider);

  if (provider.subql) {
    const genesisHash = await provider.subql.checkGraphql();
    if (genesisHash !== provider.genesisHash) {
      throw new Error(
        `subql genesis hash doesn\'t match! You might have connected to a wrong subql ${JSON.stringify({
          subqlGenesisHash: genesisHash,
          providerGenesisHash: provider.genesisHash,
        })}`
      );
    }
  }

  console.log(`
  --------------------------------------------
               🚀 SERVER STARTED 🚀
  --------------------------------------------
  version         : ${version}
  endpoint url    : ${opts.endpoint}
  subquery url    : ${opts.subqlUrl}
  server host     : ${opts.host}
  server port     : ${opts.port}
  max blockCache  : ${opts.maxBlockCacheSize}
  max batchSize   : ${opts.maxBatchSize}
  max storageSize : ${opts.storageCacheSize}
  cache capacity  : ${opts.rpcCacheCapacity}
  safe mode       : ${opts.safeMode}
  local mode      : ${opts.localMode}
  http only       : ${opts.httpOnly}
  verbose         : ${opts.verbose}
  --------------------------------------------
  `);
}

start().catch(e => {
  console.error(e);
  process.exit(1);
});

process.on('SIGINT', function() {
  process.exit();
});
