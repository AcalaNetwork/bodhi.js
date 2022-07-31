import { EvmRpcProvider } from '@acala-network/eth-providers';
import dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RpcForward } from '../../rpc-forward';

dotenv.config();

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

describe('rpc forward test', () => {
  const provider = EvmRpcProvider.from(endpoint);

  const rpcForward = new RpcForward(provider);

  beforeAll(async () => {
    await provider.isReady();
    await rpcForward.initRpcMethods();
  });

  it.concurrent('chain_getBlockHash', async () => {
    const result = await rpcForward.send('chain_getBlock', []);
    expect(typeof result.block.extrinsics[0]).equal('string');
  });

  it.concurrent('chain_getBlockHash with params', async () => {
    const result1 = await rpcForward.send('chain_getBlockHash', [0]);
    const result2 = await rpcForward.send('chain_getBlockHash', ['0']);
    const result3 = await rpcForward.send('chain_getBlockHash', [1]);
    expect(typeof result1).equal('string');
    expect(result1).equal(result2);
    expect(result1).not.equal(result3);
  });

  it.concurrent('method does not exist', async () => {
    await expect(rpcForward.send('chain_getBlock_', [])).rejects.toThrow('Method not available');
  });

  it.concurrent('subscribe_newHead', async () => {
    const result = await rpcForward.send('subscribe_newHead', []);
    expect(typeof result).equal('string');
  });

  it.concurrent('rpc_methods', async () => {
    const result = await rpcForward.send('rpc_methods', []);
    expect(Array.isArray(result.methods)).true;
  });

  afterAll(() => {
    provider.disconnect();
  });
});
