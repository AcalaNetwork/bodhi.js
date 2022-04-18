import { json as jsonParser } from 'body-parser';
import connect, { HandleFunction } from 'connect';
import cors from 'cors';
import http2, { Http2SecureServer, SecureServerOptions } from 'http2';
import ServerTransport from './server-transport';
import type { JSONRPCRequest } from './types';
import { logger } from '../logger';
import { errorHandler } from '../middlewares';

export interface HTTPSServerTransportOptions extends SecureServerOptions {
  middleware: HandleFunction[];
  port: number;
  cors?: cors.CorsOptions;
  allowHTTP1?: boolean;
  batch_size: number;
}

export default class HTTPSServerTransport extends ServerTransport {
  private static defaultCorsOptions = { origin: '*' };
  private server: Http2SecureServer;

  constructor(private options: HTTPSServerTransportOptions) {
    super();
    options.allowHTTP1 = true;

    const app = connect();

    const corsOptions = options.cors || HTTPSServerTransport.defaultCorsOptions;
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
    app.use(this.httpsRouterHandler.bind(this));
    app.use(errorHandler);
    this.server = http2.createSecureServer(options, (req: any, res: any) => app(req, res));
  }

  public start(): void {
    this.server.listen(this.options.port);
  }

  public stop(): void {
    this.server.close();
  }

  private async httpsRouterHandler(req: any, res: any): Promise<void> {
    logger.debug(req.body, 'incoming request');
    let result = null;
    if (req.body instanceof Array) {
      if (req.body.length > this.options.batch_size) {
        return logger.throwError('Exceeded maximum batch size');
      }
      result = await Promise.all(req.body.map((r: JSONRPCRequest) => super.routerHandler(r)));
    } else {
      result = await super.routerHandler(req.body);
    }
    logger.debug(result, 'request completed');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  }
}
