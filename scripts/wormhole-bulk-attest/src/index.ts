import { attestFromEth, ChainId, CHAINS, CHAIN_ID_TO_NAME, createWrappedOnEth, getEmitterAddressEth, getSignedVAAWithRetry, parseSequenceFromLogEth, tryNativeToHexString, CONTRACTS, uint8ArrayToHex } from '@certusone/wormhole-sdk';
import { Signer, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';

const privateKey = '';

export const gasOverride = {
  gasPrice: '0x33a70303ea',
  gasLimit: '0x329b140',
};

interface WormholeNetwork {
  bridgeAddr: string;
  tokenBridgeAddr: string;
  wormholeChainId: ChainId;
}

const ethNetwork: WormholeNetwork = {
  bridgeAddr: CONTRACTS.MAINNET.ethereum.core,
  tokenBridgeAddr: CONTRACTS.MAINNET.ethereum.token_bridge,
  wormholeChainId: CHAINS.ethereum,
};

const karuraTokenBridgeAddr = CONTRACTS.MAINNET.karura.token_bridge;

const attestToken = async (
  network: WormholeNetwork,
  tokenAddr: string,
  signerEth: Signer,
  signerKarura: Signer,
) => {
  console.log(`attesting token ${tokenAddr} on ${CHAIN_ID_TO_NAME[network.wormholeChainId]}...`)
  const networkTokenAttestation = await attestFromEth(network.tokenBridgeAddr, signerEth, tokenAddr);

  const emitterAddr = getEmitterAddressEth(network.tokenBridgeAddr);
  const sequence = parseSequenceFromLogEth(
    networkTokenAttestation,
    network.bridgeAddr
  );
  console.log(`waiting for vaa with sequence ${sequence}`);

  const { vaaBytes } = await getSignedVAAWithRetry(
    ['https://wormhole-v2-mainnet-api.certus.one'],
    network.wormholeChainId,
    emitterAddr,
    sequence,
    { transport: NodeHttpTransport() },
  );

  console.log(`creating wrapped token with vaa: [${uint8ArrayToHex(vaaBytes) }]`);
  await createWrappedOnEth(karuraTokenBridgeAddr, signerKarura, vaaBytes, gasOverride);
  const wrappedTokenAddress = await Bridge__factory.connect(karuraTokenBridgeAddr, signerKarura).wrappedAsset(
    network.wormholeChainId,
    Buffer.from(tryNativeToHexString(tokenAddr, network.wormholeChainId), 'hex'),
  );

  console.log('attest token finished!')
  console.log({
    sourceToken: tokenAddr,
    wrappedToken: wrappedTokenAddress,
  });
}

const getSigners = async (ethRpc: string, karuraNodeUrl: string) => {
  const providerEth = new JsonRpcProvider(ethRpc);
  const signerEth = new Wallet(privateKey, providerEth);

  const providerKarura = new EvmRpcProvider(karuraNodeUrl);
  await providerKarura.isReady();
  const signerKarura = new Wallet(privateKey, providerKarura);   // TODO: ethers 6.2 not compatible anymore?

  return {
    signerEth,
    signerKarura,
    providerKarura,
  }
}

const main = async () => {
  const ETH_RPC = 'https://eth-mainnet.public.blastapi.io';
  const KARURA_NODE_URL = 'wss://karura-rpc-0.aca-api.network';

  // const ETH_RPC = 'https://rpc.ankr.com/eth_goerli';
  // const KARURA_NODE_URL = 'wss://karura-dev.aca-dev.network/rpc/ws';

  const { signerEth, signerKarura, providerKarura } = await getSigners(ETH_RPC, KARURA_NODE_URL);

  const addresses = [
    '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
    '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
    '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
    '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    '0x4fabb145d64652a948d72533023f6e7a623c7c53',
    '0x514910771af9ca656af840dff83e8264ecf986ca',
    '0x4d224452801aced8b2f0aebe155379bb5d594381',
  ]

  for (const addr of addresses) {
    await attestToken(ethNetwork, addr, signerEth, signerKarura)
  }

  await providerKarura.disconnect();
};

main();
