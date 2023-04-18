import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { evmChai, Signer, getTestUtils } from '@acala-network/bodhi';
import HelloWorld from '../build/HelloWorld.json';

use(solidity);
use(evmChai);

describe('HelloWorld', () => {
  let wallet: Signer;
  let instance: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    wallet = (await getTestUtils(endpoint)).wallets[0];
    instance = await deployContract(wallet, HelloWorld);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
  });

  it('returns the right value after the contract is deployed', async () => {
    console.log(instance.address);
    expect(await instance.helloWorld()).to.equal('Hello World!');
  });
});
