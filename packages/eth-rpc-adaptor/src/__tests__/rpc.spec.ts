import { EvmRpcProvider } from '../evm-rpc-provider';

const endpoint = 'wss://mandala6.laminar.codes/';

const provider = new EvmRpcProvider(endpoint);

describe('rpc test', () => {
  beforeAll(async () => {
    await provider.isReady();
  });

  afterAll(async () => {
    await provider.disconnect();
  });

  it('chainId', async () => {
    const result = await provider.chainId();
    expect(result).toBeDefined();
  });

  it('getTransactionCount', async () => {
    const result = await provider.getTransactionCount('0x33f9440ff970496a09e391f3773a66f1e98eb13c', 'latest');
    expect(result).toBeDefined();
  });

  it('getCode', async () => {
    const result1 = await provider.getCode('0x1000000000000000000000000000000000000802');

    expect(result1).toBe('0x');

    const result2 = await provider.getCode('0x0000000000000000000000000000000000000802');

    expect(result2.length > 2).toBeTruthy;
  });

  it('call', async () => {
    const result = await provider.call({
      data: '0x70a0823100000000000000000000000033f9440ff970496a09e391f3773a66f1e98eb13c',
      from: '0x33f9440ff970496a09e391f3773a66f1e98eb13c',
      to: '0xbffb25b73c6a0581a28988ce34c9f240d525b152',
    });

    expect(result).toBeDefined();
  });

  it.only('getBalance', async () => {
    const result = await provider.getBalance('0x33f9440ff970496a09e391f3773a66f1e98eb13c');

    expect(result.toString()).toBe('0');
  });
});
