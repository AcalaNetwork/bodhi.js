import { BodhiSigner, evmChai, getTestUtils, BodhiProvider } from '@acala-network/bodhi';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import StableAsset from '../build/StableAsset.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';

use(solidity);
use(evmChai);

const StableAssetABI = require('@acala-network/contracts/build/contracts/StableAsset.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};
const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));

const send = async (extrinsic: SubmittableExtrinsic<'promise'>, sender: AddressOrPair) =>
  new Promise((resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });

describe('stable asset', () => {
  let wallet: BodhiSigner;
  let provider: BodhiProvider;
  let stableAsset: Contract;
  let stableAssetPredeployed: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    wallet = testUtils.wallets[0];
    provider = testUtils.provider; // this is the same as wallet.provider
    stableAsset = await deployContract(wallet, StableAsset);
    stableAssetPredeployed = new ethers.Contract(ADDRESS.STABLE_ASSET, StableAssetABI, wallet);
  });

  after(async () => wallet.provider.api.disconnect());

  it('stable asset get function works', async () => {
    expect(await stableAsset.getStableAssetPoolTokens(0)).to.deep.eq([false, []]);
    expect((await stableAsset.getStableAssetPoolTotalSupply(0)).toString()).to.deep.eq('false,0');
    expect((await stableAsset.getStableAssetPoolPrecision(0)).toString()).to.deep.eq('false,0');
    expect((await stableAsset.getStableAssetPoolMintFee(0)).toString()).to.deep.eq('false,0');
    expect((await stableAsset.getStableAssetPoolSwapFee(0)).toString()).to.deep.eq('false,0');
    expect((await stableAsset.getStableAssetPoolRedeemFee(0)).toString()).to.deep.eq('false,0');

    const poolAsset = { StableAssetPoolToken: 0 };
    const assets = [{ Token: 'DOT' }, { Token: 'LDOT' }];
    const precisions = [1, 1];
    const mintFee = 2;
    const swapFee = 3;
    const redeemFee = 4;
    const initialA = 10000;
    const feeRecipient = wallet.substrateAddress;
    const yieldRecipient = wallet.substrateAddress;
    const precision = 1;

    const createPool = provider.api.tx.sudo.sudo(
      provider.api.tx.stableAsset.createPool(
        poolAsset,
        assets,
        precisions,
        mintFee,
        swapFee,
        redeemFee,
        initialA,
        feeRecipient,
        yieldRecipient,
        precision
      )
    );
    await send(createPool, wallet.substrateAddress);

    expect(await stableAsset.getStableAssetPoolTokens(0)).to.deep.eq([true, [ADDRESS.DOT, ADDRESS.LDOT]]);
    expect((await stableAsset.getStableAssetPoolTotalSupply(0)).toString()).to.deep.eq('true,0');
    expect((await stableAsset.getStableAssetPoolPrecision(0)).toString()).to.deep.eq('true,1');
    expect((await stableAsset.getStableAssetPoolMintFee(0)).toString()).to.deep.eq('true,2');
    expect((await stableAsset.getStableAssetPoolSwapFee(0)).toString()).to.deep.eq('true,3');
    expect((await stableAsset.getStableAssetPoolRedeemFee(0)).toString()).to.deep.eq('true,4');
  });

  it('stable asset stableAssetMint/stableAssetRedeem/stableAssetSwap works', async () => {
    const updateBalanceDOT = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(wallet.substrateAddress, { Token: 'DOT' }, dollar.mul(1000).toBigInt())
    );
    await send(updateBalanceDOT, wallet.substrateAddress);
    const updateBalanceLDOT = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(wallet.substrateAddress, { Token: 'LDOT' }, dollar.mul(1000).toBigInt())
    );
    await send(updateBalanceLDOT, wallet.substrateAddress);

    const assetRegistry = provider.api.tx.sudo.sudo(
      provider.api.tx.assetRegistry.registerStableAsset({
        name: 'taiga DOT',
        symbol: 'tDOT',
        decimals: 10,
        minimalBalance: 1
      })
    );
    await send(assetRegistry, wallet.substrateAddress);

    await expect(stableAssetPredeployed.stableAssetMint(0, [dollar.mul(1), dollar.mul(2)], 1))
      .to.emit(stableAssetPredeployed, 'StableAssetMinted')
      .withArgs(await wallet.getAddress(), 0, [dollar.mul(1), dollar.mul(2)], 1);

    await expect(stableAssetPredeployed.stableAssetRedeem(0, 500000, [1, 2]))
      .to.emit(stableAssetPredeployed, 'StableAssetRedeemed')
      .withArgs(await wallet.getAddress(), 0, 500000, [1, 2]);

    await expect(stableAssetPredeployed.stableAssetSwap(0, 0, 1, 500000, 0, 2))
      .to.emit(stableAssetPredeployed, 'StableAssetSwapped')
      .withArgs(await wallet.getAddress(), 0, 0, 1, 500000, 0, 2);

    await expect(stableAssetPredeployed.stableAssetRedeemSingle(0, 500000, 0, 0, 2))
      .to.emit(stableAssetPredeployed, 'StableAssetRedeemedSingle')
      .withArgs(await wallet.getAddress(), 0, 500000, 0, 0, 2);

    await expect(stableAssetPredeployed.stableAssetRedeemMulti(0, [500000, 2], 1000000000))
      .to.emit(stableAssetPredeployed, 'StableAssetRedeemedMulti')
      .withArgs(await wallet.getAddress(), 0, [500000, 2], 1000000000);
  });
});
