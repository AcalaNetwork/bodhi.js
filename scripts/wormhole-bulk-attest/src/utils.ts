import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { CHAINS, CONTRACTS, ChainId, attestFromEth, createWrappedOnEth, getEmitterAddressEth, getSignedVAAWithRetry, parseSequenceFromLogEth, tryNativeToHexString, uint8ArrayToHex } from '@certusone/wormhole-sdk';
import { Contract, Wallet } from 'ethers';
import { Interface, formatEther } from 'ethers/lib/utils';
import { JsonRpcProvider } from '@ethersproject/providers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

const ACALA_GAS_OVERRIDE = {
  gasPrice: '0x616dc303ea',
  gasLimit: '0x6fc3540',
};

export const ACALA = 'ACALA';
export const KARURA = 'KARURA';
export const ACALA_TESTNET = 'ACALA_TESTNET';
export const KARURA_TESTNET = 'KARURA_TESTNET';
export const ETH = 'ETH';
export const BSC = 'BSC';
export const ARB = 'ARB';
export const POLYGON = 'POLYGON';
export type NETWORK_NAME_MAINNET =
  typeof ACALA |
  typeof KARURA |
  typeof ETH |
  typeof BSC |
  typeof ARB |
  typeof POLYGON;
export type NETWORK_NAME =
  NETWORK_NAME_MAINNET |
  typeof ACALA_TESTNET |
  typeof KARURA_TESTNET;

interface WormholeNetwork {
  bridgeAddr: string;
  tokenBridgeAddr: string;
  wormholeChainId: ChainId;
  networkName: NETWORK_NAME;
}

const getWormholeNetwork = (networkName: NETWORK_NAME_MAINNET): WormholeNetwork => {
  const chainName = toWormholeChainName(networkName);
  return {
    networkName,
    bridgeAddr: CONTRACTS.MAINNET[chainName].core,
    tokenBridgeAddr: CONTRACTS.MAINNET[chainName].token_bridge,
    wormholeChainId: CHAINS[chainName],
  };
};

const getWormholeChainId = (networkName: NETWORK_NAME_MAINNET) => {
  return CHAINS[toWormholeChainName(networkName)];
};

const toWormholeChainName = (networkName: NETWORK_NAME_MAINNET) => {
  const nameMap = {
    [ACALA]: 'acala',
    [KARURA]: 'karura',
    [ACALA_TESTNET]: 'acala',
    [KARURA_TESTNET]: 'karura',
    [ETH]: 'ethereum',
    [ARB]: 'arbitrum',
    [BSC]: 'bsc',
    [POLYGON]: 'polygon',
  } as const;
  const chainName = nameMap[networkName];

  if (!chainName) {
    throw new Error(`unsupported network ${networkName}`);
  }

  return chainName;
};

export const getProvider = (networkName: NETWORK_NAME_MAINNET) => {
  const ethRpc = ({
    [ACALA]: 'https://eth-rpc-acala.aca-api.network',
    [KARURA]: 'https://eth-rpc-karura.aca-api.network',
    [ETH]: 'https://ethereum.publicnode.com',
    [ARB]: 'https://endpoints.omniatech.io/v1/arbitrum/one/public',
    [BSC]: 'https://bsc.publicnode.com',
    [POLYGON]: 'https://polygon.llamarpc.com',
  })[networkName];
  if (!ethRpc) throw new Error(`unsupported network ${networkName}`);

  return [ACALA, KARURA].includes(networkName)
    ? new AcalaJsonRpcProvider(ethRpc)
    : new JsonRpcProvider(ethRpc);
};

const getWrappedAddr = async (
  srcNetworkName: typeof ETH | typeof BSC | typeof ARB | typeof POLYGON,
  dstNetworkName: typeof KARURA | typeof ACALA,
  srcTokenAddr: string,
) => {
  const dstTokenBridge = getWormholeNetwork(dstNetworkName).tokenBridgeAddr;
  const srcWormholeChainId = getWormholeChainId(srcNetworkName);

  const tokenBridge = Bridge__factory.connect(dstTokenBridge, getProvider(dstNetworkName));
  return tokenBridge.wrappedAsset(
    srcWormholeChainId,
    Buffer.from(tryNativeToHexString(srcTokenAddr, srcWormholeChainId), 'hex'),
  );
};

const getTokenInfo = async (addr: string, provider: JsonRpcProvider) => {
  const erc20IFace = new Interface([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() external view returns (string)',
  ]);

  const contract = new Contract(addr, erc20IFace, provider);
  const [symbol, decimals, name] = await Promise.all([
    contract.symbol(),
    contract.decimals(),
    contract.name(),
  ]);

  return {
    symbol,
    decimals,
    name,
  };
};

export const attestToken = async (
  srcNetworkName: typeof ETH | typeof BSC | typeof ARB | typeof POLYGON,
  dstNetworkName: typeof KARURA | typeof ACALA,
  srcSigner: Wallet,
  dstSigner: Wallet,
  srcTokenAddr: string,
) => {
  const [srcBal, dstBal, tokenInfo] = await Promise.all([
    srcSigner.getBalance(),
    dstSigner.getBalance(),
    getTokenInfo(srcTokenAddr, srcSigner.provider as JsonRpcProvider)
  ]);

  console.log(`attesting token ${tokenInfo.symbol} from ${srcNetworkName} => ${dstNetworkName} ...`);
  console.log({
    srcBal: formatEther(srcBal),
    dstBal: formatEther(dstBal),
  });

  let wrappedTokenAddress = await getWrappedAddr(srcNetworkName, dstNetworkName, srcTokenAddr);
  if (wrappedTokenAddress !== NULL_ADDRESS) {
    console.log(`wrapped token already exist: ${wrappedTokenAddress}`);
  } else {
    const srcNetwork = getWormholeNetwork(srcNetworkName);
    const dstNetwork = getWormholeNetwork(dstNetworkName);

    console.log({
      srcNetwork,
      dstNetwork,
    });

    const attestTx = await attestFromEth(srcNetwork.tokenBridgeAddr, srcSigner, srcTokenAddr);

    const emitterAddr = getEmitterAddressEth(srcNetwork.tokenBridgeAddr);
    const sequence = parseSequenceFromLogEth(
      attestTx,
      srcNetwork.bridgeAddr
    );
    console.log(`waiting for vaa with sequence ${sequence}`);

    const { vaaBytes } = await getSignedVAAWithRetry(
      ['https://wormhole-v2-mainnet-api.certus.one'],
      srcNetwork.wormholeChainId,
      emitterAddr,
      sequence,
      { transport: NodeHttpTransport() },
    );

    console.log(`creating wrapped token with vaa: [${uint8ArrayToHex(vaaBytes)}]`);

    const override = dstNetworkName === ACALA
      ? ACALA_GAS_OVERRIDE
      : {};
    await createWrappedOnEth(dstNetwork.tokenBridgeAddr, dstSigner, vaaBytes, override);
    wrappedTokenAddress = await getWrappedAddr(srcNetworkName, dstNetworkName, srcTokenAddr);

    console.log('attest token finished!');
  }

  console.log({
    srcTokenInfo: {
      ...tokenInfo,
      chain: srcNetworkName,
      addr: srcTokenAddr,
    },
    dstTokenInfo: {
      ...(await getTokenInfo(wrappedTokenAddress, dstSigner.provider as JsonRpcProvider)),
      chain: dstNetworkName,
      addr: wrappedTokenAddress,
    }
  });
};
