import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EvmRpcProvider } from '../../rpc-provider';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

const provider = EvmRpcProvider.from(endpoint);

chai.use(chaiAsPromised);

const { expect } = chai;

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
    await expect(
      provider._getBlockHeader('0xff2d5d74f16df09b810225ffd9e1442250914ae6de9459477118d675713c732c')
    ).to.be.rejectedWith('header not found');
  });

  // Working only on the test network,
  it('get earlier blocks', async () => {
    const endpoint = 'wss://mandala-tc7-rpcnode.aca-dev.network/ws';
    const provider = EvmRpcProvider.from(endpoint);

    const result = await provider.getBlock('0x1F147', true);

    expect(result.hash).equal('0xa768823dc5f64211a53f0f4e609b16813967642345327d9e7e3c94d7e1c5a633');
  });
});
