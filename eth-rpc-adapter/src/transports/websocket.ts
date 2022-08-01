import { json as jsonParser } from 'body-parser';
import connect, { HandleFunction } from 'connect';
import cors from 'cors';
import http from 'http';
import http2, { Http2SecureServer, SecureServerOptions } from 'http2';
import WebSocket from 'ws';
import { BatchSizeError, InvalidRequest } from '../errors';
import { logger } from '../logger';
import { errorHandler } from '../middlewares';
import ServerTransport from './server-transport';
import type { JSONRPCRequest, JSONRPCResponse } from './types';

export interface WebSocketServerTransportOptions extends SecureServerOptions {
  middleware: HandleFunction[];
  port: number;
  cors?: cors.CorsOptions;
  allowHTTP1?: boolean;
  batchSize: number;
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
      // @ts-ignore
      ws.isAlive = true;

      ws.on('pong', () => {
        // @ts-ignore
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => this.webSocketRouterHandler(message, ws));

      ws.on('close', () => {
        ws.removeAllListeners();
      });
      ws.on('error', () => {
        ws.removeAllListeners();
      });
    });

    const interval = setInterval(() => {
      for (const ws of this.wss.clients) {
        // @ts-ignore
        if (ws.isAlive === false) return ws.terminate();

        // @ts-ignore
        ws.isAlive = false;
        ws.ping();
      }
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
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

  private praseRequest(req: string): any {
    try {
      return JSON.parse(req);
    } catch (e) {
      return null;
    }
  }

  private async webSocketRouterHandler(rawReq: any, ws: WebSocket): Promise<void> {
    const req = this.praseRequest(rawReq);
    if (req === null) {
      const result = {
        id: null,
        jsonrpc: '2.0',
        error: new InvalidRequest().json()
      };
      ws.send(JSON.stringify(result));
      return;
    }

    let result = null;
    logger.debug(req, 'WS incoming request');

    if (req instanceof Array) {
      if (req.length > this.options.batchSize) {
        result = {
          jsonrpc: '2.0',
          error: new BatchSizeError(this.options.batchSize, req.length).json()
        };
      } else {
        result = await Promise.all(req.map((r: JSONRPCRequest) => super.routerHandler(r, ws)));
      }
    } else {
      result = await super.routerHandler(req, ws);
    }

    logger.debug(result, 'request completed');

    ws.send(JSON.stringify(result));
  }
}
