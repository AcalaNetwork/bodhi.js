import { ApiPromise, WsProvider } from '@polkadot/api';
import { BaseProvider, BaseProviderOptions } from '@acala-network/eth-providers/base-provider';
import { withAcalaTypes } from '@acala-network/api';
import tracer from 'dd-trace';

const TRACE_METHODS = [
  '_onNewHead',
  '_onNewFinalizedHead',
  '_notifySubscribers',
  'getNetwork',
  'getBlockNumber',
  'getBlockData',
  'getBlockDataForHeader',
  'getBalance',
  'getTransactionCount',
  'getCode',
  'call',
  '_ethCall',
  'getStorageAt',
  'getGasPrice',
  'getFeeData',
  'estimateGas',
  '_estimateGasCost',
  '_getEthGas',
  'estimateResources',
  'getSubstrateAddress',
  'getEvmAddress',
  'queryEvmAccountInfo',
  'prepareTransaction',
  'sendRawTransaction',
  'sendTransaction',
  '_wrapTransaction',
  '_getBlockNumber',
  '_getBlockHash',
  '_isBlockCanonical',
  '_isBlockFinalized',
  '_isTransactionFinalized',
  '_ensureSafeModeBlockTagFinalization',
  '_getBlockHeader',
  'getReceiptAtBlockFromChain',
  'getReceiptAtBlock',
  '_getReceiptAtBlockByHash',
  '_getReceiptAtBlockByIndex',
  '_getPendingTX',
  'getTransactionByHash',
  'getReceipt',
  '_getReceipt',
  '_sanitizeRawFilter',
  '_getSubqlMissedLogs',
  'getLogs',
  'getIndexerMetadata',
  'healthCheck',
  'addEventListener',
  'removeEventListener',
  'addPollFilter',
  '_pollLogs',
  '_pollBlocks',
  'poll',
  'removePollFilter',
];

export class BaseProviderWithTrace extends BaseProvider {
  constructor(...args: any[]) {
    super(...args);

    for (const methodName of TRACE_METHODS) {
      if (typeof this[methodName] !== 'function' || methodName === 'constructor') {
        throw new Error(`cannot trace method ${methodName}`);
      }

      this[methodName] = tracer.wrap(
        'provider_call',
        { resource: `provider.${methodName}` },
        this[methodName].bind(this)
      );
    }
  }
}

export class EvmRpcProviderWithTrace extends BaseProviderWithTrace {
  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const api = new ApiPromise(withAcalaTypes({
      provider: new WsProvider(endpoint),
    }));

    this.setApi(api);
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProviderWithTrace {
    return new EvmRpcProviderWithTrace(endpoint, opt);
  }
}
