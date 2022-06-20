import { EvmRpcProvider } from '@acala-network/eth-providers';
import EventEmitter from 'events';
import { MethodNotFound } from './errors';

export class RpcForward extends EventEmitter {
  readonly provider: EvmRpcProvider;
  methods?: string[];

  constructor(provider: EvmRpcProvider) {
    super();
    this.provider = provider;
  }

  async initRpcMethods(): Promise<void> {
    const result = await this.provider.api.rpc.rpc.methods();
    this.methods = result.methods.toJSON() as string[];
  }

  request(request: { method: string; params?: Array<any> }): Promise<any> {
    // @ts-ignored ignore protected method
    return this.provider.api._rpcCore.provider.send(request.method, request.params);
  }

  isMethodValid(method: string): boolean {
    if (!this.methods) {
      throw new Error('Rpc methods not initialized');
    }

    return this.methods.includes(method);
  }

  async send(method: string, params: any[] = []): Promise<any> {
    if (this.isMethodValid(method)) {
      return this.request({ method, params });
    }

    throw new MethodNotFound('Method not available', `The method ${method} is not available.`);
  }
}
