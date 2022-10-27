import { expect, use } from 'chai';
import { Contract, ContractFactory, BigNumber } from 'ethers';
import { evmChai, getTestUtils } from '@acala-network/bodhi';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';

import UniswapFactory from '../artifacts/UniswapV2Factory.json';
import UniswapRouter from '../artifacts/UniswapV2Router02.json';
import Arbitrager from '../build/Arbitrager.json';
import IERC20 from '../artifacts/IERC20.json';

use(evmChai);

const main = async () => {
  const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
  const { wallets, provider, pairs } = await getTestUtils(endpoint);
  const wallet = wallets[0];
  const pair = pairs[0];
  const deployerAddress = await wallet.getAddress();
  const tokenACA = new Contract(ADDRESS.ACA, IERC20.abi, wallet);
  const tokenAUSD = new Contract(ADDRESS.AUSD, IERC20.abi, wallet);
  const tokenDOT = new Contract(ADDRESS.DOT, IERC20.abi, wallet);

  console.log('Deploy Uniswap');

  // deploy factory
  const factory = await ContractFactory.fromSolidity(UniswapFactory).connect(wallet).deploy(deployerAddress);

  // deploy router
  const router = await ContractFactory.fromSolidity(UniswapRouter).connect(wallet).deploy(factory.address, ADDRESS.ACA);

  console.log({
    factory: factory.address,
    router: router.address
  });

  expect((await tokenAUSD.allowance(deployerAddress, router.address)).toString()).to.equal('0');
  await tokenAUSD.approve(router.address, BigNumber.from(10).pow(18));
  expect((await tokenAUSD.allowance(deployerAddress, router.address)).toString()).to.equal('1000000000000000000');

  expect((await tokenDOT.allowance(deployerAddress, router.address)).toString()).to.equal('0');
  await tokenDOT.approve(router.address, BigNumber.from(10).pow(18));
  expect((await tokenDOT.allowance(deployerAddress, router.address)).toString()).to.equal('1000000000000000000');

  await router.addLiquidity(
    ADDRESS.AUSD,
    ADDRESS.DOT,
    BigNumber.from(10).pow(15),
    BigNumber.from(10).pow(15),
    0,
    0,
    deployerAddress,
    10000000000
  );

  // check
  const tradingPairAddress = await factory.getPair(ADDRESS.AUSD, ADDRESS.DOT);
  const tradingPair = new Contract(tradingPairAddress, IERC20.abi, wallet);
  const lpTokenAmount = await tradingPair.balanceOf(deployerAddress);
  const amountAUSD = await tokenAUSD.balanceOf(tradingPairAddress);
  const amountDOT = await tokenDOT.balanceOf(tradingPairAddress);

  console.log({
    tradingPair: tradingPairAddress,
    lpTokenAmount: lpTokenAmount.toString(),
    liquidityPoolAmountAUSD: amountAUSD.toString(),
    liquidityPoolAmountDOT: amountDOT.toString()
  });

  console.log('Deploy Arbitrager');

  // deploy arbitrager, scheduled every 3 blocks

  const arbitrager = await ContractFactory.fromSolidity(Arbitrager)
    .connect(wallet)
    .deploy(factory.address, router.address, ADDRESS.AUSD, ADDRESS.DOT, 1);

  if (!process.argv.includes('--with-ethereum-compatibility')) {
    // The contract is charged by the Scheduler for handling fees and needs to be transferred first
    await tokenACA.transfer(arbitrager.address, BigNumber.from(10).pow(13));
  }
  await arbitrager.initialize();

  await tokenAUSD.transfer(arbitrager.address, BigNumber.from(10).pow(13));
  await tokenDOT.transfer(arbitrager.address, BigNumber.from(10).pow(13));

  const printBalance = async () => {
    const amountAUSD = await tokenAUSD.balanceOf(arbitrager.address);
    const amountDOT = await tokenDOT.balanceOf(arbitrager.address);
    const lpAmountAUSD = await tokenAUSD.balanceOf(tradingPairAddress);
    const lpAmountDOT = await tokenDOT.balanceOf(tradingPairAddress);

    console.log({
      arbitrager: arbitrager.address,
      amountAUSD: amountAUSD.toString(),
      amountDOT: amountDOT.toString(),
      lpAmountAUSD: lpAmountAUSD.toString(),
      lpAmountDOT: lpAmountDOT.toString()
    });
  };

  await provider.api.tx.acalaOracle
    .feedValues([
      [{ Token: 'AUSD' }, 1000],
      [{ Token: 'DOT' }, 2000]
    ])
    .signAndSend(pair);

  await printBalance();

  const nextBlock = () => provider.api.rpc.engine.createBlock(true /* create empty */, true);

  await nextBlock();
  await nextBlock();

  await printBalance();

  await nextBlock();
  await provider.api.tx.acalaOracle
    .feedValues([
      [{ Token: 'AUSD' }, 2000],
      [{ Token: 'DOT' }, 1000]
    ])
    .signAndSend(pair);

  await printBalance();

  await nextBlock();
  await nextBlock();

  await printBalance();

  await provider.disconnect();
};

main();
