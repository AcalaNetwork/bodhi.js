import {
  ACA as ACA_ADDR,
  AUSD as AUSD_ADDR,
  DOT as DOT_ADDR,
  LDOT as LDOT_ADDR,
} from '@acala-network/contracts/utils/AcalaAddress';
import { Interface, parseEther, parseUnits } from 'ethers/lib/utils';
import { describe, expect, it } from 'vitest';

import { BigNumber, Contract, Wallet } from 'ethers';
import {
  deployErc20,
  eth_blockNumber,
  eth_call,
  testSetup,
} from '../utils';
import erc20Abi from '../abis/IERC20.json';

const { wallet } = testSetup;

describe('eth_call', () => {
  const callRequest = (abi: any) => async (address: string, method: string, params?: any[], blockTag?: any) => {
    const iface = new Interface(abi);

    const data = iface.encodeFunctionData(method, params);
    const block = blockTag || (await eth_blockNumber()).data.result;
    const rawRes = (await eth_call([{ to: address, data }, block])).data.result;

    return iface.decodeFunctionResult(method, rawRes);
  };

  const callToken = callRequest(erc20Abi.abi);

  it('get correct procompile token info', async () => {
    const tokenMetaData = [
      {
        address: ACA_ADDR,
        name: 'Acala',
        symbol: 'ACA',
        decimals: 12,
      },
      {
        address: AUSD_ADDR,
        name: 'aUSD SEED',
        symbol: 'aSEED',
        decimals: 12,
      },
      {
        address: DOT_ADDR,
        name: 'Polkadot',
        symbol: 'DOT',
        decimals: 10,
      },
      {
        address: LDOT_ADDR,
        name: 'Liquid DOT',
        symbol: 'LDOT',
        decimals: 10,
      },
    ];

    const tests = tokenMetaData.map(async ({ address, name, symbol, decimals }) => {
      const [_name] = await callToken(address, 'name');
      const [_symbol] = await callToken(address, 'symbol');
      const [_decimals] = await callToken(address, 'decimals');

      expect(_name).to.equal(name);
      expect(_symbol).to.equal(symbol);
      expect(_decimals).to.equal(decimals);
    });

    await Promise.all(tests);
  });

  it('supports calling historical blocks', async () => {
    const token = await deployErc20(wallet);

    const transferAmount = parseUnits('1', 12);
    await (await token.transfer(Wallet.createRandom().address, transferAmount)).wait();

    const curBlockNumber = Number((await eth_blockNumber()).data.result);
    const [beforeBal] = await callToken(token.address, 'balanceOf', [wallet.address], { blockNumber: curBlockNumber - 1 });
    const [afterBal] = await callToken(token.address, 'balanceOf', [wallet.address], { blockNumber: curBlockNumber });
    const [curBal] = await callToken(token.address, 'balanceOf', [wallet.address], 'latest');

    expect(afterBal.toBigInt()).to.equal(curBal.toBigInt());
    expect(beforeBal.sub(transferAmount).toBigInt()).to.equal(afterBal.toBigInt());
  });

  it('throws correct error for invalid tag', async () => {
    const data = '0x123123123';

    expect((await eth_call([{ to: ACA_ADDR, data }, { hahaha: 13542 }])).data.error).to.deep.equal({
      code: -32602,
      message: 'invalid argument 1: invalid eip-1898 blocktag, expected to contain blockNumber or blockHash',
    });

    expect((await eth_call([{ to: ACA_ADDR, data }, { blockHash: 123 }])).data.error).to.deep.equal({
      code: -32602,
      message: 'invalid argument 1: invalid block hash, expected type String',
    });
  });
});
