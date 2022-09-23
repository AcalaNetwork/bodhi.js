import { json as jsonParser } from 'body-parser';
import connect, { HandleFunction } from 'connect';
import cors from 'cors';
import http, { ServerOptions } from 'http';
import { logger } from './logger';
import { errorHandler } from './middlewares';
import { BatchSizeError } from './errors';

import WebSocket from 'ws';
import { InvalidRequest, MethodNotFound } from './errors';
import { Router } from './router';
import { DataDogUtil } from './utils';
import type { JSONRPCRequest, JSONRPCResponse } from './transports/types';

export interface EthRpcServerOptions extends ServerOptions {
  middleware: HandleFunction[];
  port: number;
  cors?: cors.CorsOptions;
  batchSize: number;
}

export default class EthRpcServer {
  private static defaultCorsOptions = { origin: '*' };
  private server: http.Server;
  private options: EthRpcServerOptions;

  public routers: Router[] = [];

  constructor(options: EthRpcServerOptions) {
    const app = connect();

    const corsOptions = options.cors || EthRpcServer.defaultCorsOptions;
    this.options = {
      ...options,
      middleware: [
        cors(corsOptions) as HandleFunction,
        jsonParser({
          limit: '1mb'
        }),
        ...options.middleware
      ]
    };

    this.options.middleware.forEach((mw) => app.use(mw));

    app.use(this.httpRouterHandler.bind(this) as HandleFunction);
    app.use(errorHandler);

    this.server = http.createServer(app);
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
}
