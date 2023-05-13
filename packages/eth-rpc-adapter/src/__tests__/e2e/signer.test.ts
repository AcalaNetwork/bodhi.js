import { Eip1193Bridge } from '../../eip1193-bridge';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Wallet, verifyMessage } from '@ethersproject/wallet';
import { afterAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

describe('eth_accounts', async () => {
  const signer = new Wallet('0x5a214c9bcb10dfe58af9b349cad6f4564cd6f10d880bdfcf780e5812c3cbc855');
  const provider = EvmRpcProvider.from(endpoint);
  await provider.isReady();

  const bridge = new Eip1193Bridge(provider, signer as any);

  it('returns accounts', async () => {
    const result = await bridge.send('eth_accounts');

    expect(result).deep.equal(['0x57a2423D1A30D90cECeC14c3844d88983F70659f']);
  });

  it('sign message', async () => {
    let err: any = {};
    try {
      await bridge.send('eth_sign', ['0xb00cB924ae22b2BBb15E10c17258D6a2af980421', '123']);
    } catch (error) {
      err = error;
    }

    expect(err?.message).equal('account mismatch or account not found');

    const result = await bridge.send('eth_sign', ['0x57a2423D1A30D90cECeC14c3844d88983F70659f', '123']);
    expect(verifyMessage('123', result)).equal('0x57a2423D1A30D90cECeC14c3844d88983F70659f');
  });

  afterAll(async () => {
    await provider.disconnect();
  });
});
