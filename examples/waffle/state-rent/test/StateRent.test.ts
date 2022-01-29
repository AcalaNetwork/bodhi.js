import { Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract, ethers } from 'ethers';
import StateRent from '../build/StateRent.json';
import ADDRESS from '@acala-network/contracts/utils/Address';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();
const testPairs = createTestPairs();
const STATE_RENT_ABI = require('@acala-network/contracts/build/contracts/StateRent.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};

describe('StateRent', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let stateRent: Contract;
  let stateRentPredeployed: Contract;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
    stateRent = await deployContract(wallet as any, StateRent);
    stateRentPredeployed = new ethers.Contract(ADDRESS.StateRent, STATE_RENT_ABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('stateRent works', async () => {
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      expect((await stateRent.newContractExtraBytes()).toString()).to.equal(formatAmount('10_000'));

      expect((await stateRent.storageDepositPerByte()).toString()).to.equal(formatAmount('100_000_000_000_000'));

      expect((await stateRent.developerDeposit()).toString()).to.equal(formatAmount('1_000_000_000_000_000_000'));

      expect((await stateRent.publicationFee()).toString()).to.equal(formatAmount('1_000_000_000_000_000_000'));

      await provider.api.tx.evm.publishContract(stateRent.address).signAndSend(testPairs.alice.address);
      // TODO: https://github.com/AcalaNetwork/Acala/pull/1826
      // await stateRentPredeployed.publishContract(stateRent.address);
    } else {
      expect(await stateRent.newContractExtraBytes()).to.equal(0);

      expect(await stateRent.storageDepositPerByte()).to.equal(0);

      expect(await stateRent.developerDeposit()).to.equal(0);

      expect(await stateRent.publicationFee()).to.equal(0);
    }

    expect(await stateRent.maintainerOf(stateRent.address)).to.equal(await wallet.getAddress());

    // The contract created by the user cannot be transferred through the contract,
    // only through the evm dispatch call `transfer_maintainer`.
    await expect(stateRent.transferMaintainer(stateRent.address, await walletTo.getAddress())).to.be.reverted;

    await new Promise(async (resolve) => {
      provider.api.tx.evm
        .transferMaintainer(stateRent.address, await walletTo.getAddress())
        .signAndSend(testPairs.alice.address, (result) => {
          if (result.status.isFinalized || result.status.isInBlock) {
            resolve(undefined);
          }
        });
    });

    expect(await stateRent.maintainerOf(stateRent.address)).to.equal(await walletTo.getAddress());

    expect(await stateRent.developerStatus(await wallet.getAddress())).to.equal(false);
    await stateRentPredeployed.developerEnable();
    expect(await stateRent.developerStatus(await wallet.getAddress())).to.equal(true);
    await stateRentPredeployed.developerDisable();
    expect(await stateRent.developerStatus(await wallet.getAddress())).to.equal(false);
  });
});
