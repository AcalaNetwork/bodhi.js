import { beforeAll, describe, expect, it } from 'vitest';

import { Contract } from 'ethers';
import {
  LogHexified,
  deployErc20,
  eth_getLogs,
  expectLogsEqual,
  testSetup,
} from '../utils';

const {
  provider,
  wallets: [wallet, wallet1, wallet2, wallet3],
} = testSetup;

describe('eth_getLogs', () => {
  let token0: Contract;
  let token1: Contract;
  let allLogs: LogHexified[];
  // const ALL_BLOCK_RANGE_FILTER = { fromBlock: 'earliest' };    // TODO: use me when subql is ready
  let ALL_BLOCK_RANGE_FILTER;

  beforeAll(async () => {
    token0 = await deployErc20(wallet);
    token1 = await deployErc20(wallet);

    const earliestBlock = await provider.getBlockNumber();
    ALL_BLOCK_RANGE_FILTER = { fromBlock: earliestBlock };

    await (await token0.transfer(wallet1.address, 1000)).wait();
    await (await token1.transfer(wallet2.address, 2000)).wait();
    await (await token0.transfer(wallet3.address, 3000)).wait();

    allLogs = (await eth_getLogs([ALL_BLOCK_RANGE_FILTER])).data.result;
    expect(allLogs.length).to.equal(3);
  });

  describe.concurrent('when no filter', () => {
    it('returns all logs from latest block', async () => {
      const curBlockNum = await provider.getBlockNumber();

      const res = (await eth_getLogs([{}])).data.result;
      expect(res.length).to.equal(1);
      expect(Number(res[0].blockNumber)).to.equal(curBlockNum);
    });
  });

  describe.concurrent('filter by address', () => {
    it('returns correct logs', async () => {
      /* ---------- single address ---------- */
      for (const log of allLogs) {
        const res = await eth_getLogs([{ address: log.address, ...ALL_BLOCK_RANGE_FILTER }]);
        const expectedLogs = allLogs.filter(l => l.address === log.address);
        expectLogsEqual(res.data.result, expectedLogs);
      }

      // should support different case and array of addresses
      for (const log of allLogs) {
        const res = await eth_getLogs([
          { address: [log.address.toLocaleUpperCase(), '0x13579'], ...ALL_BLOCK_RANGE_FILTER },
        ]);
        const expectedLogs = allLogs.filter(l => l.address === log.address);
        expectLogsEqual(res.data.result, expectedLogs);
      }
    });
  });

  describe.concurrent('filter by blockhash', () => {
    it('returns correct logs', async () => {
      for (const log of allLogs) {
        const res = await eth_getLogs([{ blockHash: log.blockHash }]);
        const expectedLogs = allLogs.filter(l => l.blockNumber === log.blockNumber);
        expectLogsEqual(res.data.result, expectedLogs);
      }
    });
  });

  // TODO: enable me when subql is ready
  describe.concurrent.skip('filter by block number', () => {
    it('returns correct logs', async () => {
      const BIG_NUMBER = 88888888;
      const BIG_NUMBER_HEX = '0x54C5638';

      let res: Awaited<ReturnType<typeof eth_getLogs>>;
      let expectedLogs: LogHexified[];

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ ...ALL_BLOCK_RANGE_FILTER }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: 0 }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: -100000, toBlock: BIG_NUMBER }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: -100000, toBlock: BIG_NUMBER_HEX }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: 0, toBlock: 'latest' }]);
      expectLogsEqual(res.data.result, allLogs);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 99999 }]);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ toBlock: -1 }]);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return partial logs ---------- */
      const from = 9;
      const to = 11;
      res = await eth_getLogs([{ fromBlock: from }]);
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from);
      expectLogsEqual(res.data.result, expectedLogs);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) <= to);
      expectLogsEqual(res.data.result, expectedLogs);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from && parseInt(l.blockNumber) <= to);
      expectLogsEqual(res.data.result, expectedLogs);
    });
  });

  // TODO: enable me when subql is ready
  describe.concurrent.skip('filter by block tag', () => {
    it('returns correct logs for valid tag', async () => {
      let res: Awaited<ReturnType<typeof eth_getLogs>>;
      let expectedLogs: LogHexified[];

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'earliest' }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: 0 }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: '0x0' }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: '0x00000000' }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 'latest' }]);
      expectLogsEqual(res.data.result, allLogs);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 'earliest' }]);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 5 }]);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ fromBlock: 'latest', toBlock: '0x5' }]);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ fromBlock: 8, toBlock: 'earliest' }]);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      const from = 8;
      const to = 10;
      res = await eth_getLogs([{ fromBlock: from, toBlock: 'latest' }]);
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from);
      expectLogsEqual(res.data.result, expectedLogs);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) <= to);
      expectLogsEqual(res.data.result, expectedLogs);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from && parseInt(l.blockNumber) <= to);
      expectLogsEqual(res.data.result, expectedLogs);
    });
  });

  describe.concurrent('filter by topics', () => {
    it('returns correct logs', async () => {
      let res: Awaited<ReturnType<typeof eth_getLogs>>;
      let expectedLogs: LogHexified[];

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ topics: [], ...ALL_BLOCK_RANGE_FILTER }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ topics: [[]], ...ALL_BLOCK_RANGE_FILTER }]);
      expectLogsEqual(res.data.result, allLogs);

      res = await eth_getLogs([{ topics: [null, [], null, [], 'hahahahaha', 'hohoho'], ...ALL_BLOCK_RANGE_FILTER }]);
      expectLogsEqual(res.data.result, allLogs);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ topics: ['XXX'], ...ALL_BLOCK_RANGE_FILTER }]);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      for (const log of allLogs) {
        res = await eth_getLogs([{ topics: log.topics, ...ALL_BLOCK_RANGE_FILTER }]);
        expectedLogs = allLogs.filter(
          l => log.topics.length === l.topics.length && log.topics.every((t, i) => l.topics[i] === t)
        );
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ topics: [log.topics[0]], ...ALL_BLOCK_RANGE_FILTER }]);
        expectedLogs = allLogs.filter(l => l.topics[0] === log.topics[0]);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([
          { topics: [['ooo', log.topics[0], 'xxx', 'yyy'], null, []], ...ALL_BLOCK_RANGE_FILTER },
        ]);
        expectedLogs = allLogs.filter(l => l.topics[0] === log.topics[0]);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([
          { topics: [...new Array(log.topics.length - 1).fill(null), log.topics.at(-1)], ...ALL_BLOCK_RANGE_FILTER },
        ]);
        expectedLogs = allLogs.filter(l => l.topics[log.topics.length - 1] === log.topics.at(-1));
        expectLogsEqual(res.data.result, expectedLogs);
      }
    });
  });

  // TODO: enable me when subql is ready
  describe.concurrent.skip('filter by multiple params', () => {
    it('returns correct logs', async () => {
      let res: Awaited<ReturnType<typeof eth_getLogs>>;
      let expectedLogs: LogHexified[];
      const allLogsFromSubql = await subql.getAllLogs().then(logs => logs.map(hexilifyLog));
      /* -------------------- match block range -------------------- */
      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= 8 && parseInt(l.blockNumber) <= 11);
      res = await eth_getLogs([{ fromBlock: 8, toBlock: 11, topics: [[], null, []] }]);
      expectLogsEqual(res.data.result, expectedLogs);

      expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) <= 15);
      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 15, topics: [[], null, []] }]);
      expectLogsEqual(res.data.result, expectedLogs);

      for (const log of allLogsFromSubql) {
        /* -------------------- match blockhash -------------------- */
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) === parseInt(log.blockNumber));
        res = await eth_getLogs([{ blockHash: log.blockHash, topics: [[], null, []] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        /* -------------------- match first topic -------------------- */
        expectedLogs = allLogs.filter(
          l => parseInt(l.blockNumber) === parseInt(log.blockNumber) && l.topics[0] === log.topics[0]
        );
        res = await eth_getLogs([{ blockHash: log.blockHash, topics: [[log.topics[0], 'xxx'], null, []] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        /* -------------------- match range and topics -------------------- */
        expectedLogs = allLogs.filter(
          l => parseInt(l.blockNumber) >= 8 && parseInt(l.blockNumber) <= 15 && l.topics[0] === log.topics[0]
        );
        res = await eth_getLogs([{ fromBlock: 8, toBlock: 15, topics: [['xxx', log.topics[0]]] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        /* -------------------- no match -------------------- */
        res = await eth_getLogs([{ blockHash: log.blockHash, topics: ['0x12345'] }]);
        expect(res.data.result).to.deep.equal([]);

        res = await eth_getLogs([{ blockHash: log.blockHash, topics: [log.topics[0], 'xxx'] }]);
        expect(res.data.result).to.deep.equal([]);
      }
    });
  });

  // TODO: enable me when subql is ready
  describe.skip('get latest logs', async () => {
    let token: Contract;

    beforeAll(async () => {
      // need to put in here to prevent interrupte deterministic setup
      token = await deployErc20(wallet);
      await token.deployed();
    });

    it('should return latest logs as soon as it\'s finalized, and should not hang if toBlock is large', async () => {
      const curHeight = await provider.getBlockNumber();
      await (await token.transfer(ADDRESS_ALICE, 1000)).wait();

      // should return latest logs as soon as it's finalized
      const targetHeight = curHeight + 1;
      await waitForHeight(provider, targetHeight);    // instant-sealing: best height = finalized height
      const res = await eth_getLogs([{ fromBlock: targetHeight, toBlock: targetHeight }]);

      expect(res.data?.result?.length).to.eq(1);
      expect(parseInt(res.data.result[0].blockNumber, 16)).to.eq(targetHeight);

      // should not hang if toBlock is large
      const res2 = await eth_getLogs([{ fromBlock: targetHeight, toBlock: 9999999999 }]);
      expect(res2.data.result).to.deep.equal(res.data.result);
    });

    it('should return latest logs before subql is synced', async () => {
      const curHeight = await provider.getBlockNumber();

      for (let i = 0; i < 5; i++) {
        const tx = await token.transfer(ADDRESS_ALICE, 1000);
        await tx.wait();
      }

      const targetHeight = curHeight + 5;
      await waitForHeight(provider, targetHeight);
      const res = await eth_getLogs([{ fromBlock: targetHeight, toBlock: targetHeight }]);

      expect(res.data?.result?.length).to.eq(1);
      expect(parseInt(res.data.result[0].blockNumber, 16)).to.eq(targetHeight);
    });
  });
});
