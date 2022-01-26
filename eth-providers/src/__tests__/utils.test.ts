import { expect } from 'chai';
import { toHex, filterLog } from '../utils';

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

  const log3 = {
    address: addr3,
    topics: [topic3],
    ...partialLog
  };

  it('when no filter', () => {
    expect(filterLog(log1, {})).to.equal(true);
    expect(filterLog(log2, {})).to.equal(true);
  });

  it('filter by address', () => {
    expect(filterLog(log1, { address: addr1 })).to.equal(true);
    expect(filterLog(log1, { address: [addr1] })).to.equal(true);
    expect(filterLog(log1, { address: [addr2, addr1] })).to.equal(true);
    expect(filterLog(log1, { address: addr1.toUpperCase() })).to.equal(true);
    expect(filterLog(log1, { address: [addr2.toLowerCase(), addr1] })).to.equal(true);

    expect(filterLog(log3, { address: addr1 })).to.equal(false);
    expect(filterLog(log3, { address: [addr1] })).to.equal(false);
    expect(filterLog(log3, { address: [addr2, addr1] })).to.equal(false);
  });

  it('filter by topics', () => {
    expect(filterLog(log1, { topics: [topic1] })).to.equal(true);
    expect(filterLog(log1, { topics: [topic1, topic2] })).to.equal(true);
    expect(filterLog(log1, { topics: [null, [topic1], [topic2], null] })).to.equal(true);

    expect(filterLog(log1, { topics: [topic1.toUpperCase()] })).to.equal(true);
    expect(filterLog(log1, { topics: [topic1, topic2.toLowerCase()] })).to.equal(true);
    expect(filterLog(log1, { topics: [null, [topic1.toUpperCase()], [topic2.toLowerCase()], null] })).to.equal(true);

    expect(filterLog(log2, { topics: [topic1] })).to.equal(false);
    expect(filterLog(log2, { topics: [topic1, topic2] })).to.equal(false);
    expect(filterLog(log2, { topics: [null, [topic1], [topic2], null] })).to.equal(false);

    expect(filterLog(log3, { topics: [topic1] })).to.equal(false);
    expect(filterLog(log3, { topics: [topic1, topic2] })).to.equal(false);
    expect(filterLog(log3, { topics: [null, [topic1], [topic2], null] })).to.equal(false);
  });

  it('filter by topics and logs', () => {
    // addr1
    expect(filterLog(log1, { address: addr1, topics: [topic1] })).to.equal(true);
    expect(filterLog(log1, { address: addr1.toUpperCase(), topics: [topic1, topic3.toLowerCase()] })).to.equal(true);
    expect(filterLog(log1, { address: addr1, topics: [null, [topic1.toUpperCase()], [topic2], null] })).to.equal(true);

    expect(filterLog(log1, { address: addr2, topics: [topic1] })).to.equal(false);
    expect(filterLog(log1, { address: addr2, topics: [topic1, topic3] })).to.equal(false);
    expect(filterLog(log1, { address: addr2, topics: [null, [topic1], [topic2], null] })).to.equal(false);
    expect(filterLog(log1, { address: addr1, topics: [topic2] })).to.equal(false);
    expect(filterLog(log1, { address: addr1, topics: [null, [topic2], [topic3], null] })).to.equal(false);

    // addr2
    expect(filterLog(log2, { address: addr2.toLowerCase(), topics: [topic1, topic2.toUpperCase(), topic3] })).to.equal(
      true
    );

    expect(filterLog(log2, { address: addr2, topics: [topic1, topic2] })).to.equal(false);
    expect(filterLog(log2, { address: addr1, topics: [topic1, topic2, topic3] })).to.equal(false);
  });
});

describe('toHex', () => {
  it('return correct hex string', () => {
    expect(toHex(3)).to.equal('0x3');
    expect(toHex(18)).to.equal('0x12');
  });
});
