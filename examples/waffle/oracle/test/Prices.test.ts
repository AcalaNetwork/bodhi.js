import { evmChai, getTestUtils, BodhiProvider } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract, BigNumber } from 'ethers';
import Prices from '../build/Prices.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';

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
    await feedValues(provider, 'RENBTC', BigNumber.from(34_500).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.RENBTC)).to.equal(
      BigNumber.from(34_500).mul(BigNumber.from(10).pow(18)).toString()
    );

    await feedValues(provider, 'RENBTC', BigNumber.from(33_800).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.RENBTC)).to.equal(
      BigNumber.from(33_800).mul(BigNumber.from(10).pow(18)).toString()
    );

    await feedValues(provider, 'DOT', BigNumber.from(15).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.DOT)).to.equal(BigNumber.from(15).mul(BigNumber.from(10).pow(18)).toString());

    await feedValues(provider, 'DOT', BigNumber.from(16).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.DOT)).to.equal(BigNumber.from(16).mul(BigNumber.from(10).pow(18)).toString());

    expect(await prices.getPrice(ADDRESS.AUSD)).to.equal(BigNumber.from(1).mul(BigNumber.from(10).pow(18)).toString());

    expect(await prices.getPrice(ADDRESS.LP_ACA_AUSD)).to.equal(0);
  });

  it('ignores invalid address as CurrencyId::erc20', async () => {
    // not system contract
    expect(await prices.getPrice('0x1000000000000000000000000000000000000000')).to.equal(0);
    // Zero address
    await expect(prices.getPrice('0x0000000000000000000000000000000000000000')).to.be.reverted;
  });
});
