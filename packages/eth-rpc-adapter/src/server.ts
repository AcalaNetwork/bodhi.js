import { json as jsonParser } from 'body-parser';
import WebSocket from 'ws';
import connect, { HandleFunction } from 'connect';
import cors from 'cors';
import http, { ServerOptions } from 'http';

import { BatchSizeError, InvalidRequest, MethodNotFound } from './errors';
import { Router } from './router';
import { errorHandler } from './middlewares';
import { logger } from './utils/logger';
import tracer from './utils/tracer';

export interface EthRpcServerOptions extends ServerOptions {
  port: number;
  batchSize: number;
  middleware?: HandleFunction[];
  cors?: cors.CorsOptions;
  httpOnly?: boolean;
}

export interface JsonRpcRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[];
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: string | null;
  result?: any;
  error?: JsonRpcError;
}

export default class EthRpcServer {
  private static defaultCorsOptions = { origin: '*' };
  private server: http.Server;
  private wss: WebSocket.Server;
  private options: EthRpcServerOptions;
  public routers: Router[] = [];

  constructor(options: EthRpcServerOptions) {
    this.options = options;

    const app = connect();

    options.middleware?.forEach((mw) => app.use(mw));
    const corsOptions = options.cors ?? EthRpcServer.defaultCorsOptions;
    app.use(cors(corsOptions));
    app.use(jsonParser({ limit: '1mb' }));
    app.use(this.httpHandler.bind(this));
    app.use(errorHandler);

    this.server = http.createServer(app);

    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws: WebSocket) => {
      if (this.options.httpOnly) {
        ws.send('websocket connection is disabled, bye 👋');
        return ws.close();
      }

      // @ts-ignore
      ws.isAlive = true;

      ws.on('pong', () => {
        // @ts-ignore
        ws.isAlive = true;
      });

      ws.on('message', (message) => this.wsHandler(message.toString(), ws));

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

  start(): void {
    this.server.listen(this.options.port);
  }

  stop(): void {
    this.server.close();
  }

  addRouter(router: Router): void {
    this.routers.push(router);
  }

  removeRouter(router: Router): void {
    this.routers = this.routers.filter((r) => r !== router);
  }

  protected async baseHandler({ id, method, params }: JsonRpcRequest, ws?: WebSocket): Promise<JsonRpcResponse> {
    let response: JsonRpcResponse = {
      id: id ?? null,
      jsonrpc: '2.0',
    };

    if (id === null || id === undefined || !method) {
      return {
        ...response,
        error: new InvalidRequest({
          id: id || null,
          method: method || null,
          params: params || null,
        }).json(),
      };
    }

    if (this.routers.length === 0) {
      logger.warn('transport method called without a router configured.'); // tslint:disable-line
      throw new Error('No router configured');
    }

    // Initialize datadog span and get spanTags from the context
    // const spanTags = DataDogUtil.buildTracerSpan();

    const routerForMethod = this.routers.find((r) => r.isMethodImplemented(method));

    if (routerForMethod === undefined) {
      response.error = new MethodNotFound(
        'Method not found',
        `The method ${method} does not exist / is not available.`
      ).json();
    } else {
      const res = await tracer.trace(
        'rpc_call',
        { resource: 'base_hander' },
        () => routerForMethod.call(method, params, ws)
      );

      response = {
        ...response,
        ...res,
      };
    }

    // Add span tags to the datadog span
    // DataDogUtil.assignTracerSpan(spanTags, {
    //   id,
    //   method,
    //   ...(Array.isArray(params)
    //     ? params.reduce((c, v, i) => {
    //       return { ...c, [`param_${i}`]: v };
    //     }, {})
    //     : params),
    // });

    return response;
  }

  private async httpHandler(req: any, res: http.ServerResponse, next: (err?: any) => void): Promise<void> {
    logger.debug(req.body, 'incoming request');

    let result = null;
    try {
      if (req.body instanceof Array) {
        if (req.body.length > this.options.batchSize) {
          throw new BatchSizeError(this.options.batchSize, req.body.length);
        } else {
          result = await Promise.all(req.body.map((r: JsonRpcRequest) => this.baseHandler(r)));
        }
      } else {
        result = await this.baseHandler(req.body);
      }
    } catch (e) {
      return next(e);
    }

    logger.debug(result, 'request completed');

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  }

  private async wsHandler(rawReq: string, ws: WebSocket): Promise<void> {
    let req;
    try {
      req = JSON.parse(rawReq);
    } catch {
      ws.send(
        JSON.stringify({
          id: null,
          jsonrpc: '2.0',
          error: new InvalidRequest().json(),
        })
      );

      return;
    }

    logger.debug(req, 'ws incoming request');

    let result = null;

    if (req instanceof Array) {
      if (req.length > this.options.batchSize) {
        result = {
          jsonrpc: '2.0',
          error: new BatchSizeError(this.options.batchSize, req.length).json(),
        };
      } else {
        result = await Promise.all(req.map((r: JsonRpcRequest) => this.baseHandler(r, ws)));
      }
    } else {
      result = await this.baseHandler(req, ws);
    }

    logger.debug(result, 'ws request completed');

    ws.send(JSON.stringify(result));
  }
}
