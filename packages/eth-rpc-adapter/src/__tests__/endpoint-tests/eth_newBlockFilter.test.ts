import { beforeAll, describe, expect, it } from 'vitest';

import { Contract } from 'ethers';
import {
  deployErc20,
  eth_getFilterChanges,
  eth_getFilterLogs,
  eth_newBlockFilter,
  eth_uninstallFilter,
  getCurBlockHash,
  testSetup,
} from '../utils';

const {
  wallets: [wallet, wallet1],
} = testSetup;

describe('eth_newBlockFilter', () => {
  let token: Contract;
  let fid0: string;
  let fid1: string;
  const dummyId = '0x12345678906f9c864d9db560d72a247c178ae86b';
  const expectedBlockHashes: string[] = [];
  const allBlockHashes: string[] = [];

  const feedTx = async () => {
    await (await token.transfer(wallet1.address, 1122334455)).wait();
    expectedBlockHashes.push(await getCurBlockHash());
    allBlockHashes.push(await getCurBlockHash());
  };

  beforeAll(async () => {
    token = await deployErc20(wallet);
    fid0 = (await eth_newBlockFilter()).data.result; // only pull once at the end
    fid1 = (await eth_newBlockFilter()).data.result; // normal block poll
  });

  it('poll immediately', async () => {
    const res = (await eth_getFilterChanges([fid1])).data.result;
    expect(res).to.deep.equal([]);
  });

  it('get correct result', async () => {
    /* ---------- fire 1 tx ---------- */
    await feedTx();

    let res = (await eth_getFilterChanges([fid1])).data.result;
    expect(res.length).to.equal(1);
    expect(res).to.deep.equal(expectedBlockHashes);
    expectedBlockHashes.length = 0;

    /* ---------- fire many tx ---------- */
    const txCount = 3;
    for (let i = 0; i < txCount; i++) {
      await feedTx();
    }

    res = (await eth_getFilterChanges([fid1])).data.result;
    let resAll = (await eth_getFilterChanges([fid0])).data.result;
    expect(res.length).to.equal(txCount);
    expect(resAll.length).to.equal(txCount + 1);
    expect(res).to.deep.equal(expectedBlockHashes);
    expect(resAll).to.deep.equal(allBlockHashes);

    // query again should return empty
    res = (await eth_getFilterChanges([fid1])).data.result;
    resAll = (await eth_getFilterChanges([fid0])).data.result;
    expect(res).to.deep.equal([]);
    expect(resAll).to.deep.equal([]);
  });

  it('unsubscribe works', async () => {
    expectedBlockHashes.length = 0;
    const unsub = (await eth_uninstallFilter([fid0])).data.result;
    const unsub2 = (await eth_uninstallFilter([fid0])).data.result;
    const unsub3 = (await eth_uninstallFilter([dummyId])).data.result;

    expect(unsub).to.equal(true);
    expect(unsub2).to.equal(false);
    expect(unsub3).to.equal(false);

    await feedTx();

    // other filter should still work
    let res = (await eth_getFilterChanges([fid1])).data.result;
    expect(res.length).to.equal(1);
    expect(res).to.deep.equal(expectedBlockHashes);

    // target filter should be removed
    res = await eth_getFilterChanges([fid0]);
    expect(res.data.error.message).to.contains('filter not found');
  });

  it('throws correct error', async () => {
    let res = await eth_getFilterChanges([dummyId]);
    expect(res.data.error.message).to.contains('filter not found');

    // eth_getFilterLogs should not find block filter
    res = await eth_getFilterLogs([fid1]);
    expect(res.data.error.message).to.contains('filter not found');
  });
});
