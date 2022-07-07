import { EvmRpcProvider } from '@acala-network/eth-providers';
import EventEmitter from 'events';
import { MethodNotFound } from './errors';
import WebSocket from 'ws';
import type { DefinitionRpcExt } from '@polkadot/types/types';
import { logger } from './logger';
export class RpcForward extends EventEmitter {
  readonly provider: EvmRpcProvider;
  readonly rpcMeta: Record<string, DefinitionRpcExt> = {};
  methods?: string[];

  constructor(provider: EvmRpcProvider) {
    super();
    this.provider = provider;
  }

  async initRpcMethods(): Promise<void> {
    const result = await this.provider.api.rpc.rpc.methods();
    this.methods = result.methods.toJSON() as string[];
    // rpc_methods did not include rpc_methods https://github.com/paritytech/substrate/issues/11728
    if (Array.isArray(this.methods) && !this.methods.includes('rpc_methods')) {
      this.methods = this.methods.concat('rpc_methods');
    }

    for (const section of Object.keys(this.provider.api.rpc)) {
      for (const method of Object.keys((this.provider.api.rpc as any)[section])) {
        const meta: DefinitionRpcExt = (this.provider.api.rpc as any)[section][method].meta;

        this.rpcMeta[meta.jsonrpc] = meta;
      }
    }
  }

  request(request: { method: string; params?: Array<any> }): Promise<any> {
    // @ts-ignored ignore protected method
    return this.provider.api._rpcCore.provider.send(request.method, request.params);
  }

  async subscribe(
    request: { meta: DefinitionRpcExt; method: string; params: Array<any> },
    ws?: WebSocket
  ): Promise<any> {
    if (!ws) throw new Error('HTTP endpoint does not have subscriptions, use WebSockets instead');

    const updateType = request.meta.pubsub![0];
    const unsubMethod = `${request.meta.section}_${request.meta.pubsub![2]}`;
    const subType = `${request.meta.section}_${updateType}`;
    const updateMethod = subType;
    // @ts-ignored ignore protected method
    const wsProvider = this.provider.api._rpcCore.provider;
    let subId: string = '';

    const callback = (error: Error | null, data: any) => {
      if (!subId) throw new Error('subscription id does not exist');
      // @TODO does errors need to be sent to the client
      logger.debug(`subscribt ${subId}`);
      if (error) {
        logger.error('forward subscription error', error);
        return;
      } else {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: updateMethod,
            params: {
              result: data,
              subscription: subId
            }
          })
        );
      }
    };

    subId = (await wsProvider.subscribe(subType, request.method, request.params || [], callback)) as string;

    ws.on('close', () => {
      return wsProvider.unsubscribe(subType, unsubMethod, subId);
    });

    ws.on('error', () => {
      return wsProvider.unsubscribe(subType, unsubMethod, subId);
    });

    return subId;
  }

  isMethodValid(method: string): boolean {
    if (!this.methods) {
      throw new Error('Rpc methods not initialized');
    }

    return this.methods.includes(method);
  }

  async send(method: string, params: any[] = [], ws?: WebSocket): Promise<any> {
    if (this.isMethodValid(method)) {
      const meta = this.rpcMeta[method];
      if (meta && meta.isSubscription && meta.pubsub) {
        return this.subscribe({ meta, method, params }, ws);
      } else {
        return this.request({ method, params });
      }
    }

    throw new MethodNotFound('Method not available', `The method ${method} is not available.`);
  }
}
