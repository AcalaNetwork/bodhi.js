import { assert, expect } from 'chai';
import { getContractAddress } from 'viem';

import { ECHO_JSON as EchoJson } from './consts';
import { client } from './utils';

describe('Echo contract', function () {
  let contractAddr: `0x${string}`;

  it('deploy contract', async () => {
    const deployHash = await client.deployContract({
      abi: EchoJson.abi,
      bytecode: EchoJson.bytecode as `0x${string}`,
    });

    await client.waitForTransactionReceipt({ hash: deployHash });
    const tx = await client.getTransaction({ hash: deployHash });

    contractAddr = getContractAddress({
      from: tx.from,
      nonce: BigInt(tx.nonce),
    });
  });

  it('read and write contract', async () => {
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

  it('subscription', async () => {
    const msg = 'some mysterious msg';
    const msgHash = '0x9287dad622cb0d1809a6b37d936ec5ca8dd09645219887d4793fd63669f08715';
    let notified0 = false;
    let notified1 = false;

    // general subscription
    const unwatch0 = client.watchContractEvent({
      address: contractAddr,
      abi: EchoJson.abi,
      eventName: 'NewEcho',
      onLogs: logs => {
        expect(logs.length).to.equal(1);
        expect(logs[0].args.message).to.equal(msgHash);
        notified0 = true;
      },
    });

    // subscription with args
    const unwatch1 = client.watchContractEvent({
      address: contractAddr,
      abi: EchoJson.abi,
      eventName: 'NewEcho',
      args: { message: msg },
      onLogs: logs => {
        expect(logs.length).to.equal(1);
        expect(logs[0].args.message).to.equal(msgHash);
        notified1 = true;
      },
    });

    // subscription that should not trigger
    const unwatch2 = client.watchContractEvent({
      address: contractAddr,
      abi: EchoJson.abi,
      eventName: 'NewEcho',
      args: { message: 'rand msg' },
      onLogs: _logs => {
        expect.fail('should not trigger');
      },
    });

    const { request } = await client.simulateContract({
      address: contractAddr,
      abi: EchoJson.abi,
      functionName: 'scream',
      args: [msg],
    });
    const callHash = await client.writeContract(request);
    await client.waitForTransactionReceipt({ hash: callHash });

    await new Promise(resolve => setTimeout(resolve, 5000));    // wait for the notification
    expect(notified0).to.be.true;
    expect(notified1).to.be.true;

    unwatch0();
    unwatch1();
    unwatch2();
  });
});
