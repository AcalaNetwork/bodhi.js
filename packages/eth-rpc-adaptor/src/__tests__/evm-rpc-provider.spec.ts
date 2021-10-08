import { EvmRpcProvider } from '../evm-rpc-provider';

const endpoint = 'wss://mandala6.laminar.codes/';

describe('EvmRpcProvider', () => {
  it('connect chain', async () => {
    const provider = new EvmRpcProvider(endpoint);
    await provider.isReady();
    expect(provider.isConnected).toBeTruthy();
    await provider.disconnect();
  });

  it('connect random', async () => {
    try {
      const provider = new EvmRpcProvider('ws://192.-');
      await provider.isReady();
    } catch (e) {
      expect((e as any).type).toEqual('error');
    }
  });

  it('getBlockTag', async () => {
    const provider = new EvmRpcProvider('wss://mandala6.laminar.codes/');
    await provider.isReady();
    const blockHash = await provider._getBlockTag('0x123');

    expect(blockHash.length).toBe(66);
  });
});
