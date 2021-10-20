import { logger } from './logger';
import { Eip1193Bridge } from './eip1193-bridge';
import { JSONRPCError } from './errors';
import { JSONRPCResponse } from './transports/types';
export class Router {
  readonly #bridge: Eip1193Bridge;

  constructor(bridge: Eip1193Bridge) {
    this.#bridge = bridge;
  }

  public async call(methodName: string, params: unknown[]): Promise<Partial<JSONRPCResponse>> {
    try {
      return { result: await this.#bridge.send(methodName, params) };
    } catch (err: any) {
      if (JSONRPCError.isJSONRPCError(err)) {
        return { error: { code: err.code, message: err.message, data: err.data } };
      }
      logger.error({ err, methodName, params }, 'request error');
      return { error: { code: 6969, message: `Error: ${err.message}` } };
    }
  }

  public isMethodImplemented(methodName: string): boolean {
    return this.#bridge.isMethodImplemented(methodName);
  }
}
