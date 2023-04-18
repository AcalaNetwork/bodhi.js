import { expect, use } from 'chai';
import { Contract } from 'ethers';
import { deployContract, solidity } from 'ethereum-waffle';
import BasicToken from '../build/BasicToken.json';
import { getTestUtils, BodhiSigner, evmChai, BodhiProvider } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';

use(solidity);
use(evmChai);

const testPairs = createTestPairs();

describe('BasicToken', () => {
  let wallet: BodhiSigner;
  let walletTo: BodhiSigner;
  let emptyWallet: BodhiSigner;
  let provider: BodhiProvider;
  let token: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    [wallet, walletTo, emptyWallet] = testUtils.wallets;
    provider = testUtils.provider; // this is the same as wallet.provider
    token = await deployContract(wallet, BasicToken, [1000]);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
  });

  it('Assigns initial balance', async () => {
    expect(await token.balanceOf(await wallet.getAddress())).to.equal(1000);
  });

  it('Transfer adds amount to destination account', async () => {
    await token.transfer(await walletTo.getAddress(), 7);
    expect(await token.balanceOf(await walletTo.getAddress())).to.equal(7);
  });

  it('Transfer emits event', async () => {
    await expect(token.transfer(await walletTo.getAddress(), 7))
      .to.emit(token, 'Transfer')
      .withArgs(await wallet.getAddress(), await walletTo.getAddress(), 7);
  });

  it('Can not transfer above the amount', async () => {
    await expect(token.transfer(await walletTo.getAddress(), 1007)).to.be.reverted;
  });

  it('Can not transfer from empty account', async () => {
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      // If it is not called by the maintainer, developer, or contract, it needs to be deployed first
      await provider.api.tx.evm.publishContract(token.address).signAndSend(testPairs.alice.address);
    }

    const tokenFromOtherWallet = token.connect(emptyWallet);
    await expect(tokenFromOtherWallet.transfer(await wallet.getAddress(), 1)).to.be.reverted;
  });
});
