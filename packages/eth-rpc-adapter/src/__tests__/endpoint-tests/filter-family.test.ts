import { beforeAll, describe, expect, it } from 'vitest';

import { Contract } from 'ethers';
import {
  TRANSFER_EVENT_TOPIC,
  deployErc20,
  eth_blockNumber,
  eth_getFilterChanges,
  eth_getLogs,
  eth_newFilter,
  eth_uninstallFilter,
  getCurBlockHash,
  testSetup,
} from '../utils';

const {
  wallets: [wallet, wallet1],
  provider,
} = testSetup;

describe('eth_newFilter', () => {
  let token: Contract;
  const dummyId = '0x12345678906f9c864d9db560d72a247c178ae86b';
  let startBlockNum: number;
  let fid0: string;
  let fid1: string;
  let fid2: string;
  let fid3: string;

  const feedTx = async () => token.transfer(wallet1.address, 11122233);

  beforeAll(async () => {
    token = await deployErc20(wallet);

    startBlockNum = await provider.getBlockNumber();

    fid0 = (await eth_newFilter([{}])).data.result; // only pull once at the end

    fid1 = (
      await eth_newFilter([
        {
          // normal log poll
          address: token.address,
          topics: [
            TRANSFER_EVENT_TOPIC,
            null,
            null,
          ],
        },
      ])
    ).data.result;

    fid2 = (
      await eth_newFilter([
        {
          // normal log poll
          address: token.address,
          fromBlock: startBlockNum,
          toBlock: startBlockNum + 3,
        },
      ])
    ).data.result;

    fid3 = (
      await eth_newFilter([
        {
          // empty
          fromBlock: 3,
          toBlock: 100,
        },
      ])
    ).data.result;
  });

  it('poll immediately', async () => {
    const res1 = (await eth_getFilterChanges([fid1])).data.result;
    const res2 = (await eth_getFilterChanges([fid2])).data.result;
    const res3 = (await eth_getFilterChanges([fid3])).data.result;

    expect([res1, res2, res3]).to.deep.equal([[], [], []]);
  });

  it('get correct result', async () => {
    /* ---------- fire 1 tx ---------- */
    await (await feedTx()).wait();

    let res1 = (await eth_getFilterChanges([fid1])).data.result;
    let res2 = (await eth_getFilterChanges([fid2])).data.result;
    let res3 = (await eth_getFilterChanges([fid3])).data.result;

    const curBlockHash = await getCurBlockHash();
    let expectedLogs = (await eth_getLogs([{ blockHash: curBlockHash }])).data.result;

    expect(expectedLogs.length).to.equal(1);
    expect(res1).to.deep.equal(expectedLogs);
    expect(res2).to.deep.equal(expectedLogs);
    expect(res3).to.deep.equal([]);

    /* ---------- fire many tx ---------- */
    const txCount = 5;
    for (let i = 0; i < txCount; i++) {
      await (await feedTx()).wait();
    }

    const res0 = (await eth_getFilterChanges([fid0])).data.result;
    res1 = (await eth_getFilterChanges([fid1])).data.result;
    res2 = (await eth_getFilterChanges([fid2])).data.result;
    res3 = (await eth_getFilterChanges([fid3])).data.result;

    const curHeight = Number((await eth_blockNumber()).data.result);
    expectedLogs = (
      await eth_getLogs([
        {
          fromBlock: curHeight - txCount,
          toBlock: curHeight,
        },
      ])
    ).data.result;

    console.log({
      expectedLogs,
      curHeight,
    });

    expect(expectedLogs.length).to.equal(txCount + 1); // + 1 because it's all logs, which conains the one in prev test
    expect(res0).to.deep.equal(expectedLogs);
    expect(res1).to.deep.equal(expectedLogs.slice(1));
    // it's range is [x, x + 3], x is original block, x + 1 is prev test, now only poll for x + 2 and x + 3, so has 2 logs
    expect(res2).to.deep.equal(expectedLogs.slice(1, 3));
    expect(res3).to.deep.equal([]);
  });

  it('unsubscribe works', async () => {
    const unsub = (await eth_uninstallFilter([fid0])).data.result;
    const unsub2 = (await eth_uninstallFilter([fid0])).data.result;
    const unsub3 = (await eth_uninstallFilter([dummyId])).data.result;

    expect(unsub).to.equal(true);
    expect(unsub2).to.equal(false);
    expect(unsub3).to.equal(false);

    await (await feedTx()).wait();

    const res1 = (await eth_getFilterChanges([fid1])).data.result;
    const res2 = (await eth_getFilterChanges([fid2])).data.result;
    const res3 = (await eth_getFilterChanges([fid3])).data.result;

    const curBlockHash = await getCurBlockHash();
    const expectedLogs = (await eth_getLogs([{ blockHash: curBlockHash }])).data.result;

    // all other filters should still work
    expect(expectedLogs.length).to.equal(1);
    expect(res1).to.deep.equal(expectedLogs);
    expect(res2).to.deep.equal([]); // now block range doesn't match anymore (cannot skip previous test)
    expect(res3).to.deep.equal([]);

    // target should be removed
    const res0 = await eth_getFilterChanges([fid0]);
    expect(res0.data.error.message).to.contains('filter not found');
  });

  it.skip('throws correct error messege', async () => {
    // tested in eth_newBlockFilter
  });
});
