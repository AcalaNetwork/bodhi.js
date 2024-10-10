import { Eip1193Bridge } from '../eip1193-bridge';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, describe, expect, it } from 'vitest';

import { NODE_URL, evmAccounts } from './utils';

describe('e2e test', async () => {
  const signer = new Wallet(evmAccounts[0].privateKey);
  const provider = EvmRpcProvider.from(NODE_URL);
  await provider.isReady();

  afterAll(async () => {
    await provider.disconnect();
  });

  const bridge = new Eip1193Bridge(provider, signer);

  it('eth_getBlockByNumber latest', async () => {
    const result = await bridge.send('eth_getBlockByNumber', ['latest', false]);

    expect(typeof result.number).equal('string');
  });

  it('eth_getBlockByNumber u32', async () => {
    await expect(bridge.send('eth_getBlockByNumber', ['0xffffffff', false])).resolves.toBeNull();

    await expect(bridge.send('eth_getBlockByNumber', ['0x1ffffffff', false])).rejects.toThrowError(
      'block number should be less than u32'
    );
  });

  it('eth_getBlockByHash', async () => {
    const latest = await bridge.send('eth_getBlockByNumber', ['latest', false]);
    const block = await bridge.send('eth_getBlockByHash', [latest.hash, false]);
    expect(block.hash).equal(latest.hash);
  });

  it('eth_getBalance', async () => {
    await expect(
      bridge.send('eth_getBalance', ['0xb00cB924ae22b2BBb15E10c17258D6a2af980421', '0xffffffff'])
    ).rejects.toThrowError('header not found');
  });
});
