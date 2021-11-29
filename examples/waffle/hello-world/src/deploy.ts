import { use } from 'chai';
import { ContractFactory } from 'ethers';

import { evmChai } from '@acala-network/bodhi';

import HelloWorld from '../build/HelloWorld.json';
import setup from './setup';

use(evmChai);

const main = async () => {
  const { wallet, provider } = await setup();

  console.log('Deploy HelloWorld');

  const instance = await ContractFactory.fromSolidity(HelloWorld).connect(wallet).deploy();

  console.log('HelloWorld address:', instance.address);

  const variable = await instance.helloWorld();

  console.log('Stored variable:', variable);

  provider.api.disconnect();
};

main();
