import { json as jsonParser } from 'body-parser';
import connect, { HandleFunction } from 'connect';
import cors from 'cors';
import http, { ServerOptions } from 'http';
import ServerTransport from './server-transport';
import type { JSONRPCRequest } from './types';
import { logger } from '../logger';
import { errorHandler } from '../middlewares';
import { BatchSizeError } from '../errors';

export interface HTTPServerTransportOptions extends ServerOptions {
  middleware: HandleFunction[];
  port: number;
  cors?: cors.CorsOptions;
  batchSize: number;
}

export default class HTTPServerTransport extends ServerTransport {
  private static defaultCorsOptions = { origin: '*' };
  private server: http.Server;
  private options: HTTPServerTransportOptions;

  constructor(options: HTTPServerTransportOptions) {
    super();
    const app = connect();

    const corsOptions = options.cors || HTTPServerTransport.defaultCorsOptions;
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

  private async httpRouterHandler(req: any, res: http.ServerResponse, next: (err?: any) => void): Promise<void> {
    logger.debug(req.body, 'incoming request');
    let result = null;
    if (req.body instanceof Array) {
      if (req.body.length > this.options.batchSize) {
        return next(new BatchSizeError(this.options.batchSize, req.body.length));
      } else {
        result = await Promise.all(req.body.map((r: JSONRPCRequest) => super.routerHandler(r)));
      }
    } else {
      try {
        result = await super.routerHandler(req.body);
      } catch (e) {
        return next(e);
      }
    }

    logger.debug(result, 'request completed');

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  }
}
