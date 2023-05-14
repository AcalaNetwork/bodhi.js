import { JsonRpcProvider } from '@ethersproject/providers';
import { RPC_URL, rpcGet } from './utils';
import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import axios from 'axios';

const eth_getEthGas = rpcGet('eth_getEthGas', RPC_URL);
const _eth_blockNumber = rpcGet('eth_blockNumber', RPC_URL);
const eth_sendRawTransaction = rpcGet('eth_sendRawTransaction', RPC_URL);
const _eth_getTransactionReceipt = rpcGet('eth_getTransactionReceipt', RPC_URL);
const eth_chainId = rpcGet('eth_chainId', RPC_URL);

describe('errors', () => {
  const POOR_ACCOUNT = '0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd570';
  const poorWallet = new Wallet(POOR_ACCOUNT, new JsonRpcProvider(RPC_URL));

  it('invalid request', async () => {
    const id = 12345;

    const res = await axios.get(RPC_URL, {
      data: {
        id,
        methodddddddd: 'vdhgkjshdbfksdh',
        jsonrpc: '2.0',
      },
    });

    expect(res.data).to.include({
      id,
      jsonrpc: '2.0',
    });
    expect(res.data.error).to.include({
      code: -32600,
      message: 'Invalid request',
    });
  });

  // TODO: after the banned pool is disabled in dev mode, mayve change the endpoint to public one? or manually setup the banned pool time to positive to enable it
  it('tx banned', async () => {
    const [gasRes, chainIdRes, nonce] = await Promise.all([
      eth_getEthGas(),
      eth_chainId(),
      poorWallet.getTransactionCount('pending'),
    ]);

    const chainId = Number(chainIdRes.data.result);
    const gas = gasRes.data.result;

    const tx = {
      to: poorWallet.address,
      data: '0x',
      value: 0,
      chainId,
      nonce,
      ...gas,
    };
    const rawTx = await poorWallet.signTransaction(tx);

    let res = await eth_sendRawTransaction([rawTx]);
    expect(res.data).to.deep.equal({
      id: 0,
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message:
          'internal JSON-RPC error [1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low]. More info: https://evmdocs.acala.network/reference/common-errors',
      },
    });

    res = await eth_sendRawTransaction([rawTx]);
    expect(res.data).to.deep.equal({
      id: 0,
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message:
          'internal JSON-RPC error [1012: Transaction is temporarily banned]. More info: https://evmdocs.acala.network/reference/common-errors',
      },
    });
  });

  it('internal json rpc error', async () => {
    const [gasRes, chainIdRes, nonce] = await Promise.all([
      eth_getEthGas(),
      eth_chainId(),
      poorWallet.getTransactionCount('pending'),
    ]);

    const chainId = Number(chainIdRes.data.result);
    const gas = gasRes.data.result;

    const tx = {
      to: poorWallet.address,
      data: '0x',
      value: 123,
      chainId,
      nonce,
      ...gas,
    };
    const rawTx = await poorWallet.signTransaction(tx);
    const res = await eth_sendRawTransaction([rawTx]);

    expect(res.data.error.message).to.contain('Invalid decimals');
  });
});
