import { Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import StableAsset from '../build/StableAsset.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();
const testPairs = createTestPairs();
const StableAssetABI = require('@acala-network/contracts/build/contracts/StableAsset.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};
const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));

const send = async (extrinsic: any, sender: any) => {
  return new Promise(async (resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });
};

describe('stable asset', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let stableAsset: Contract;
  let stableAssetPredeployed: Contract;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
    stableAsset = await deployContract(wallet as any, StableAsset);
    stableAssetPredeployed = new ethers.Contract(ADDRESS.STABLE_ASSET, StableAssetABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
  });

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
    const feeRecipient = await wallet.getSubstrateAddress();
    const yieldRecipient = await wallet.getSubstrateAddress();
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
    await send(createPool, await wallet.getSubstrateAddress());

    expect(await stableAsset.getStableAssetPoolTokens(0)).to.deep.eq([true, [ADDRESS.DOT, ADDRESS.LDOT]]);
    expect((await stableAsset.getStableAssetPoolTotalSupply(0)).toString()).to.deep.eq('true,0');
    expect((await stableAsset.getStableAssetPoolPrecision(0)).toString()).to.deep.eq('true,1');
    expect((await stableAsset.getStableAssetPoolMintFee(0)).toString()).to.deep.eq('true,2');
    expect((await stableAsset.getStableAssetPoolSwapFee(0)).toString()).to.deep.eq('true,3');
    expect((await stableAsset.getStableAssetPoolRedeemFee(0)).toString()).to.deep.eq('true,4');
  });

  it('stable asset stableAssetMint/stableAssetRedeem/stableAssetSwap works', async () => {
    const updateBalanceDOT = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(await wallet.getSubstrateAddress(), { Token: 'DOT' }, dollar.mul(1000))
    );
    await send(updateBalanceDOT, await wallet.getSubstrateAddress());

    const updateBalanceLDOT = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(await wallet.getSubstrateAddress(), { Token: 'LDOT' }, dollar.mul(1000))
    );
    await send(updateBalanceLDOT, await wallet.getSubstrateAddress());

    const assetRegistry = provider.api.tx.sudo.sudo(
      provider.api.tx.assetRegistry.registerStableAsset({
        name: 'taiga DOT',
        symbol: 'tDOT',
        decimals: 10,
        minimalBalance: 1
      })
    );
    await send(assetRegistry, await wallet.getSubstrateAddress());

    await expect(stableAssetPredeployed.stableAssetMint(0, [dollar.mul(1), dollar.mul(2)], 1))
      .to.emit(stableAssetPredeployed, 'StableAssetMinted')
      .withArgs(await wallet.getAddress(), 0, [dollar.mul(1), dollar.mul(2)], 1);

    await expect(stableAssetPredeployed.stableAssetRedeem(0, 500000, [1, 2]))
      .to.emit(stableAssetPredeployed, 'StableAssetRedeemed')
      .withArgs(await wallet.getAddress(), 0, 500000, [1, 2]);

    await expect(stableAssetPredeployed.stableAssetSwap(0, 0, 1, 500000, 0, 2))
      .to.emit(stableAssetPredeployed, 'StableAssetSwapped')
      .withArgs(await wallet.getAddress(), 0, 0, 1, 500000, 0, 2);
  });
});
