import axios from 'axios';
import { getAllTxReceipts, getAllLogs } from '@acala-network/eth-providers/lib/utils';
import { Log } from '@ethersproject/abstract-provider';
import { expect } from 'chai';

const RPC_URL = 'http://localhost:8545';
const rpcGet =
  (
    method: string // eslint-disable-line
  ) =>
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
    expect(res.status).to.equal(200);
    expect(res.data.result.transactionHash).to.equal(txR.transactionHash);

    // test last one
    txR = allTxReceipts[allTxReceipts.length - 1];
    res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.transactionHash).to.equal(txR.transactionHash);

    // test middle one
    txR = allTxReceipts[Math.floor(allTxReceipts.length / 2)];
    res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.transactionHash).to.equal(txR.transactionHash);
  });

  it('return correct error code and messge', async () => {
    let res;

    /* ---------- invalid hex address ---------- */
    res = await eth_getTransactionReceipt(['0x000']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(-32602);
    expect(res.data.error.message).to.contain('invalid argument');

    /* ---------- hash not found ---------- */
    res = await eth_getTransactionReceipt(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(6969);
    expect(res.data.error.message).to.contain('transaction hash not found');
  });
});

describe('eth_getLogs', () => {
  const eth_getLogs = rpcGet('eth_getLogs');

  describe('when no filter', () => {
    it('returns all logs', async () => {
      const allLogs = await getAllLogs();
      const res = await eth_getLogs([{}]);

      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);
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
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ address: log2.address }]);
      expectedLogs = allLogs.filter((l) => l.address === log2.address);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ address: log3.address }]);
      expectedLogs = allLogs.filter((l) => l.address === log3.address);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

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
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ toBlock: BIG_NUMBER }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 0, toBlock: BIG_NUMBER }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 99999 }]);
      expect(res.status).to.equal(200);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ toBlock: -1 }]);
      expect(res.status).to.equal(200);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return partial logs ---------- */
      const from = 16;
      const to = 50;
      res = await eth_getLogs([{ fromBlock: from }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);
    });
  });

  describe('filter by block tag', () => {
    it('returns correct logs for valid tag', async () => {
      const allLogs = await getAllLogs();
      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'earliest' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ toBlock: 'latest' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 'latest' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 'earliest' }]);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 5 }]);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ fromBlock: 8, toBlock: 'earliest' }]);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      const from = 17;
      const to = 50;
      res = await eth_getLogs([{ fromBlock: from, toBlock: 'latest' }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);
    });

    it('returns correct error code and messge for invalid tag', async () => {
      const res = await eth_getLogs([{ fromBlock: 'polkadot' }]);
      expect(res.status).to.equal(200);
      expect(res.data.error.code).to.equal(-32602);
      expect(res.data.error.message).to.contain("blocktag should be number | 'latest' | 'earliest'");
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
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ topics: ['XXX'] }]);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      res = await eth_getLogs([{ topics: log1.topics }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log1.topics.includes(t)));
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ topics: log2.topics }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log2.topics.includes(t)));
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ topics: log3.topics }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log3.topics.includes(t)));
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);
    });
  });
});

describe('eth_getTransactionByHash', () => {
  const eth_getTransactionByHash = rpcGet('eth_getTransactionByHash');

  it('finds correct tx when hash exist', async () => {
    const allTxReceipts = await getAllTxReceipts();
    const tx1 = allTxReceipts[0];
    const tx2 = allTxReceipts[allTxReceipts.length - 1];
    const tx3 = allTxReceipts[Math.floor(allTxReceipts.length / 2)];

    // test first one
    let res = await eth_getTransactionByHash([tx1.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.hash).to.equal(tx1.transactionHash);

    // test last one
    res = await eth_getTransactionByHash([tx2.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.hash).to.equal(tx2.transactionHash);

    // test middle one
    res = await eth_getTransactionByHash([tx3.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.hash).to.equal(tx3.transactionHash);
  });

  it('return correct error code and messge', async () => {
    let res;

    /* ---------- invalid hex address ---------- */
    res = await eth_getTransactionByHash(['0x000']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(-32602);
    expect(res.data.error.message).to.contain('invalid argument');

    /* ---------- hash not found ---------- */
    res = await eth_getTransactionByHash(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(6969);
    expect(res.data.error.message).to.contain('transaction hash not found');
  });
});

describe('eth_accounts', () => {
  const eth_accounts = rpcGet('eth_accounts');

  it('returns empty array', async () => {
    const res = await eth_accounts([]);
    expect(res.status).to.equal(200);
    expect(res.data.result).to.deep.equal([]);
  });
});
