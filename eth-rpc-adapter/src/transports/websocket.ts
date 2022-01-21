import { json as jsonParser } from 'body-parser';
import connect, { HandleFunction } from 'connect';
import cors from 'cors';
import http from 'http';
import http2, { Http2SecureServer, SecureServerOptions } from 'http2';
import WebSocket from 'ws';
import { logger } from '../logger';
import ServerTransport from './server-transport';
import type { JSONRPCRequest } from './types';
import { errorHandler } from '../middlewares';

export interface WebSocketServerTransportOptions extends SecureServerOptions {
  middleware: HandleFunction[];
  port: number;
  cors?: cors.CorsOptions;
  allowHTTP1?: boolean;
}

export default class WebSocketServerTransport extends ServerTransport {
  private static defaultCorsOptions = { origin: '*' };
  private server: Http2SecureServer | http.Server;
  private wss: WebSocket.Server;

  constructor(private options: WebSocketServerTransportOptions) {
    super();
    options.allowHTTP1 = true;

    const app = connect();

    const corsOptions = options.cors || WebSocketServerTransport.defaultCorsOptions;
    this.options = {
      ...options,
      middleware: [
        cors(corsOptions) as HandleFunction,
        jsonParser({
          limit: '1mb'
        }),
        ...options.middleware,
        errorHandler
      ]
    };

    this.options.middleware.forEach((mw) => app.use(mw));

    if (!this.options.cert && !this.options.key) {
      this.server = http.createServer((req: any, res: any) => app(req, res));
    } else {
      this.server = http2.createSecureServer(options, (req: any, res: any) => app(req, res));
    }
    this.wss = new WebSocket.Server({ server: this.server as any });

    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => this.webSocketRouterHandler(JSON.parse(message), ws.send.bind(ws)));
      ws.on('close', () => ws.removeAllListeners());
    });
  }

  public start() {
    this.server.listen(this.options.port);
  }

  public stop() {
    this.wss.removeAllListeners();
    this.wss.close();
    this.server.close();
  }

  private async webSocketRouterHandler(req: any, respondWith: any): Promise<void> {
    let result = null;
    logger.debug(req, 'incoming request');
    if (req instanceof Array) {
      result = await Promise.all(req.map((r: JSONRPCRequest) => super.routerHandler(r, respondWith)));
    } else {
      result = await super.routerHandler(req, respondWith);
    }
    logger.debug(result, 'request completed');
    respondWith(JSON.stringify(result));
  }
}
