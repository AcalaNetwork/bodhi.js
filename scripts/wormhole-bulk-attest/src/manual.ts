import { AcalaJsonRpcProvider } from "@acala-network/eth-providers";
import { createWrappedOnEth, getEmitterAddressEth, getSignedVAA } from "@certusone/wormhole-sdk";
import { Wallet } from "ethers";
import dotenv from 'dotenv';
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";

dotenv.config();

const key = process.env.KEY;
if (!key) throw new Error('no key!');

(async () => {
  const srcTokenBridgeAddr = '0xDB5492265f6038831E89f495670FF909aDe94bd9';
  const emitterAddress = getEmitterAddressEth(srcTokenBridgeAddr);
  const sepoliaWhChainId = 10002;
  const signedVaa = await getSignedVAA(
    'https://api.testnet.wormholescan.io',
    sepoliaWhChainId,
    emitterAddress,
    "3270",
    { transport: NodeHttpTransport() }
  )
  console.log(signedVaa)

  const dstTokenBridgeAddr = '0xe157115ef34c93145Fec2FE53706846853B07F42';
  const provider = new AcalaJsonRpcProvider('https://eth-rpc-acala-testnet.aca-staging.network');
  const wallet = new Wallet(key, provider);
  const receipt = await createWrappedOnEth(dstTokenBridgeAddr, wallet, signedVaa.vaaBytes);
  console.log(receipt)
})()