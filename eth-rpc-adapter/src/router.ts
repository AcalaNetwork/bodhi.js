import { ERROR_PATTERN } from '@acala-network/eth-providers';
import { Logger as EthLogger } from '@ethersproject/logger';
import WebSocket from 'ws';
import { Eip1193Bridge } from './eip1193-bridge';
import { InvalidParams, JSONRPCError, MethodNotFound } from './errors';
import { logger } from './logger';
import { RpcForward } from './rpc-forward';
import { JSONRPCResponse } from './transports/types';
export class Router {
  readonly #bridge: Eip1193Bridge;
  readonly #rpcForward?: RpcForward;

  constructor(bridge: Eip1193Bridge, rpcForward?: RpcForward) {
    this.#bridge = bridge;
    this.#rpcForward = rpcForward;
  }

  public async call(methodName: string, params: unknown[], ws?: WebSocket): Promise<Partial<JSONRPCResponse>> {
    if (this.#bridge.isMethodImplemented(methodName)) {
      try {
        return { result: await this.#bridge.send(methodName, params, ws) };
      } catch (err: any) {
        if (JSONRPCError.isJSONRPCError(err)) {
          return { error: { code: err.code, message: err.message, data: err.data } };
        }
        if (typeof err === 'object' && err.code) {
          let error = null;

          if (err.code === EthLogger.errors.INVALID_ARGUMENT) {
            error = new InvalidParams(err.message);
          }

          if (err.code === EthLogger.errors.UNSUPPORTED_OPERATION) {
            error = new InvalidParams(err.message);
          }

          if (err.code === EthLogger.errors.NOT_IMPLEMENTED) {
            error = new MethodNotFound(err.message);
          }

          if (error) {
            return { error: error.json() };
          }
        }

        logger.error({ err, methodName, params }, 'request error');

        let message = err.message;
        for (const pattern of ERROR_PATTERN) {
          const match = message.match(pattern);
          if (match) {
            const error = this.#bridge.provider.api.registry.findMetaError(new Uint8Array([match[1], match[2]]));
            message = `${error.section}.${error.name}: ${error.docs}`;
            break;
          }
        }

        return { error: new JSONRPCError(`Error: ${message}`, 6969) };
      }
    } else if (this.#rpcForward && this.#rpcForward.isMethodValid(methodName)) {
      return { result: await this.#rpcForward.send(methodName, params, ws) };
    } else {
      return { error: new MethodNotFound('Method not found', `The method ${methodName} does not exist`).json() };
    }
  }

  public isMethodImplemented(methodName: string): boolean {
    return this.#rpcForward
      ? this.#bridge.isMethodImplemented(methodName) || this.#rpcForward.isMethodValid(methodName)
      : this.#bridge.isMethodImplemented(methodName);
  }
}
