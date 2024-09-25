import { acala, karura, mandala } from 'viem/chains';
import { createWalletClient, getContractAddress, http, publicActions } from 'viem';
import { expect } from 'chai';
import { mnemonicToAccount } from 'viem/accounts';

import { acalaForkConfig } from './utils';
import EchoJson from '../artifacts/contracts/Echo.sol/Echo.json';

const TEST_MNEMONIC = 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm';
const account = mnemonicToAccount(TEST_MNEMONIC);

const targetChain = process.env.CHAIN ?? 'acalaFork';
const chainConfig = ({
  acalaFork: acalaForkConfig,
  mandala,
  karura,
  acala,
})[targetChain];

if (!chainConfig) {
  throw new Error('Invalid CHAIN env variable. Must be one { local, mandala, karura, acala }');
}

console.log(`creating client for ${chainConfig.name}`);
const client = createWalletClient({
  account,
  chain: chainConfig,
  transport: http(),
}).extend(publicActions);

describe('Echo contract', function () {
  it('can deploy, read, and write contract', async () => {
    /* ----------------- deploy ----------------- */
    const deployHash = await client.deployContract({
      abi: EchoJson.abi,
      args: [],
      bytecode: EchoJson.bytecode as `0x${string}`,
    });

    await client.waitForTransactionReceipt({ hash: deployHash });
    const tx = await client.getTransaction({ hash: deployHash });

    const contractAddr = getContractAddress({
      from: tx.from,
      nonce: BigInt(tx.nonce),
    });

    /* ----------------- read ----------------- */
    let echoValue = await client.readContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'echo',
    });
    expect(echoValue).to.equal('Deployed successfully!');

    /* ----------------- write ----------------- */
    const { request } = await client.simulateContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'scream',
      args: ['Hello World!'],
    });
    const callHash = await client.writeContract(request);
    await client.waitForTransactionReceipt({ hash: callHash });

    echoValue = await client.readContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'echo',
    });
    expect(echoValue).to.equal('Hello World!');
  });
});
