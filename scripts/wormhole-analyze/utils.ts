import {
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
  CONTRACTS,
  ParsedVaa,
  getEmitterAddressEth,
  getSignedVAAWithRetry,
  parseSequenceFromLogEth,
  parseTokenTransferVaa,
  parseVaa,
} from '@certusone/wormhole-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import axios from 'axios';

const GUARDIAN_RPC = [
  'https://wormhole-v2-mainnet-api.certus.one',
  'https://wormhole.inotel.ro',
  'https://wormhole-v2-mainnet-api.mcf.rocks',
  'https://wormhole-v2-mainnet-api.chainlayer.network',
  'https://wormhole-v2-mainnet-api.staking.fund',
  'https://wormhole-v2-mainnet.01node.com',
];
const KARURA_ETH_RPC = 'https://eth-rpc-karura.aca-api.network';
const ACALA_ETH_RPC = 'https://eth-rpc-acala.aca-api.network';

type KorA = typeof CHAIN_ID_KARURA | typeof CHAIN_ID_ACALA;

const vaaCache = {
  [CHAIN_ID_KARURA]: {} as Record<string, ParsedVaa>,
  [CHAIN_ID_ACALA]: {} as Record<string, ParsedVaa>,
};
export const getSignedVAAFromSequence = async (sequence: string, chainId: KorA) => {
  const cached = vaaCache[chainId][sequence];
  if (cached) return cached;

  const tokenBridgeAddr = chainId === CHAIN_ID_KARURA
    ? CONTRACTS.MAINNET.karura.token_bridge
    : CONTRACTS.MAINNET.acala.token_bridge; 
  const emitterAddress = getEmitterAddressEth(tokenBridgeAddr);
  const { vaaBytes } = await getSignedVAAWithRetry(
    GUARDIAN_RPC,
    chainId,
    emitterAddress,
    sequence,
    { transport: NodeHttpTransport() },
  );

  const signedVaa = parseVaa(vaaBytes);
  vaaCache[chainId][sequence] = signedVaa;

  return signedVaa;
};

export const getVaaFromTxHash = async (txHash: string, chainId: KorA) => {
  const ethRpc = chainId === CHAIN_ID_KARURA
    ? KARURA_ETH_RPC
    : ACALA_ETH_RPC;
  const provider = new JsonRpcProvider(ethRpc);
  const receipt = await provider.getTransactionReceipt(txHash);

  const coreBridgeAddr = chainId === CHAIN_ID_KARURA
    ? CONTRACTS.MAINNET.karura.core
    : CONTRACTS.MAINNET.acala.core;
  const sequence = parseSequenceFromLogEth(receipt, coreBridgeAddr);
  return await getSignedVAAFromSequence(sequence, chainId);
};

const FINALIZATION_TIME = 0.6;
const timeDiff = (t1: string, t2: string) => {
  const date1 = new Date(t1);
  const date2 = new Date(t2);

  const diffInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
  const diffInMinutes = diffInMilliseconds / 1000 / 60; // convert milliseconds to minutes

  return Math.floor(diffInMinutes - FINALIZATION_TIME);
};

interface VaaInfo {
  timestamp: string;
  updatedAt: string;
  indexedAt: string;
  sequence: string;
  vaa: string;    // this vaa format is odd, can't parse
}
interface VaaRes {
  data: VaaInfo[];
}
export const getBatchVaaInfo = async (chainId: KorA, size = 100) =>  {
  const res = await axios.get<VaaRes>(`https://api.wormscan.io/api/v1/vaas/${chainId}?pageSize=${size}`);
  return res.data.data as VaaInfo[];
};

export const getBatchVaaDelay = async (chainId: KorA, size = 100) =>  {
  const res = await getBatchVaaInfo(chainId, size);
  return res.map(d => timeDiff(d.timestamp, d.indexedAt));
};

export const getGuardianSigCount = async (chainId: KorA, size = 100, sort = true) =>  {
  const res = await getBatchVaaInfo(chainId, size);
  const parsedVaas = await Promise.all(res.map(r => getSignedVAAFromSequence(r.sequence, chainId)));
  const allIdxs = parsedVaas.map(v => v.guardianSignatures.map(s => s.index));

  const sigCounts = new Array(19).fill(0);
  for (const idxs of allIdxs) {
    for (const idx of idxs) {
      sigCounts[idx] += 1;
    }
  }

  const tableData = sigCounts.reduce((acc, sigCount, idx) => {
    const percent = Math.floor(sigCount / size * 100);
    acc.push({
      name: `Guardian ${idx}`,
      sigCount: sigCount,
      percent: percent,
    });

    return acc;
  }, [])

  return sort
    ? tableData.sort((a, b) => b.sigCount - a.sigCount)
    : tableData;
};
