import axios from 'axios';
import { getAllTxReceipts, getAllLogs } from '@acala-network/eth-providers/lib/utils';
import { Log } from '@ethersproject/abstract-provider';

const RPC_URL = 'http://localhost:8545';
const rpcGet =
  (method: string) =>
  (params: any): any =>
    axios.get(RPC_URL, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method,
        params
      }
    });

export const logsEq = (a: Log[], b: Log[]): boolean =>
  a.length === b.length &&
  a.every(({ transactionHash: t0, logIndex: l0 }) =>
    b.find(({ transactionHash: t1, logIndex: l1 }) => t0 === t1 && l0 === l1)
  );

describe('eth_getTransactionReceipt', () => {
  const eth_getTransactionReceipt = rpcGet('eth_getTransactionReceipt');

  it('returns correct result when hash exist', async () => {
    const allTxReceipts = await getAllTxReceipts();

    // test first one
    let txR = allTxReceipts[0];
    let res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).toEqual(200);
    expect(res.data.result.transactionHash).toEqual(txR.transactionHash);

    // test last one
    txR = allTxReceipts[allTxReceipts.length - 1];
    res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).toEqual(200);
    expect(res.data.result.transactionHash).toEqual(txR.transactionHash);

    // test middle one
    txR = allTxReceipts[Math.floor(allTxReceipts.length / 2)];
    res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).toEqual(200);
    expect(res.data.result.transactionHash).toEqual(txR.transactionHash);
  });

  it('return correct error code and messge', async () => {
    let res;

    /* ---------- invalid hex address ---------- */
    res = await eth_getTransactionReceipt(['0x000']);
    expect(res.status).toEqual(200);
    expect(res.data.error.code).toEqual(-32602);
    expect(res.data.error.message).toContain('invalid argument');

    /* ---------- hash not found ---------- */
    res = await eth_getTransactionReceipt(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
    expect(res.status).toEqual(200);
    expect(res.data.error.code).toEqual(6969);
    expect(res.data.error.message).toContain('transaction hash not found');
  });
});

describe('eth_getLogs', () => {
  const eth_getLogs = rpcGet('eth_getLogs');

  describe('when no filter', () => {
    it('returns all logs', async () => {
      const allLogs = await getAllLogs();
      const res = await eth_getLogs([{}]);

      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);
    });
  });

  describe('filter by address', () => {
    it('returns correct logs', async () => {
      const allLogs = await getAllLogs();
      const log1 = allLogs[0];
      const log2 = allLogs[allLogs.length - 1];
      const log3 = allLogs[Math.floor(allLogs.length / 2)];
      let res;
      let expectedLogs;

      /* ---------- single address ---------- */
      res = await eth_getLogs([{ address: log1.address }]);
      expectedLogs = allLogs.filter((l) => l.address === log1.address);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ address: log2.address }]);
      expectedLogs = allLogs.filter((l) => l.address === log2.address);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ address: log3.address }]);
      expectedLogs = allLogs.filter((l) => l.address === log3.address);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      /* ---------- multiple address ---------- */
      // TODO: interestingly, current Filter type says address can only be string
      // can support string[] filter if we needed in the future
    });
  });

  describe('filter by block number', () => {
    it('returns correct logs', async () => {
      const BIG_NUMBER = 88888888;
      const allLogs = await getAllLogs();
      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ fromBlock: 0 }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      res = await eth_getLogs([{ toBlock: BIG_NUMBER }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      res = await eth_getLogs([{ fromBlock: 0, toBlock: BIG_NUMBER }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 99999 }]);
      expect(res.status).toEqual(200);
      expect(res.data.result).toEqual([]);

      res = await eth_getLogs([{ toBlock: -1 }]);
      expect(res.status).toEqual(200);
      expect(res.data.result).toEqual([]);

      /* ---------- should return partial logs ---------- */
      const from = 16;
      const to = 50;
      res = await eth_getLogs([{ fromBlock: from }]);
      expect(res.status).toEqual(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ toBlock: to }]);
      expect(res.status).toEqual(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expect(res.status).toEqual(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);
    });
  });

  describe('filter by block tag', () => {
    it('returns correct logs for valid tag', async () => {
      const allLogs = await getAllLogs();
      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'earliest' }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      res = await eth_getLogs([{ toBlock: 'latest' }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 'latest' }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 'earliest' }]);
      expect(res.data.result).toEqual([]);

      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 5 }]);
      expect(res.data.result).toEqual([]);

      res = await eth_getLogs([{ fromBlock: 8, toBlock: 'earliest' }]);
      expect(res.data.result).toEqual([]);

      /* ---------- should return some logs ---------- */
      const from = 17;
      const to = 50;
      res = await eth_getLogs([{ fromBlock: from, toBlock: 'latest' }]);
      expect(res.status).toEqual(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
      expect(res.status).toEqual(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expect(res.status).toEqual(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);
    });

    it('returns correct error code and messge for invalid tag', async () => {
      const res = await eth_getLogs([{ fromBlock: 'polkadot' }]);
      expect(res.status).toEqual(200);
      expect(res.data.error.code).toEqual(-32602);
      expect(res.data.error.message).toContain("blocktag should be number | 'latest' | 'earliest'");
    });
  });

  describe('filter by topics', () => {
    it('returns correct logs', async () => {
      const allLogs = await getAllLogs();
      const log1 = allLogs[0];
      const log2 = allLogs[allLogs.length - 1];
      const log3 = allLogs[Math.floor(allLogs.length / 2)];
      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ topics: [] }]);
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, allLogs)).toBe(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ topics: ['XXX'] }]);
      expect(res.data.result).toEqual([]);

      /* ---------- should return some logs ---------- */
      res = await eth_getLogs([{ topics: log1.topics }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log1.topics.includes(t)));
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ topics: log2.topics }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log2.topics.includes(t)));
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);

      res = await eth_getLogs([{ topics: log3.topics }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log3.topics.includes(t)));
      expect(res.status).toEqual(200);
      expect(logsEq(res.data.result, expectedLogs)).toBe(true);
    });
  });
});
