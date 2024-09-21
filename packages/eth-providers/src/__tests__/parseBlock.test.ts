import { ApiPromise, WsProvider } from '@polkadot/api';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { options } from '@acala-network/api';

import { getAllReceiptsAtBlock } from '../utils/parseBlock';
import { hexlifyRpcResult, sleep } from '../utils';

interface FormatedReceipt {
  to?: string;
  from: string;
  contractAddress?: string;
  transactionIndex: number;
  root?: string;
  gasUsed: string;
  logsBloom: string;
  blockHash: string;
  transactionHash: string;
  logs: Array<any>;
  blockNumber: number;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  type: number;
  status?: number;
}

// format receipt to the shape returned by eth rpc
const formatReceipt = (receipt: TransactionReceipt): FormatedReceipt =>
  Object.entries(hexlifyRpcResult(receipt)).reduce((acc, kvPair) => {
    const [k, v] = kvPair;
    if (!['confirmations', 'byzantium'].includes(k)) {
      acc[k] = v;
    }

    return acc;
  }, {} as FormatedReceipt);

const getAllReceiptsAtBlockNumber = async (api: ApiPromise, blockNumber: number) => {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
  const receipts = await getAllReceiptsAtBlock(api, blockHash.toHex());

  return receipts.map(formatReceipt);
};

describe.concurrent('getAllReceiptsAtBlock', () => {
  let apiK: ApiPromise;
  let apiA: ApiPromise;

  beforeAll(async () => {
    console.log('connecting to node...');
    const KARURA_NODE_URL = 'wss://karura-rpc.aca-api.network';
    const ACALA_NODE_URL = 'wss://acala-rpc.aca-api.network';

    apiK = new ApiPromise(
      options({
        provider: new WsProvider(KARURA_NODE_URL),
      })
    );

    apiA = new ApiPromise(
      options({
        provider: new WsProvider(ACALA_NODE_URL),
      })
    );

    await apiK.isReady;
    await apiA.isReady;
    console.log(`connected to [
      ${KARURA_NODE_URL},
      ${ACALA_NODE_URL},
    ]`);
  });

  afterAll(async () => {
    await sleep(10_000);
    await apiK.disconnect();
    await apiA.disconnect();
  });

  describe.concurrent('transfer kar', () => {
    it('basic one', async ({ expect }) => {
      const blockNumber = 3607973;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });
  });

  describe.concurrent('contract creation', () => {
    it('basic one', async ({ expect }) => {
      const blockNumber = 3524761;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });

    it('with logs + legacy gas', async ({ expect }) => {
      const blockNumber = 1824665;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });
  });

  describe.concurrent('contract call', () => {
    it('aggregatedDex.swapWithExactSupply => transfer 1 erc20', async ({ expect }) => {
      const blockNumber = 2826860;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });

    it('evm.call => tranfer 2 erc20', async ({ expect }) => {
      const blockNumber = 3597964;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });

    it('evm.call + aggregatedDex.swapWithExactSupply', async ({ expect }) => {
      const blockNumber = 2449983;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts).toMatchSnapshot();
    });

    it('negative usedStorage', async ({ expect }) => {
      const blockNumber = 2043397;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts).toMatchSnapshot();
    });
  });

  describe.concurrent('orphan tx', () => {
    it('1 orphan tx', async ({ expect }) => {
      const blockNumber = 1563383;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });

    it('1 successful orphan + 1 failed orphan', async ({ expect }) => {
      const blockNumber = 1555311;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts).toMatchSnapshot();
    });

    it('9 contract creation failed by technicalCommittee', async ({ expect }) => {
      const blockNumber = 1102030;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(9);
      expect(receipts).toMatchSnapshot();
    });

    it('batch approve + draw lottery', async ({ expect }) => {
      const blockNumber = 6066931;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(2);
      expect(receipts).toMatchSnapshot();
    });
  });

  describe.concurrent('erc20 XCM', () => {
    it('basic xcm', async ({ expect }) => {
      const blockNumber = 2936174;
      const receipts = await getAllReceiptsAtBlockNumber(apiK, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });

    it('with some other random txs in the block', async ({ expect }) => {
      const blockNumber = 2669090;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });

    it('multiple xcms', async ({ expect }) => {
      const blockNumber = 2859806;
      const receipts = await getAllReceiptsAtBlockNumber(apiA, blockNumber);

      expect(receipts.length).to.equal(1);
      expect(receipts).toMatchSnapshot();
    });
  });

  describe.concurrent.skip('other types', () => {
    it('failed EVM extrinsic - 0 gasLimit', async ({ expect }) => {
      // TODO: construct a similar one on karura
    });
  });
});
