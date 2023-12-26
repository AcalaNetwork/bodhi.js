import { expect } from 'chai';
import { createWalletClient, http, getContractAddress, publicActions } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'

import EchoJson from '../artifacts/contracts/Echo.sol/Echo.json';

const TEST_MNEMONIC = 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm';
const account = mnemonicToAccount(TEST_MNEMONIC) 
const client = createWalletClient({
  account,
  chain: {
    name: 'local',
    id: 595,
    nativeCurrency: {
      name: 'acala',
      symbol: 'ACA',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['http://localhost:8545'] },
      public: { http: ['http://localhost:8545'] },
    },
    network: 'local',
  },
  transport: http('http://localhost:8545')
}).extend(publicActions)

describe('Echo contract', function () {
  it("can deploy, read, and write contract", async () => {
    /* ----------------- deploy ----------------- */
    const deployHash = await client.deployContract({
      abi: EchoJson.abi,
      args: [],
      bytecode: EchoJson.bytecode as `0x${string}`,
    })

    await client.waitForTransactionReceipt({ hash: deployHash })
    const tx = await client.getTransaction({ hash: deployHash })

    const contractAddr = getContractAddress({
      from: tx.from,
      nonce: BigInt(tx.nonce),
    })

    /* ----------------- read ----------------- */
    let echoValue = await client.readContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'echo',
    })
    expect(echoValue).to.equal('Deployed successfully!');

    /* ----------------- write ----------------- */
    const { request } = await client.simulateContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'scream',
      args: ['Hello World!'],
    })
    const callHash = await client.writeContract(request)
    await client.waitForTransactionReceipt({ hash: callHash })

    echoValue = await client.readContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'echo',
    })
    expect(echoValue).to.equal('Hello World!');
  })
});
