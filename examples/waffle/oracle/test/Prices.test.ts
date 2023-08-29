import { evmChai, getTestUtils, BodhiProvider } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract, BigNumber } from 'ethers';
import Prices from '../build/Prices.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { parseEther } from 'ethers/lib/utils';

use(solidity);
use(evmChai);

const testPairs = createTestPairs();

const feedValues = async (provider: BodhiProvider, token: string, price: string) => {
  return new Promise((resolve) => {
    provider.api.tx.acalaOracle
      .feedValues([[{ Token: token }, price]])
      .signAndSend(testPairs.alice.address, (result) => {
        if (result.status.isFinalized || result.status.isInBlock) {
          resolve(undefined);
        }
      });
  });
};

describe('Prices', () => {
  let prices: Contract;
  let provider: BodhiProvider;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    provider = testUtils.provider; // this is the same as wallet.provider
    prices = await deployContract(testUtils.wallets[0], Prices);
  });

  after(() => provider.disconnect());

  it('getPrice works', async () => {
    await feedValues(provider, 'DOT', parseEther('15').toString());
    expect(await prices.getPrice(ADDRESS.DOT)).to.equal(parseEther('15').toString());

    await feedValues(provider, 'DOT', parseEther('16').toString());
    expect(await prices.getPrice(ADDRESS.DOT)).to.equal(parseEther('16').toString());

    expect(await prices.getPrice(ADDRESS.AUSD)).to.equal(parseEther('1').toString());

    expect(await prices.getPrice(ADDRESS.LP_ACA_AUSD)).to.equal(0);
  });

  it('ignores invalid address as CurrencyId::erc20', async () => {
    // not system contract
    expect(await prices.getPrice('0x1000000000000000000000000000000000000000')).to.equal(0);
    // Zero address
    await expect(prices.getPrice('0x0000000000000000000000000000000000000000')).to.be.reverted;
  });
});
