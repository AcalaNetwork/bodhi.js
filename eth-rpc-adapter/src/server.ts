import http, { ServerOptions } from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { json as jsonParser } from 'body-parser';
import connect, { HandleFunction } from 'connect';
import { logger } from './logger';
import { errorHandler } from './middlewares';
import { InvalidRequest, MethodNotFound, BatchSizeError } from './errors';
import { Router } from './router';
import { DataDogUtil } from './utils';

export interface EthRpcServerOptions extends ServerOptions {
  port: number;
  batchSize: number;
  middleware?: HandleFunction[];
  cors?: cors.CorsOptions;
}

export interface JSONRPCRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[] | Record<string, unknown>;
}

export interface JSONRPCErrorObject {
  code: number;
  message: string;
  data?: any;
}

export interface JSONRPCResponse {
  jsonrpc: string;
  id: string | null;
  result?: any;
  error?: JSONRPCErrorObject;
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
    app.use(this.httpRouterHandler.bind(this));
    app.use(errorHandler);

    this.server = http.createServer(app);

    /* ------------------------- wss ---------------------------- */
    this.wss = new WebSocket.Server({ server: this.server, perMessageDeflate: false });

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

  public start(): void {
    this.server.listen(this.options.port);
  }

  public stop(): void {
    this.server.close();
  }

  public addRouter(router: Router): void {
    this.routers.push(router);
  }

  public removeRouter(router: Router): void {
    this.routers = this.routers.filter((r) => r !== router);
  }

  protected async routerHandler({ id, method, params }: JSONRPCRequest, ws?: WebSocket): Promise<JSONRPCResponse> {
    let res: JSONRPCResponse = {
      id: id ?? null,
      jsonrpc: '2.0'
    };

    if (id === null || id === undefined || !method) {
      return {
        ...res,
        error: new InvalidRequest({
          id: id || null,
          method: method || null,
          params: params || null
        }).json()
      };
    }

    if (this.routers.length === 0) {
      logger.warn('transport method called without a router configured.'); // tslint:disable-line
      throw new Error('No router configured');
    }

    // Initialize datadog span and get spanTags from the context
    const spanTags = DataDogUtil.buildTracerSpan();

    const routerForMethod = this.routers.find((r) => r.isMethodImplemented(method));

    if (routerForMethod === undefined) {
      res = {
        ...res,
        // method not found in any of the routers.
        error: new MethodNotFound('Method not found', `The method ${method} does not exist / is not available.`).json()
      };
    } else {
      res = {
        ...res,
        ...(await routerForMethod.call(method, params as any, ws))
      };
    }
    // Add span tags to the datadog span
    DataDogUtil.assignTracerSpan(spanTags, {
      id,
      method,
      ...(Array.isArray(params)
        ? params.reduce((c, v, i) => {
            return { ...c, [`param_${i}`]: v };
          }, {})
        : params)
    });

    return res;
  }

  private async httpRouterHandler(req: any, res: http.ServerResponse, next: (err?: any) => void): Promise<void> {
    logger.debug(req.body, 'incoming request');
    let result = null;
    if (req.body instanceof Array) {
      if (req.body.length > this.options.batchSize) {
        return next(new BatchSizeError(this.options.batchSize, req.body.length));
      } else {
        result = await Promise.all(req.body.map((r: JSONRPCRequest) => this.routerHandler(r)));
      }
    } else {
      try {
        result = await this.routerHandler(req.body);
      } catch (e) {
        return next(e);
      }
    }

    logger.debug(result, 'request completed');

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
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
        result = await Promise.all(req.map((r: JSONRPCRequest) => this.routerHandler(r, ws)));
      }
    } else {
      result = await this.routerHandler(req, ws);
    }

    logger.debug(result, 'request completed');

    ws.send(JSON.stringify(result));
  }
}
