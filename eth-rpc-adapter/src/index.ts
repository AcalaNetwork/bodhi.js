import 'dd-trace/init';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import HTTPServerTransport from './transports/http';
import WebSocketServerTransport from './transports/websocket';
import { Eip1193Bridge } from './eip1193-bridge';
import { RpcForward } from './rpc-forward';
import { Router } from './router';
import { version } from './_version';
import { parseOptions } from './utils';

import EthRpcServer from './server';

export async function start(): Promise<void> {
  console.log('starting server ...');

  const opts = parseOptions();
  const provider = EvmRpcProvider.from(opts.endpoints.split(','), {
    safeMode: opts.safeMode,
    localMode: opts.localMode,
    richMode: opts.richMode,
    verbose: opts.verbose,
    subqlUrl: opts.subqlUrl,
    maxBlockCacheSize: opts.maxBlockCacheSize,
    storageCacheSize: opts.storageCacheSize
  });

  const bridge = new Eip1193Bridge(provider);

  // const rpcForward = opts.forwardMode ? new RpcForward(provider) : undefined;

  const router = new Router(bridge);

  const server = new EthRpcServer({
    port: opts.httpPort,
    middleware: [],
    batchSize: opts.maxBatchSize
  });

  // const WebSocketTransport = new WebSocketServerTransport({
  //   port: opts.wsPort,
  //   middleware: [],
  //   batchSize: opts.maxBatchSize
  // });

  server.addRouter(router as any);
  // WebSocketTransport.addRouter(router as any);

  await provider.isReady();

  server.start();
  // WebSocketTransport.start();

  if (provider.subql) {
    console.log('!!!!!');
    await provider.subql?.checkGraphql();
  }

  // init rpc methods
  // if (rpcForward) {
  //   await rpcForward.initRpcMethods();
  // }

  console.log(`
  --------------------------------------------
               🚀 SERVER STARTED 🚀
  --------------------------------------------
  version         : ${version}
  endpoint url    : ${opts.endpoints}
  subquery url    : ${opts.subqlUrl}
  listening to    : http ${opts.httpPort} | ws ${opts.wsPort}
  max blockCache  : ${opts.maxBlockCacheSize}
  max batchSize   : ${opts.maxBatchSize}
  max storageSize : ${opts.storageCacheSize}
  safe mode       : ${opts.safeMode}
  local mode      : ${opts.localMode}
  forward mode    : ${opts.forwardMode}
  rich mode       : ${opts.richMode}
  verbose         : ${opts.verbose}
  --------------------------------------------
  `);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
