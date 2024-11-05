import { describe, expect, it } from 'vitest';

import { deployErc20, eth_getBlockByHash, eth_getBlockByNumber, testSetup } from '../utils';

const { wallet, provider } = testSetup;

describe('eth_getBlockByNumber and eth_getBlockByHash', () => {
  it('get correct block info', async () => {
    const token = await deployErc20(wallet);
    const txHash = token.deployTransaction.hash;

    const curBlockNumber = await provider.getBlockNumber();

    const res = (await eth_getBlockByNumber([curBlockNumber, false])).data.result;
    const resFull = (await eth_getBlockByNumber([curBlockNumber, true])).data.result;

    expect(Number(res.number)).toEqual(curBlockNumber);
    expect(res.transactions[0]).to.eq(txHash);

    expect(Number(resFull.number)).toEqual(curBlockNumber);
    expect(resFull.transactions[0]).to.contain({
      hash: txHash,
      from: wallet.address.toLowerCase(),
      to: null,
      value: '0x0',
    });

    // getblockbyhash should return the same result
    const resHash = (await eth_getBlockByHash([resFull.hash, false])).data.result;
    const resHashFull = (await eth_getBlockByHash([resFull.hash, true])).data.result;

    expect(resHash).to.deep.equal(res);
    expect(resHashFull).to.deep.equal(resFull);
  });

  it('returns null when block not found', async () => {
    const res = (await eth_getBlockByNumber([0x12345678, false])).data.result;
    expect(res).toBeNull();
  });
});
