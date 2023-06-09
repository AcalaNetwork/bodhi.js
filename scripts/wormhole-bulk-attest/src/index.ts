
import { Wallet } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { ACALA, ARB, BSC, ETH, KARURA , POLYGON , attestToken , getProvider } from './utils';

const key = '';

const tokensKarura = [
  { srcAddr: '0x912CE59144191C1204E64559FE8253a0e49E6548', networkName: ARB },      // arb
  { srcAddr: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', networkName: POLYGON },  // wmatic
  { srcAddr: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', networkName: BSC },      // wbnb
  { srcAddr: '0xe9e7cea3dedca5984780bafc599bd69add087d56', networkName: BSC },      // busd
  { srcAddr: '0x5a98fcbea516cf06857215779fd812ca3bef1b32', networkName: ETH },      // ldo
  { srcAddr: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', networkName: ETH },      // shib
  { srcAddr: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', networkName: ETH },      // uni
  { srcAddr: '0x514910771af9ca656af840dff83e8264ecf986ca', networkName: ETH },      // link
  { srcAddr: '0x4d224452801aced8b2f0aebe155379bb5d594381', networkName: ETH },      // ape
  { srcAddr: '0x6b175474e89094c44da98b954eedeac495271d0f', networkName: ETH },      // dai
  { srcAddr: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', networkName: ETH },      // wbtc
  { srcAddr: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', networkName: ETH },      // weth
  { srcAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', networkName: ETH },      // usdc
  { srcAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7', networkName: ETH },      // usdt
  { srcAddr: '0x2620638EDA99F9e7E902Ea24a285456EE9438861', networkName: ETH },      // csm
] as const;

const tokensAcala = [
  // { srcAddr: '0x912CE59144191C1204E64559FE8253a0e49E6548', networkName: ARB },      // arb
  { srcAddr: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', networkName: POLYGON },  // wmatic
  { srcAddr: '0xe9e7cea3dedca5984780bafc599bd69add087d56', networkName: BSC },      // busd
  { srcAddr: '0x5a98fcbea516cf06857215779fd812ca3bef1b32', networkName: ETH }, // ldo
  { srcAddr: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', networkName: ETH }, // shib
  { srcAddr: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', networkName: ETH }, // uni
  { srcAddr: '0x514910771af9ca656af840dff83e8264ecf986ca', networkName: ETH }, // link
  { srcAddr: '0x4d224452801aced8b2f0aebe155379bb5d594381', networkName: ETH }, // ape
  { srcAddr: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', networkName: ETH }, // wbtc
  { srcAddr: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', networkName: ETH }, // weth
  { srcAddr: '0x6b175474e89094c44da98b954eedeac495271d0f', networkName: ETH }, // dai
  { srcAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', networkName: ETH }, // usdc
  { srcAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7', networkName: ETH }, // usdt
  { srcAddr: '0x32a7C02e79c4ea1008dD6564b35F131428673c41', networkName: ETH }, // cru
] as const;

const tokensInfo = {
  [ACALA]: tokensAcala,
  [KARURA]: tokensKarura,
};

const main = async () => {
  const dstNetworkName = ACALA;
  const tokens = tokensInfo[dstNetworkName];

  for (const token of tokens) {
    const srcNetworkName = token.networkName;

    const srcProvider = getProvider(srcNetworkName);
    const dstProvider = getProvider(dstNetworkName);

    const srcSigner = new Wallet(key, srcProvider);
    const dstSigner = new Wallet(key, dstProvider);

    const [srcBal, dstBal] = await Promise.all([
      srcSigner.getBalance(),
      dstSigner.getBalance(),
    ]);

    console.log({
      srcBal: formatEther(srcBal),
      dstBal: formatEther(dstBal),
    });

    await attestToken(srcNetworkName, dstNetworkName, srcSigner, dstSigner, token.srcAddr);
    console.log('----------------------------------------------------------------------------------');
  }

};

main();
