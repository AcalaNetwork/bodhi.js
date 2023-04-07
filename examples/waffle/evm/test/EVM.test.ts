import { BodhiSigner, evmChai, getTestUtils, BodhiProvider } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract, ethers } from 'ethers';
import EVM from '../build/EVM.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';

use(solidity);
use(evmChai);

const testPairs = createTestPairs();
const EVM_ABI = require('@acala-network/contracts/build/contracts/EVM.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};

describe('EVM', () => {
  let wallet: BodhiSigner;
  let walletTo: BodhiSigner;
  let evm: Contract;
  let evmPredeployed: Contract;
  let provider: BodhiProvider;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    [wallet, walletTo] = testUtils.wallets;
    provider = testUtils.provider; // this is the same as wallet.provider
    evm = await deployContract(wallet, EVM);
    evmPredeployed = new ethers.Contract(ADDRESS.EVM, EVM_ABI, wallet);
  });

  after(async () => {
    wallet.provider.api.disconnect();
  });

  it('evm works', async () => {
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      expect((await evm.newContractExtraBytes()).toString()).to.equal(formatAmount('10_000'));

      expect((await evm.storageDepositPerByte()).toString()).to.equal(formatAmount('100_000_000_000_000'));

      expect((await evm.developerDeposit()).toString()).to.equal(formatAmount('1_000_000_000_000_000_000'));

      expect((await evm.publicationFee()).toString()).to.equal(formatAmount('1_000_000_000_000_000_000'));

      await evmPredeployed.publishContract(evm.address);
    } else {
      expect(await evm.newContractExtraBytes()).to.equal(0);

      expect(await evm.storageDepositPerByte()).to.equal(0);

      expect(await evm.developerDeposit()).to.equal(0);

      expect(await evm.publicationFee()).to.equal(0);
    }

    expect(await evm.maintainerOf(evm.address)).to.equal(await wallet.getAddress());

    // The contract created by the user cannot be transferred through the contract,
    // only through the evm dispatch call `transfer_maintainer`.
    await expect(evm.transferMaintainer(evm.address, await walletTo.getAddress())).to.be.reverted;

    await new Promise(async (resolve) => {
      provider.api.tx.evm
        .transferMaintainer(evm.address, await walletTo.getAddress())
        .signAndSend(testPairs.alice.address, (result) => {
          if (result.status.isFinalized || result.status.isInBlock) {
            resolve(undefined);
          }
        });
    });

    expect(await evm.maintainerOf(evm.address)).to.equal(await walletTo.getAddress());

    expect(await evm.developerStatus(await wallet.getAddress())).to.equal(false);
    await evmPredeployed.developerEnable();
    expect(await evm.developerStatus(await wallet.getAddress())).to.equal(true);
    await evmPredeployed.developerDisable();
    expect(await evm.developerStatus(await wallet.getAddress())).to.equal(false);
  });
});
