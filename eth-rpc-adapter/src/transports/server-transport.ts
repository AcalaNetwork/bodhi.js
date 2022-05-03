import tracer from 'dd-trace';
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

  protected async routerHandler({ id, method, params }: JSONRPCRequest, cb?: any): Promise<JSONRPCResponse> {
    if (id === null || id === undefined || !method) {
      const error = new InvalidRequest();
      return {
        jsonrpc: '2.0',
        error: {
          code: error.code,
          data: error.data,
          message: error.message
        }
      };
    }
    if (this.routers.length === 0) {
      console.warn('transport method called without a router configured.'); // tslint:disable-line
      throw new Error('No router configured');
    }
    // Get datadog span from the context
    const span = process.env.EXTENSIVE_DD_INSTRUMENTATION == 'true' ? tracer.scope().active() : null;
    // Initialize datadog span tags
    const spanTags = span
      ? {
          body: {
            method,
            params
          },
          enterTime: Date.now(),
          exitTime: -1,
          elapsedTime: -1
        }
      : null;

    const routerForMethod = this.routers.find((r) => r.isMethodImplemented(method));

    let res: JSONRPCResponse = {
      id,
      jsonrpc: '2.0'
    };

    if (routerForMethod === undefined) {
      // method not found in any of the routers.
      const error = new MethodNotFound('Method not found', `The method ${method} does not exist / is not available.`);

      res = {
        ...res,
        error: {
          code: error.code,
          data: error.data,
          message: error.message
        }
      };
    } else {
      res = {
        ...res,
        ...(await routerForMethod.call(method, params as any, cb))
      };
    }
    if (span && spanTags) {
      // Update datadog span tags
      spanTags.elapsedTime = spanTags.exitTime - spanTags.enterTime;
      spanTags.exitTime = Date.now();
      // Assign datadog tags to span
      Object.keys(spanTags).forEach((key) => span.setTag(key, (spanTags as any)[key]));
    }
    return res;
  }
}
export default ServerTransport;
