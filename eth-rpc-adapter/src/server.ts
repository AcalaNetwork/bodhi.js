import HTTPServerTransport from './transports/http';
import WebSocketServerTransport from './transports/websocket';
import dotenv from 'dotenv';
import { Eip1193Bridge } from './eip1193-bridge';
import { EvmRpcProvider } from './evm-rpc-provider';
import { Router } from './router';

dotenv.config();

export async function start() {
  const ENDPOINT_URL = process.env.ENDPOINT_URL;
  if (!ENDPOINT_URL) {
    throw new Error('ENDPOINT_URL is not defined');
  }

  const HTTP_PORT = Number(process.env.HTTP_PORT || 3330);
  const WS_PORT = Number(process.env.WS_PORT || 3331);

  const provider = new EvmRpcProvider(ENDPOINT_URL);

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

  console.log(`server started -- listening to: HTTP ${HTTP_PORT}, WS: ${WS_PORT}`);
}
