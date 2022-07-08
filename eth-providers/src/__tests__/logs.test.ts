import { expect } from 'chai';
import { filterLog } from '../utils';

describe('filterLog', () => {
  const topic1 = '0x11111111111111111111111111111111111111111111111111111111111111aA';
  const topic2 = '0x22222222222222222222222222222222222222222222222222222222222222bB';
  const topic3 = '0x33333333333333333333333333333333333333333333333333333333333333cC';

  const addr1 = '0xAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const addr2 = '0xBbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const addr3 = '0xCccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

  const partialLog = {
    logIndex: '0x0',
    transactionIndex: '0x0',
    transactionHash: '0xfd4ab44cad28fb7902faf7db76a7f475c5d65c6758c8ed9907d7c8351d53bd98',
    blockHash: '0x2b77e91ddb94c8a37d21dd22c0fdf53481a97517de3146cd526868f106cf5e60',
    blockNumber: '0x98765',
    data: '0x12345',
    type: 'mined'
  };

  const log1 = {
    address: addr1,
    topics: [topic1],
    ...partialLog
  };

  const log2 = {
    address: addr2,
    topics: [topic1, topic2, topic3],
    ...partialLog
  };

  const goodAddrFilter2 = [
    [],
    addr2,
    addr2.toUpperCase(),
    [addr2],
    [addr2, addr2],
    [addr2, addr1],
    [addr2.toLowerCase(), addr1]
  ];

  const badAddrFilter2 = [addr1, [addr1], [addr3, addr1], addr1.toUpperCase(), [addr3.toLowerCase(), addr1]];

  const goodTopicsFilter1 = [
    [],
    [null],
    [[]],
    [[], null, [], null],
    [[], null, [], null, 'overflowwwwwwwww', 'overflowwwwwwwww', 'overflowwwwwwwww'],
    [topic1],
    [[topic1]],
    [[topic2, topic1, 'xxxxx']],
    [topic1.toUpperCase()],
    [topic1, null]
  ];

  const badTopicsFilter1 = [[topic2], [topic1, topic2], [null, [topic1]], [null, [topic2]]];

  const goodTopicsFilter2 = [
    [],
    [null],
    [[]],
    [[], null, [], null],
    [null, null, null],
    [[], null, [], null, 'overflowwwwwwwww', 'overflowwwwwwwww', 'overflowwwwwwwww'],
    [topic1],
    [topic1, topic2.toUpperCase(), null, [], 'overflowwwwwwwww'],
    [topic1.toUpperCase(), topic2, topic3],
    [null, topic2, topic3],
    [[topic2, topic1, 'xxxxx'], null, topic3, [], 'overflowwwwwwwww'],
    [topic1.toUpperCase(), [topic2, topic1, 'xxxxx'], [], [], [], []],
    [null, topic2, [topic3], []],
    [[topic2, topic1, 'xxxxx'], null, [topic3], []]
  ];

  const badTopicsFilter2 = [
    [topic3],
    [[topic3]],
    [[topic3], null, []],
    [topic1, topic3],
    [null, ['xxxxx']],
    [null, null, null, ['xxxxx']]
  ];

  it('when no filter', () => {
    expect(filterLog(log1, {})).to.equal(true);
    expect(filterLog(log2, {})).to.equal(true);
  });

  it('filter by address', () => {
    for (const address of goodAddrFilter2) {
      expect(filterLog(log2, { address })).to.equal(true);
    }

    for (const address of badAddrFilter2) {
      expect(filterLog(log2, { address })).to.equal(false);
    }
  });

  it('filter by topics', () => {
    for (const topics of goodTopicsFilter1) {
      expect(filterLog(log1, { topics })).to.equal(true);
    }

    for (const topics of badTopicsFilter1) {
      expect(filterLog(log1, { topics })).to.equal(false);
    }

    for (const topics of goodTopicsFilter2) {
      expect(filterLog(log2, { topics })).to.equal(true);
    }

    for (const topics of badTopicsFilter2) {
      expect(filterLog(log2, { topics })).to.equal(false);
    }
  });

  it('filter by topics and logs', () => {
    for (const address of goodAddrFilter2) {
      for (const topics of goodTopicsFilter2) {
        expect(filterLog(log2, { address, topics })).to.equal(true);
      }
    }

    for (const address of badAddrFilter2) {
      for (const topics of goodTopicsFilter2) {
        expect(filterLog(log2, { address, topics })).to.equal(false);
      }
    }

    for (const address of goodAddrFilter2) {
      for (const topics of badTopicsFilter2) {
        expect(filterLog(log2, { address, topics })).to.equal(false);
      }
    }

    for (const address of badAddrFilter2) {
      for (const topics of badTopicsFilter2) {
        expect(filterLog(log2, { address, topics })).to.equal(false);
      }
    }
  });
});
