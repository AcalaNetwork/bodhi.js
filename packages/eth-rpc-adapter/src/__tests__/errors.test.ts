import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { Contract, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { describe, expect, it } from 'vitest';
import { parseEther } from 'ethers/lib/utils';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import TokenABI from '@acala-network/contracts/build/contracts/Token.json';
import axios from 'axios';

import { RPC_URL, eth_call, eth_chainId, eth_estimateGas, eth_getEthGas, eth_sendRawTransaction , evmAccounts } from './utils';

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
        data: 'Inability to pay some fees (e.g. account balance too low)',
        message: '1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low',
      },
    });

    res = await eth_sendRawTransaction([rawTx]);
    expect(res.data).to.deep.equal({
      id: 0,
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: '1012: Transaction is temporarily banned',
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

  it('correct error format for contract revert', async () => {
    const { error } = (await eth_call([{
      to: '0x0000000000000000000100000000000000000000',
      data: '0x23b872dd0000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000003e8',
    }, 'latest'])).data;

    expect(error).to.deep.equal({
      code: -32603,
      data: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001d45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000',
      message: 'execution reverted: ERC20: insufficient allowance',
    });
  });

  describe('throws outOfGas error when gaslimit too small', () => {
    const provider = new AcalaJsonRpcProvider(RPC_URL);
    const wallet = new Wallet(evmAccounts[0].privateKey, provider);
    const aca = new Contract(ADDRESS.ACA, TokenABI.abi, wallet);

    it('when eth call', async () => {
      const tx = await aca.populateTransaction.transfer(evmAccounts[1].evmAddress, parseEther('1.32'));
      const { error } = (await eth_call([{ ...tx, gas: 0 }, 'latest'])).data;

      expect(error).toMatchInlineSnapshot(`
        {
          "code": -32603,
          "message": "execution error: outOfGas",
        }
      `);
    });

    it('when estimateGas', async () => {
      const tx = await aca.populateTransaction.transfer(evmAccounts[1].evmAddress, parseEther('1.32'));
      const { error } = (await eth_estimateGas([{ ...tx, gas: 0 }, 'latest'])).data;

      expect(error).toMatchInlineSnapshot(`
        {
          "code": -32603,
          "message": "execution error: outOfGas",
        }
      `);
    });

    it('when send raw transaction', async () => {
      const tx = await aca.populateTransaction.transfer(evmAccounts[1].evmAddress, parseEther('1.32'));
      const signedTx = await wallet.signTransaction({ ...tx, gasLimit: 0 });

      const { error } = (await eth_sendRawTransaction([signedTx])).data;
      expect(error).toMatchInlineSnapshot(`
        {
          "code": -32603,
          "message": "execution error: outOfGas",
        }
      `);
    });

    it('when send transaction with ethers', async () => {
      try {
        await aca.transfer(evmAccounts[1].evmAddress, parseEther('1.32'), { gasLimit: 0 });
        expect.fail('did not throw an err');
      } catch (err) {
        expect((err as any).error).toMatchInlineSnapshot('[Error: execution error: outOfGas]');
      }
    });
  });
});
