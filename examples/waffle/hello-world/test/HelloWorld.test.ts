import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';

import { evmChai, Signer, TestProvider } from '@acala-network/bodhi';
import { WsProvider } from '@polkadot/api';

import HelloWorld from '../build/HelloWorld.json';

use(solidity);
use(evmChai);

const provider = new TestProvider({
  provider: new WsProvider('ws://localhost:9944')
});

describe('HelloWorld', () => {
  let wallet: Signer;
  let instance: Contract;

  before(async () => {
    [wallet] = await provider.getWallets();
    instance = await deployContract(wallet, HelloWorld);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('returns the right value after the contract is deployed', async () => {
    console.log(instance.address);
    expect(await instance.helloWorld()).to.equal('Hello World!');
  });
});
