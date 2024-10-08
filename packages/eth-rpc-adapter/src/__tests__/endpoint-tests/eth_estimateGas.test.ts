import { AcalaJsonRpcProvider, BlockTagish } from '@acala-network/eth-providers';
import { BigNumber, Contract, Wallet } from 'ethers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseUnits } from 'ethers/lib/utils';

import {
  ETH_RPC_URL,
  GAS_MONSTER_GAS_REQUIRED,
  deployErc20,
  deployGasMonster,
  eth_estimateGas,
  eth_gasPrice,
  evmAccounts,
} from '../utils';

export const estimateGas = async (
  tx: TransactionRequest,
  blockTag?: BlockTagish
) => {
  const gasPrice = (await eth_gasPrice([])).data.result;
  const res = await eth_estimateGas([{ ...tx, gasPrice }, blockTag]);
  if (res.data.error) {
    throw new Error(res.data.error.message);
  }
  const gasLimit = res.data.result;

  return {
    gasPrice: BigNumber.from(gasPrice),
    gasLimit: BigNumber.from(gasLimit),
  };
};

const provider = new AcalaJsonRpcProvider(ETH_RPC_URL);
const wallet = new Wallet(evmAccounts[0].privateKey, provider);

describe('eth_estimateGas', () => {
  it('can deal with weird gas contract', async () => {
    const gm = await deployGasMonster(wallet);
    const tx = await gm.populateTransaction.run();

    const { gasLimit } = await estimateGas(tx);
    const bbb = (gasLimit.toNumber() % 100000) / 100;

    /* ---------- should work with latest and pending tag ---------- */
    const { gasLimit: gasLimitLatest } = await estimateGas(tx, 'latest');
    const { gasLimit: gasLimitPending } = await estimateGas(tx, 'pending');

    expect(gasLimitLatest.toBigInt()).to.equal(gasLimit.toBigInt());
    expect(gasLimitPending.toBigInt()).to.equal(gasLimit.toBigInt());
    /* -------------------------------------------------------------- */

    // should be passing gasLimit instead of usedGas
    expect(bbb).to.gt(GAS_MONSTER_GAS_REQUIRED / 30000);

    await (await gm.run()).wait();    // make sure running has no error
  });

  describe('works with gas overrides', () => {
    let token: Contract;

    beforeAll(async () => {
      token = await deployErc20(wallet);
    });

    it('works with valid gas overrides', async () => {
      const tx = await token.populateTransaction.transfer(evmAccounts[1].evmAddress, 1000);
      const { gasLimit: realGasLimit, gasPrice } = await estimateGas(tx);

      const resps = await Promise.all([
        eth_estimateGas([{ ...tx, gasPrice, gas: realGasLimit }]),
        eth_estimateGas([{ ...tx, gasPrice }]),
        eth_estimateGas([{ ...tx, gas: realGasLimit }]),

        eth_estimateGas([{ ...tx, gas: 101520 }]),  // increase gas and storagelimits
        eth_estimateGas([{ ...tx, gasPrice: parseUnits('234.001298752', 'gwei') }]),  // increase tip and valid until
        eth_estimateGas([{ ...tx, gasPrice: parseUnits('321.001000000', 'gwei'), gas: 102518 }]),  // increase everything
      ]);

      const errs = resps.map(r => r.data.error);
      if (errs.some(e => e !== undefined)) {
        expect.fail(`some of the requests failed: ${JSON.stringify(errs, null, 2)}`);
      }

      const results = resps.map(r => r.data.result)
        .slice(0, 4);   // last request has slightly different estimated gaslimit since it has different gasPrice
      if (results.some(e => BigInt(e) !== realGasLimit.toBigInt())) {
        expect.fail(`some of the requests returned wrong gasLimit: ${JSON.stringify(results, null, 2)}`);
      }
    });

    it('throws error with invalid gas overrides', async () => {
      const tx = await token.populateTransaction.transfer(Wallet.createRandom().address, 100000);

      const resps = await Promise.all([
        eth_estimateGas([{ ...tx, gasPrice: parseUnits('100.000000001', 'gwei') }]),  // too low valid until
        eth_estimateGas([{ ...tx, gasPrice: parseUnits('38.0000090000', 'gwei') }]),  // invalid gasPrice
        eth_estimateGas([{ ...tx, gas: 20100 }]),   // too low storagelimit
        eth_estimateGas([{ ...tx, gas: 200109 }]),  // too low gaslimit
        eth_estimateGas([{ ...tx, gas: 200301 }]),  // too low gaslimit + storagelimit
        eth_estimateGas([{ ...tx, gasPrice: parseUnits('100.000000001', 'gwei'), gas: 200301 }]),  // too low everything
      ]);

      const errs = resps.map(r => r.data.error?.message);
      if (errs.some(e => e === undefined)) {
        expect.fail(`some of the requests didn't fail when it should: ${JSON.stringify(errs, null, 2)}`);
      }

      expect(errs[0]).to.contain('Error: invalid gasPrice');
      expect(errs[1]).to.contain('Error: invalid gasPrice');
      expect(errs[2]).to.contain('evm.OutOfStorage');
      expect(errs[3]).to.contain('execution error: outOfGas');
      expect(errs[4]).to.contain('evm.OutOfStorage');
      expect(errs[5]).to.contain('Error: invalid gasPrice');
    });
  });
});
