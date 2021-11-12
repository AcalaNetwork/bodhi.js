import { Contract, BigNumber, ContractFactory } from 'ethers';
import ADDRESS from '@acala-network/contracts/utils/Address';
import { expect, use } from 'chai';
import { evmChai } from '@acala-network/bodhi';

import setup from './setup';
import Arbitrager from '../build/Arbitrager.json';
import UniswapFactory from '../artifacts/UniswapV2Factory.json';
import UniswapRouter from '../artifacts/UniswapV2Router02.json';
import IERC20 from '../artifacts/IERC20.json';

const dollar = BigNumber.from('1000000000000');
use(evmChai);

const deploy = async () => {
  const { wallet, provider } = await setup();
  const deployerAddress = await wallet.getAddress();
  const tokenACA = new Contract(ADDRESS.ACA, IERC20.abi, wallet);
  const tokenDOT = new Contract(ADDRESS.DOT, IERC20.abi, wallet);

  // deploy factory
  const factory = await ContractFactory.fromSolidity(UniswapFactory).connect(wallet).deploy(deployerAddress);

  // deploy router
  const router = await ContractFactory.fromSolidity(UniswapRouter).connect(wallet).deploy(factory.address, ADDRESS.ACA);

  console.log('Deploy done');
  console.log({
    factory: factory.address,
    router: router.address
  });

  // approve
  await tokenACA.approve(router.address, dollar.mul(100));
  await tokenDOT.approve(router.address, dollar.mul(100));

  // add liquidity
  await router.addLiquidity(ADDRESS.ACA, ADDRESS.DOT, dollar.mul(2), dollar, 0, 0, deployerAddress, 10000000000);

  // check
  const tradingPairAddress = await factory.getPair(ADDRESS.ACA, ADDRESS.DOT);
  const tradingPair = new Contract(tradingPairAddress, IERC20.abi, wallet);
  const lpTokenAmount = await tradingPair.balanceOf(deployerAddress);
  const acaAmount = await tokenACA.balanceOf(tradingPairAddress);
  const dotAmount = await tokenDOT.balanceOf(tradingPairAddress);

  console.log({
    tradingPair: tradingPairAddress,
    lpTokenAmount: lpTokenAmount.toString(),
    liquidityPoolAcaAmount: acaAmount.toString(),
    liquidityPoolDotAmount: dotAmount.toString()
  });

  provider.api.disconnect();

  return router.address;
};

const trade = async (routerAddress: string) => {
  console.log(`##### start trading with router ${routerAddress} ...`);

  const { wallet, provider } = await setup();
  const deployerAddress = await wallet.getAddress();
  const tokenACA = new Contract(ADDRESS.ACA, IERC20.abi, wallet);
  const tokenDOT = new Contract(ADDRESS.DOT, IERC20.abi, wallet);

  const router = new Contract(routerAddress, UniswapRouter.abi, wallet);
  const factory = new Contract(await router.factory(), UniswapFactory.abi, wallet);

  // approve
  await tokenACA.approve(router.address, dollar.mul(100));
  await tokenDOT.approve(router.address, dollar.mul(100));

  // before
  const acaAmountBefore = await tokenACA.balanceOf(deployerAddress);
  const dotAmountBefore = await tokenDOT.balanceOf(deployerAddress);

  console.log({
    acaAmountBefore: acaAmountBefore.toString(),
    dotAmountBefore: dotAmountBefore.toString()
  });

  // trade

  const path = [ADDRESS.DOT, ADDRESS.ACA];
  const buyAmount = dollar;

  console.log('Trade', {
    path,
    buyAmount: buyAmount.toString()
  });

  await router.swapExactTokensForTokens(buyAmount, 0, path, deployerAddress, 10000000000);

  // check
  const tradingPairAddress = await factory.getPair(ADDRESS.ACA, ADDRESS.DOT);
  const tradingPair = new Contract(tradingPairAddress, IERC20.abi, wallet);
  const lpTokenAmount = await tradingPair.balanceOf(deployerAddress);
  const lpAcaAmount = await tokenACA.balanceOf(tradingPairAddress);
  const lpDotAmount = await tokenDOT.balanceOf(tradingPairAddress);
  const acaAmountAfter = await tokenACA.balanceOf(deployerAddress);
  const dotAmountAfter = await tokenDOT.balanceOf(deployerAddress);

  console.log({
    tradingPair: tradingPairAddress,
    lpTokenAmount: lpTokenAmount.toString(),
    liquidityPoolAcaAmount: lpAcaAmount.toString(),
    liquidityPoolDotAmount: lpDotAmount.toString(),
    acaAmountAfter: acaAmountAfter.toString(),
    dotAmountAfter: dotAmountAfter.toString()
  });

  provider.api.disconnect();
};

const main = async () => {
  const routerAddress = await deploy();
  await trade(routerAddress);
};

main();
