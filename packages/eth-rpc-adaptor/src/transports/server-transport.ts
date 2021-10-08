import { Router } from '../router';
import type { JSONRPCRequest, JSONRPCResponse } from './types';
import { MethodNotFound, InvalidRequest } from '../errors';

export abstract class ServerTransport {
  public routers: Router[] = [];

  public addRouter(router: Router): void {
    this.routers.push(router);
  }

  public removeRouter(router: Router): void {
    this.routers = this.routers.filter((r) => r !== router);
  }

  public start(): void {
    console.warn('Transport must implement start()'); // tslint:disable-line
    throw new Error('Transport missing start implementation');
  }

  protected async routerHandler({ id, method, params }: JSONRPCRequest): Promise<JSONRPCResponse> {
    if (id === null || id === undefined) {
      const error = new InvalidRequest();
      return {
        jsonrpc: '2.0',
        error: {
          code: error.code,
          data: error.data,
          message: error.message,
        },
      };
    }
    if (this.routers.length === 0) {
      console.warn('transport method called without a router configured.'); // tslint:disable-line
      throw new Error('No router configured');
    }

    const routerForMethod = this.routers.find((r) => r.isMethodImplemented(method));

    let res: JSONRPCResponse = {
      id,
      jsonrpc: '2.0',
    };

    if (routerForMethod === undefined) {
      // method not found in any of the routers.
      const error = new MethodNotFound('Method not found', `The method ${method} does not exist / is not available.`);

      res = {
        ...res,
        error: {
          code: error.code,
          data: error.data,
          message: error.message,
        },
      };
    } else {
      res = {
        ...res,
        ...(await routerForMethod.call(method, params as any)),
      };
    }

    return res;
  }
}
export default ServerTransport;
