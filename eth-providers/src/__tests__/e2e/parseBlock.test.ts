import { afterAll, beforeAll, describe, it } from 'vitest';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import { getAllReceiptsAtBlock } from '../../utils/parseBlock';
import { hexlifyRpcResult } from '../../utils';
import { expect } from 'chai';
import { karura1824665, karura2449983a, karura2449983b, karura2826860, karura3524761, karura3597964 } from './receipt-snapshots';
import { Log, TransactionReceipt } from '@ethersproject/abstract-provider';

interface FormatedReceipt {
  to: string;
  from: string;
  contractAddress: string,
  transactionIndex: number,
  root?: string,
  gasUsed: string,
  logsBloom: string,
  blockHash: string,
  transactionHash: string,
  logs: Array<any>,
  blockNumber: number,
  cumulativeGasUsed: string,
  effectiveGasPrice: string,
  type: number;
  status?: number
};

// format receipt to the shape returned by eth rpc
const formatReceipt = (receipt: TransactionReceipt): FormatedReceipt => (
  Object.entries(hexlifyRpcResult(receipt)).reduce((acc, kvPair) => {
    const [k, v] = kvPair;
    if (!['byzantium', 'confirmations'].includes(k)) {
      acc[k] = v;
    }

    return acc;
  }, {} as FormatedReceipt)  
);

describe('getAllReceiptsAtBlock', () => {
  let api: ApiPromise;

  beforeAll(async () => {
    console.log('connecting to node...');
    const KARURA_NODE_URL = 'wss://karura-rpc-1.aca-api.network';
    // const KARURA_NODE_URL = 'wss://karura-rpc.dwellir.com';
    const provider = new WsProvider(KARURA_NODE_URL);
    api = new ApiPromise(options({ provider }));
    await api.isReady;
    console.log(`connected to [${KARURA_NODE_URL}]`);
  });

  afterAll(() => api.disconnect())

  it.concurrent('contract creation', async () => {
    const blockNumber = 3524761;
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber)
    const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

    expect(receipts.length).to.equal(1);
    expect(formatReceipt(receipts[0])).to.deep.equal(karura3524761);
  });

  it.concurrent('aggregatedDex.swapWithExactSupply - transfer 1 erc20', async () => {
    const blockNumber = 2826860;
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber)
    const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

    expect(receipts.length).to.equal(1);
    expect(formatReceipt(receipts[0])).to.deep.equal(karura2826860);
  });

  it.concurrent('evm.call - tranfer 2 erc20', async () => {
    const blockNumber = 3597964;
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber)
    const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

    expect(receipts.length).to.equal(1);
    expect(formatReceipt(receipts[0])).to.deep.equal(karura3597964);
  });

  it.concurrent('evm.call + aggregatedDex.swapWithExactSupply', async () => {
    const blockNumber = 2449983;
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber)
    const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

    expect(receipts.length).to.equal(2);
    expect(formatReceipt(receipts[0])).to.deep.equal(karura2449983a);
    expect(formatReceipt(receipts[1])).to.deep.equal(karura2449983b);
  });

  it.concurrent('contract creation with logs - legacy gas', async () => {
    const blockNumber = 1824665;
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber)
    const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

    expect(receipts.length).to.equal(1);
    expect(formatReceipt(receipts[0])).to.deep.equal(karura1824665);
  });
});

