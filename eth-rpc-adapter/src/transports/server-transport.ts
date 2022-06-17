import { Router } from '../router';
import type { JSONRPCRequest, JSONRPCResponse } from './types';
import { MethodNotFound, InvalidRequest } from '../errors';
import { DataDogUtil } from '../utils';
import { logger } from '../logger';

export abstract class ServerTransport {
  public routers: Router[] = [];

  public addRouter(router: Router): void {
    this.routers.push(router);
  }

  public removeRouter(router: Router): void {
    this.routers = this.routers.filter((r) => r !== router);
  }

  public start(): void {
    logger.warn('Transport must implement start()'); // tslint:disable-line
    throw new Error('Transport missing start implementation');
  }

  protected async routerHandler({ id, method, params }: JSONRPCRequest, cb?: any): Promise<JSONRPCResponse> {
    let res: JSONRPCResponse = {
      id: id || null,
      jsonrpc: '2.0'
    };

    if (id === null || id === undefined || !method) {
      logger.error(`invalid json request: id: ${id}, method: ${method}, params: ${params}`);
      return {
        ...res,
        error: new InvalidRequest().json()
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
        ...(await routerForMethod.call(method, params as any, cb))
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
}
export default ServerTransport;
