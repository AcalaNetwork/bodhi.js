import { Signer, AccountSigningKey, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract, BigNumber } from 'ethers';
import Prices from '../build/Prices.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();

const testPairs = createTestPairs();

const feedValues = async (token: string, price: number) => {
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

  before(async () => {
    const [wallet] = await provider.getWallets();
    prices = await deployContract(wallet as any, Prices);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('getPrice works', async () => {
    await feedValues('RENBTC', BigNumber.from(34_500).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.RENBTC)).to.equal(
      BigNumber.from(34_500).mul(BigNumber.from(10).pow(18)).toString()
    );

    await feedValues('RENBTC', BigNumber.from(33_800).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.RENBTC)).to.equal(
      BigNumber.from(33_800).mul(BigNumber.from(10).pow(18)).toString()
    );

    await feedValues('DOT', BigNumber.from(15).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.DOT)).to.equal(BigNumber.from(15).mul(BigNumber.from(10).pow(18)).toString());

    await feedValues('DOT', BigNumber.from(16).mul(BigNumber.from(10).pow(18)).toString());
    expect(await prices.getPrice(ADDRESS.DOT)).to.equal(BigNumber.from(16).mul(BigNumber.from(10).pow(18)).toString());

    expect(await prices.getPrice(ADDRESS.AUSD)).to.equal(BigNumber.from(1).mul(BigNumber.from(10).pow(18)).toString());

    expect(await prices.getPrice(ADDRESS.LP_RENBTC_AUSD)).to.equal(0);
  });

  it('ignores invalid address as CurrencyId::erc20', async () => {
    // not system contract
    expect(await prices.getPrice('0x1000000000000000000000000000000000000000')).to.equal(0);
    // Zero address
    await expect(prices.getPrice('0x0000000000000000000000000000000000000000')).to.be.reverted;
  });
});
