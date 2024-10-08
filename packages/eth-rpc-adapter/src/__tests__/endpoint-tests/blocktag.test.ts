import { describe, expect, it } from 'vitest';

import {
  deployErc20,
  eth_getBalance,
  eth_getBlockByNumber,
  eth_getCode,
  eth_getTransactionCount,
  eth_isBlockFinalized,
  testSetup,
} from '../utils';

const { wallet } = testSetup;

describe('finalized/safe/pending blocktag', () => {
  /* ----------
    latest block === finalized block in local setup
                                          ---------- */

  it('eth_getCode', async () => {
    const token = await deployErc20(wallet);

    const res = (await eth_getCode([token.address, 'latest'])).data.result;
    const resF = (await eth_getCode([token.address, 'finalized'])).data.result;
    const resS = (await eth_getCode([token.address, 'safe'])).data.result;
    const resP = (await eth_getCode([token.address, 'pending'])).data.result;

    expect(res).not.to.be.undefined;
    expect(res).to.equal(resF);
    expect(res).to.equal(resS);
    expect(res).to.equal(resP);
  });

  it('eth_getTransactionCount', async () => {
    const res = (await eth_getTransactionCount([wallet.address, 'latest'])).data.result;
    const resF = (await eth_getTransactionCount([wallet.address, 'finalized'])).data.result;
    const resS = (await eth_getTransactionCount([wallet.address, 'safe'])).data.result;

    const token = await deployErc20(wallet, false);
    const resP = (await eth_getTransactionCount([wallet.address, 'pending'])).data.result;

    expect(res).to.equal(resF);
    expect(res).to.equal(resS);
    expect(Number(res)).to.equal(Number(resP) - 1);   // pending should have +1 nonce

    await token.deployed();   // wait for deployment in case it affects next tests

    const resL = (await eth_getTransactionCount([wallet.address, 'latest'])).data.result;
    expect(resL).to.equal(resP);
  });

  it('eth_getBalance', async () => {
    const res = (await eth_getBalance([wallet.address, 'latest'])).data.result;
    const resF = (await eth_getBalance([wallet.address, 'finalized'])).data.result;
    const resS = (await eth_getBalance([wallet.address, 'safe'])).data.result;
    const resP = (await eth_getBalance([wallet.address, 'pending'])).data.result;

    expect(parseInt(res)).to.greaterThan(0);
    expect(res).to.equal(resF);
    expect(res).to.equal(resS);
    expect(res).to.equal(resP);
  });

  it('eth_getBlockByNumber', async () => {
    const res = (await eth_getBlockByNumber(['latest', false])).data.result;
    const resF = (await eth_getBlockByNumber(['finalized', false])).data.result;
    const resS = (await eth_getBlockByNumber(['safe', false])).data.result;
    const resP = (await eth_getBlockByNumber(['pending', false])).data.result;

    expect(res).not.to.be.undefined;
    expect(res).to.deep.equal(resF);
    expect(res).to.deep.equal(resS);
    expect(res).to.deep.equal(resP);
  });

  it('eth_isBlockFinalized', async () => {
    const res = (await eth_isBlockFinalized(['latest'])).data.result;
    const resF = (await eth_isBlockFinalized(['finalized'])).data.result;
    const resS = (await eth_isBlockFinalized(['safe'])).data.result;

    expect(res).to.equal(true);
    expect(res).to.deep.equal(resF);
    expect(res).to.deep.equal(resS);
  });

  // don't care about these
  it.skip('eth_getBlockTransactionCountByNumber', async () => { });
  it.skip('eth_getTransactionByBlockNumberAndIndex', async () => { });
  it.skip('eth_getUncleCountByBlockNumber', async () => { });
  it.skip('eth_getUncleByBlockNumberAndIndex', async () => { });

  // too lazy to test these
  it.skip('eth_call', async () => { });
  it.skip('eth_getStorageAt', async () => { });
});
