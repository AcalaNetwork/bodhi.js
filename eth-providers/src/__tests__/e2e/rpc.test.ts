import { expect } from 'chai';
import { EvmRpcProvider } from '../../rpc-provider';

const endpoint = 'ws://127.0.0.1:9944';

const provider = EvmRpcProvider.from(endpoint);

describe('rpc test', () => {
  before(async () => {
    await provider.isReady();
  });

  after(async () => {
    await provider.disconnect();
  });

  it('chainId', async () => {
    const result = await provider.chainId();
    expect(result).to.equal(595);
  });

  it('getTransactionCount', async () => {
    const result = await provider.getTransactionCount('0x33f9440ff970496a09e391f3773a66f1e98eb13c', 'latest');
    expect(result).to.not.be.undefined;
  });

  it('getCode', async () => {
    const result1 = await provider.getCode('0x1000000000000000000000000000000000000802');

    expect(result1).to.equal('0x');

    const result2 = await provider.getCode('0x0000000000000000000000000000000000000802');

    expect(result2.length > 2).to.be.true;
  });

  it('call', async () => {
    const result = await provider.call({
      data: '0x70a0823100000000000000000000000033f9440ff970496a09e391f3773a66f1e98eb13c',
      from: '0x33f9440ff970496a09e391f3773a66f1e98eb13c',
      to: '0xbffb25b73c6a0581a28988ce34c9f240d525b152'
    });

    expect(result).to.not.be.undefined;
  });

  it('getBalance', async () => {
    const result = await provider.getBalance('0x33f9440ff970496a09e391f3773a66f1e98eb13c');

    expect(result.toString()).to.equal('0');
  });

  it('getBlockByNumber', async () => {
    try {
      const result = await provider._getBlockHeader(
        '0xff2d5d74f16df09b810225ffd9e1442250914ae6de9459477118d675713c732c'
      );
    } catch (error) {
      expect(error.message === 'header not found');
    }
  });
});
