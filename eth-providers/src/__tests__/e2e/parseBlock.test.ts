import { afterAll, beforeAll, describe, it } from 'vitest';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import { getAllReceiptsAtBlock } from '../../utils/parseBlock';
import { hexlifyRpcResult } from '../../utils';
import { expect } from 'chai';
import { acala1102030a, acala1102030b, acala1555311a, acala1555311b, acala1563383, karura1824665, karura2449983a, karura2449983b, acala2669090, karura2826860, karura2936174, karura3524761, karura3597964, karura3607973, acala2859806 } from './receipt-snapshots';
import { TransactionReceipt } from '@ethersproject/abstract-provider';

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

const getAllReceiptsAtBlockNumber = async (
  api: ApiPromise,
  blockNumber: number,
) => {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
  const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

  return receipts.map(formatReceipt);
};

describe.concurrent('getAllReceiptsAtBlock', () => {
  let apiK: ApiPromise;
  let apiA: ApiPromise;

  beforeAll(async () => {
    console.log('connecting to node...');
    const KARURA_NODE_URL = 'wss://karura-rpc-1.aca-api.network';
    const ACALA_NODE_URL = 'wss://acala-rpc-1.aca-api.network';

    apiK = new ApiPromise(options({
      provider: new WsProvider(KARURA_NODE_URL),
    }));

    apiA = new ApiPromise(options({
      provider: new WsProvider(ACALA_NODE_URL),
    }));

    await apiK.isReady;
    await apiA.isReady;
    console.log(`connected to [
      ${KARURA_NODE_URL},
      ${ACALA_NODE_URL},
    ]`);
  });

  afterAll(() => {
    apiK.disconnect();
    apiA.disconnect();
  });

  describe.concurrent('transfer kar', async () => {
    it('basic one', async () => {
      const blockNumber = 3607973;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(karura3607973);
    });
  });

  describe.concurrent('contract creation', () => {
    it('basic one', async () => {
      const blockNumber = 3524761;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(karura3524761);
    });

    it('with logs + legacy gas', async () => {
      const blockNumber = 1824665;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(karura1824665);
    });

    it('2 contract creation failed', async () => {
      const blockNumber = 1102030;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts[0]).to.deep.equal(acala1102030a);
      expect(receipts[1]).to.deep.equal(acala1102030b);
    });
  });

  describe.concurrent('contract call', () => {
    it('aggregatedDex.swapWithExactSupply => transfer 1 erc20', async () => {
      const blockNumber = 2826860;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(karura2826860);
    });

    it('evm.call => tranfer 2 erc20', async () => {
      const blockNumber = 3597964;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(karura3597964);
    });

    it('evm.call + aggregatedDex.swapWithExactSupply', async () => {
      const blockNumber = 2449983;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts[0]).to.deep.equal(karura2449983a);
      expect(receipts[1]).to.deep.equal(karura2449983b);
    });
  });

  describe.concurrent('orphan tx', () => {
    it('1 orphan tx', async () => {
      const blockNumber = 1563383;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(acala1563383);
    });

    it('1 successful orphan + 1 failed orphan', async () => {
      const blockNumber = 1555311;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts[0]).to.deep.equal(acala1555311a);
      expect(receipts[1]).to.deep.equal(acala1555311b);
    });
  });

  describe.concurrent('erc20 XCM', () => {
    it('basic xcm', async () => {
      const blockNumber = 2936174;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(karura2936174);
    });

    it('with some other random txs in the block', async () => {
      const blockNumber = 2669090;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(acala2669090);
    });

    it('multiple xcms', async () => {
      const blockNumber = 2859806;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts[0]).to.deep.equal(acala2859806);
    });
  });

  describe.concurrent('other types', () => {
    it.skip('failed EVM extrinsic', async () => {
      // didn't find any block like this yet...
    });
  });
});
