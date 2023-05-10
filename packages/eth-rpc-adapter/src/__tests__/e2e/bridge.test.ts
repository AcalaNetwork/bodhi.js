import { Eip1193Bridge } from '../../eip1193-bridge';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

describe('e2e test', () => {
  const signer = new Wallet('0x5a214c9bcb10dfe58af9b349cad6f4564cd6f10d880bdfcf780e5812c3cbc855');
  const provider = EvmRpcProvider.from(endpoint);

  beforeAll(async () => {
    await provider.isReady();
  });
  afterAll(async () => {
    await provider.disconnect();
  });

  const bridge = new Eip1193Bridge(provider, signer as any);

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
    await expect(
      bridge.send('eth_getBlockByHash', ['0xff2d5d74f16df09b810225ffd9e1442250914ae6de9459477118d675713c732c', false])
    ).resolves.toBeNull();

    const latest = await bridge.send('eth_getBlockByNumber', ['latest', false]);
    const block = await bridge.send('eth_getBlockByHash', [latest.hash, false]);
    expect(block.hash).equal(latest.hash);
  });

  it('eth_getBalance', async () => {
    await expect(
      bridge.send('eth_getBalance', ['0xb00cB924ae22b2BBb15E10c17258D6a2af980421', '0xffffffff'])
    ).rejects.toThrowError('header not found');
  });

  afterAll(async () => {
    await provider.disconnect();
  });
});
