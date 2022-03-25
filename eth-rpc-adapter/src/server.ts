import HTTPServerTransport from './transports/http';
import WebSocketServerTransport from './transports/websocket';
import dotenv from 'dotenv';
import { Eip1193Bridge } from './eip1193-bridge';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Router } from './router';
import { version } from './_version';

dotenv.config();

export async function start() {
  console.log('starting server ...');

  const ENDPOINT_URL = process.env.ENDPOINT_URL || 'ws://0.0.0.0::9944';
  const SUBQL_URL = process.env.SUBQL_URL || 'http://0.0.0.0:3001';
  const HTTP_PORT = Number(process.env.HTTP_PORT || 8545);
  const WS_PORT = Number(process.env.WS_PORT || 3331);
  const MAX_CACHE_SIZE = Number(process.env.MAX_CACHE_SIZE || 200);
  const SAFE_MODE = !!Number(process.env.SAFE_MODE || 0);

  const provider = EvmRpcProvider.from(ENDPOINT_URL, {
    safeMode: SAFE_MODE,
    maxCacheSize: MAX_CACHE_SIZE,
    subqlUrl: SUBQL_URL,
  });

  const bridge = new Eip1193Bridge(provider);

  const router = new Router(bridge);

  const HTTPTransport = new HTTPServerTransport({
    port: HTTP_PORT,
    middleware: []
  });

  const WebSocketTransport = new WebSocketServerTransport({
    port: WS_PORT,
    middleware: []
  });

  HTTPTransport.addRouter(router as any);
  WebSocketTransport.addRouter(router as any);

  HTTPTransport.start();
  WebSocketTransport.start();

  await provider.isReady();

  console.log(`-------- 🚀 SERVER STARTED 🚀 --------`);
  console.log(`version      : ${version}`);
  console.log(`endpoint url : ${ENDPOINT_URL}`);
  console.log(`subquery url : ${SUBQL_URL}`);
  console.log(`listening to : http ${HTTP_PORT} | ws ${WS_PORT}`);
  console.log(`max cacheSize: ${MAX_CACHE_SIZE}`);
  console.log(`safe mode    : ${SAFE_MODE}`);
  console.log(`--------------------------------------`);
}
