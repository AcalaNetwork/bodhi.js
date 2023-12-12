import { BaseProvider } from './base-provider';
import tracer from 'dd-trace';

const TRACE_METHODS = [
  '_onNewHead',
  '_onNewFinalizedHead',
  '_notifySubscribers',
  'queryStorage',
  'getNetwork',
  'getBlockNumber',
  'getBlockData',
  'getBlockDataForHeader',
  'getBalance',
  'getTransactionCount',
  'getEvmTransactionCount',
  'getSubstrateNonce',
  'getCode',
  'call',
  '_ethCall',
  'getStorageAt',
  'getGasPrice',
  'getFeeData',
  'estimateGas',
  '_estimateGasCost',
  'getEthResources',
  '_getEthGas',
  'estimateResources',
  'getSubstrateAddress',
  'getEvmAddress',
  'queryAccountInfo',
  'queryContractInfo',
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
  '_checkSubqlHeight',
  '_sanitizeRawFilter',
  '_getMaxTargetBlock',
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
