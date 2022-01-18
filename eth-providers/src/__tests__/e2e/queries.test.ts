import { Log } from '@ethersproject/abstract-provider';
import { expect } from 'chai';
import { getAllLogs, getAllTxReceipts, getFilteredLogs, getTxReceiptByHash, getIndexerMetadata } from '../../utils';
import dotenv from 'dotenv';

dotenv.config();

// this is not necessary, but we could delay running these tests in automated tests
// which will give subql some extra time, making sure it picked up all previous TXs
const START_DELAY = process.env.START_DELAY * 1000 || 0;

export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));

describe('getIndexerMetadata', () => {
  it('returns indexer metadata', async () => {
    const res = await getIndexerMetadata();

    expect(res).not.null;
  });
});

describe('getTxReceiptByHash', () => {
  it('returns correct result when hash exist', async () => {
    await sleep(START_DELAY);
    const allTxReceipts = await getAllTxReceipts();

    expect(allTxReceipts.length).to.greaterThan(0);

    // test first one
    let txR = allTxReceipts[0];
    let res = await getTxReceiptByHash(txR.transactionHash);
    expect(res).to.deep.equal(txR);

    // test last one
    txR = allTxReceipts[allTxReceipts.length - 1];
    res = await getTxReceiptByHash(txR.transactionHash);
    expect(res).to.deep.equal(txR);

    // test middle one
    txR = allTxReceipts[Math.floor(allTxReceipts.length / 2)];
    res = await getTxReceiptByHash(txR.transactionHash);
    expect(res).to.deep.equal(txR);
  });

  it('returns null when hash not found', async () => {
    const res = await getTxReceiptByHash('0x000');
    expect(res).to.deep.equal(null);
  });
});

export const logsEq = (a: Log[], b: Log[]): boolean =>
  a.length === b.length &&
  a.every(({ transactionHash: t0, logIndex: l0 }) =>
    b.find(({ transactionHash: t1, logIndex: l1 }) => t0 === t1 && l0 === l1)
  );

describe('getFilteredLogs', () => {
  describe('when no filter', () => {
    it('returns all logs', async () => {
      const allLogs = await getAllLogs();
      const filteredLogs = await getFilteredLogs({});

      expect(logsEq(filteredLogs, allLogs)).to.equal(true);
    });
  });

  describe('filter by address', () => {
    it('returns correct logs', async () => {
      const allLogs = await getAllLogs();
      const log1 = allLogs[0];
      const log2 = allLogs[allLogs.length - 1];
      const log3 = allLogs[Math.floor(allLogs.length / 2)];
      let filteredLogs;
      let expectedLogs;

      /* ---------- single address ---------- */
      filteredLogs = await getFilteredLogs({ address: log1.address });
      expectedLogs = allLogs.filter((l) => l.address === log1.address);
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ address: log2.address });
      expectedLogs = allLogs.filter((l) => l.address === log2.address);
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ address: log3.address });
      expectedLogs = allLogs.filter((l) => l.address === log3.address);
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      /* ---------- multiple address ---------- */
      // TODO: interestingly, current Filter type says address can only be string
      // can support string[] filter if we needed in the future
    });
  });

  describe('filter by block number', () => {
    it('returns correct logs', async () => {
      const BIG_NUMBER = 88888888;
      const allLogs = await getAllLogs();
      let filteredLogs;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      filteredLogs = await getFilteredLogs({ fromBlock: 0 });
      expect(logsEq(filteredLogs, allLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ toBlock: BIG_NUMBER });
      expect(logsEq(filteredLogs, allLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ fromBlock: 0, toBlock: BIG_NUMBER });
      expect(logsEq(filteredLogs, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      filteredLogs = await getFilteredLogs({ fromBlock: 99999 });
      expect(filteredLogs).to.deep.equal([]);

      filteredLogs = await getFilteredLogs({ toBlock: -1 });
      expect(filteredLogs).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      const from = 16;
      const to = 6000;
      filteredLogs = await getFilteredLogs({ fromBlock: from });
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ toBlock: to });
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ fromBlock: from, toBlock: to });
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);
    });
  });

  describe('filter by topics', () => {
    it('returns correct logs', async () => {
      const allLogs = await getAllLogs();
      const log1 = allLogs[0];
      const log2 = allLogs[allLogs.length - 1];
      const log3 = allLogs[Math.floor(allLogs.length / 2)];
      let filteredLogs;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      filteredLogs = await getFilteredLogs({ topics: [] });
      expect(logsEq(filteredLogs, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      filteredLogs = await getFilteredLogs({ topics: ['XXX'] });
      expect(filteredLogs).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      filteredLogs = await getFilteredLogs({ topics: log1.topics });
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log1.topics.includes(t)));
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ topics: log2.topics });
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log2.topics.includes(t)));
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);

      filteredLogs = await getFilteredLogs({ topics: log3.topics });
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log3.topics.includes(t)));
      expect(logsEq(filteredLogs, expectedLogs)).to.equal(true);
    });
  });
});
