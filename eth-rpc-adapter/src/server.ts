import HTTPServerTransport from './transports/http';
import WebSocketServerTransport from './transports/websocket';
import dotenv from 'dotenv';
import { Eip1193Bridge } from './eip1193-bridge';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Router } from './router';

dotenv.config();

export async function start() {
  const ENDPOINT_URL = process.env.ENDPOINT_URL || 'ws://0.0.0.0::9944';
  const HTTP_PORT = Number(process.env.HTTP_PORT || 8545);
  const WS_PORT = Number(process.env.WS_PORT || 3331);
  const MAX_CACHE_SIZE = Number(process.env.MAX_CACHE_SIZE || 200);
  const SAFE_MODE = !!Number(process.env.SAFE_MODE || 0);

  const provider = EvmRpcProvider.from(ENDPOINT_URL, {
    safemode: SAFE_MODE,
    maxCacheSize: MAX_CACHE_SIZE
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

  console.log('starting server ...');

  await provider.isReady();

  console.log(`server started with ${ENDPOINT_URL}`);
  console.log(`subquery url: ${process.env.SUBQL_URL || 'http://localhost:3001'}`);
  console.log(`listening to: HTTP ${HTTP_PORT}, WS: ${WS_PORT}`);
}
