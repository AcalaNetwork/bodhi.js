# Waffle example: hello-world

## Table of contents

- [About](#about)
- [Setup an empty Waffle project](#setup-an-empty-Waffle-project)
- [Configure Waffle](#configure-Waffle)
- [Add a smart contract](#add-a-smart-contract)
- [Add a test](#add-a-test)
- [Add a deploy script](#add-a-deploy-script)
- [Summary](#summary)

## About

This is a basic example on how to setup your Waffle development environment as well as testing and
deployment configuration to be compatible with Acala EVM+. It contains a rudimentary
[HelloWorld](./contracts/HelloWorld.sol) smart contract and the required configurations and scripts
in order to test and deploy it.

## Setup an empty Waffle project

Assuming you have yarn installed, we can jump right into creating a new Waffle project.

1. Open a terminal window in a directory where you want your hello-world example to reside and
create a directory for it and then initialize a yarn project within it, as well as add Waffle as a
development dependency, with the following commands:

```
mkdir hello-world
cd hello-world
yarn init --yes
yarn add --dev ethereum-waffle
```

## Configure Waffle

As we will be using Waffle to compile the smart contract, we need to configure it. Add `waffle.json`
file to the root direcory of this example and paste the following code into it:

```
{
  "compilerType": "solcjs",
  "compilerVersion": "0.8.9",
  "sourceDirectory": "./contracts",
  "outputDirectory": "./build"
}
```

Let's break down this configuration:

- `solcjs` as a compiler type tells Waffle which compiler to use. In our case we won't be using a
dockerized or local compiler, because our smart contract is very simple and we won't benefit from
any of the advantages we would get from these two.
- `compilerVersion` lets Waffle know which version of Solitiy we will be using.
- `sourceDirectory` specifies the directory that contains the source code of our smart contract.
- `outputDirectory` specifies which directory the compiled smart contract should be saved to. Don't
worry that there is no `build` directory in this project, because Waffle will create it when needed.

If you looked at the Hardhat or Truffle examples, you might have noticed, that we had to specify the
`mandala` network for those two to be able to connect to the local development network. We don't
need to do it here, because the network information will be passed to the test and deployment
scripts directly.

## Add a smart contract

In this tutorial we will be adding a simple smart contract that only stores one value that we can
query: `Hello World!`. To do that, we have to create a directory called `contracts` and create a
`HelloWorld.sol` file within it:

```
mkdir contracts && touch contracts/HelloWorld.sol
```

As the example is prety simple, we won't be going into too much detail on how it is structured. We
are using Solidity version `0.8.9` and it contains a public `helloWorld` variable, to which we
assign the value `Hello World!`. It is important to set the visibility of this variable to public,
so that the compiler builds a getter function for it. The following code should be copy-pasted into
the `HelloWorld.sol`:

```
pragma solidity =0.8.9;

contract HelloWorld{
    string public helloWorld = 'Hello World!';

    constructor() {}
}
```

Now that we have the smart contract ready, we have to compile it. For this, we will add the `build`
script to the `package.json`. To do this, we have to add `scripts` section to it. We will be using
Waffle's compile functionality, so the `scripts` section should look like this:

```
  "scripts": {
    "build": "waffle"
  }
```

When you run the `build` command using `yarn build`, the `build` directory is created and it
contains the compiled smart contract.

## Add a test

To add a test, for the smart contract we just created, create a `test` directory and within it a
`HelloWorld.test.ts` file:

```
mkdir test && touch test/HelloWorld.test.ts
```

As you can see, we will be using TypeScript to write the tests, so we need to add it to the project.
We need to add two dependencies in order to support it, `ts-node` and `typescript`. Add them as
development dependencies with:

```
yarn add --dev ts-node typescript
```

Now that we added TypeScript to our project, we need to configure it. To do that, create a
`tsconfig.json` file in the root of the project and copy the following configuration into it:

```
{
  "compilerOptions": {
    "declaration": true,
    "esModuleInterop": true,
    "lib": [
      "ES2018"
    ],
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2018"
  }
}
```

In addition to the TypeScript, we will be using the `chai` and `mocha` dependencies in
development (for testing) and `@acala-network/bodhi` as well as `@acala-network/api` dependencies,
to be able to interact with the network. Use the following two lines of code to add them:

```
yarn add --dev @types/chai chai @types/mocha mocha
yarn add @acala-network/api @acala-network/bodhi
```

Now that we have all of the necessary dependencies added to our project, let's start writing the
test. On the first line of the test, import the `expect` and `use` from `chai` dependency:

```
const { expect, use } = require("chai");
```

Import `deployContract` and `solidity` from `ethereum-waffle` and `Contract` from `ethers`:

```
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
```

Additionally we will need `evmChai`, `Signer` and `TestProvider` from `@acala-network/bodhi` and
`WsProvider` from `@polkadot/api`. Don't worry about importing `@polkadot/api` package, as it is a
dependent package of `@acala-network/api` and is already added to the project:

```
import { evmChai, Signer, TestProvider } from '@acala-network/bodhi';
import { WsProvider } from '@polkadot/api';
```

Now let's import the compiled smart contract and tell the test to use `solidity` and `evmChai`:

```
import HelloWorld from '../build/HelloWorld.json';

use(solidity);
use(evmChai);
```

To be able to connect to the network, we need to define the provider. Unlike the Truffle and Hardhat
example, we don't need to connect to a RPC node, but we can connect directly to a network using our
own provider. We will use the `TestProvider`, which will in turn use `WsProvider`, both of which, we
already imported. We will pass the web socket URL of our local development network to the provider:

```
const provider = new TestProvider({
  provider: new WsProvider("ws://127.0.0.1:9944"),
});
```

The setup of the test is now done and we can start writing the content of the test. We will be
wrapping our test within a `describe` block, so add it below the `provider` definition:

```
describe("HelloWorld", () => {

});
```

The `describe` block will contain `before` and `after` action. The `before` action will assign
`Signer` to the `wallet` variable, that we define in the beginning of the block, and assign
`Contract` instance to the `instance` variable that we also define in the beginning of the
`describe` block. The `after` block will disconnect from the `provider`, severing the connection to
the chain, after the test successfuly execute:

```
    let wallet: Signer;
    let instance: Contract;

    before(async () => {
      [wallet] = await provider.getWallets();
      instance = await deployContract(wallet, HelloWorld);
    });

    after(async () => {
      provider.api.disconnect();
    });
```

To validate that the `helloWorld` variable was set correctly when the contract was deployed, we will
add an `it` block, in which we assert that the `helloWorld()` getter returns `"Hello World!"`:

```
    it("returns the right value after the contract is deployed", async () => {
      expect(await instance.helloWorld()).to.equal("Hello World!");
    });
```

With that, our test is ready to be run.

<details>
    <summary>Your test/HelloWorld.test.ts should look like this:</summary>

    import { deployContract, solidity } from 'ethereum-waffle';
    import { Contract } from 'ethers';

    import { evmChai, Signer, TestProvider } from '@acala-network/bodhi';
    import { WsProvider } from '@polkadot/api';

    import HelloWorld from '../build/HelloWorld.json';

    const { expect, use } = require("chai");

    use(solidity);
    use(evmChai);

    const provider = new TestProvider({
        provider: new WsProvider("ws://127.0.0.1:9944")
    });

    describe("HelloWorld", () => {
        let wallet: Signer;
        let instance: Contract;

        before(async () => {
            [wallet] = await provider.getWallets();
            instance = await deployContract(wallet, HelloWorld);
        });

        after(async () => {
            provider.api.disconnect();
        });

        it("returns the right value after the contract is deployed", async () => {
            expect(await instance.helloWorld()).to.equal("Hello World!");
        });
    });

</details>

To be able to run the tests, we will add an additional script to the `package.json`. Add this line
to the `scripts` section of your `package.json`:

```
    "test": "export NODE_ENV=test && mocha -r ts-node/register/transpile-only --timeout 50000 --no-warnings test/**/*.test.ts"
```

This script can be run using `yarn test` and pattern matches all the files in the `test` repository
that end with `.test.ts`. We don't need to specify the network that this test should run on, as we
have explicitly set the provider to connect to our local development network.

When you run the test with `yarn test`, your tests should pass with the following output:

```
yarn test


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ export NODE_ENV=test && mocha -r ts-node/register/transpile-only --timeout 50000 --no-warnings test/**/*.test.ts


  HelloWorld
    ✔ returns the right value after the contract is deployed


  1 passing (35s)

✨  Done in 53.61s.
```

## Add a deploy script

Finally let's add a script that deploys the example smart contract. To do this, we first have to add
a `src` directory and place `deploy.ts` within it. We will be using an additional setup script, that
will give us the artifacts needed to connect to the network, so we need to add a `setup.ts` script
to the `src` directory as well:

```
mkdir src && touch src/deploy.ts && touch src/setup.ts
```

Let's build the `setup.ts` first, as we will be importing it into the `deploy.ts`. First we need to
import the required artifacts from the dependencies of the project:

```
import { Provider, Signer, AccountSigningKey } from '@acala-network/bodhi';
import { Keyring, WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { KeyringPair } from '@polkadot/keyring/types';
```

Next, let's define the constants that we will be using within the setup. These are defined in a way,
that they first check for environment variables and if they are missing, they default to hardcoded
values. In our case the backup web socket URL for the network connection endpoint is hardcoded, but
the seed is left blank as we will take care of the missing seed in the `setup()` function:

```
const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:9944';
const seed = process.env.SEED;
```

Our `setup.ts` is now prepared for the content. First thing that we should add now is the definition
of the `setup()` function and its export statement:

```
const setup = async () => {
    
}

export default setup;
```

The `setup()` function needs to be filled with the content. At its beginning, right after the `{`
opening bracket, we define the provider:

```
    const provider = new Provider({
        provider: new WsProvider(WS_URL),
    })
```

We need to make sure that the communication with the chain is established, before we try to
communicate with it, or our communication will be lost:

```
    await provider.api.isReady;
```

Now we will define the pair. Here is where we make sure that even if there is no seed defined as an
environment variable, we are still able to deploy to a local development network:

```
    let pair: KeyringPair;
    if (seed) {
        const keyring = new Keyring({ type: 'sr25519' });
        pair = keyring.addFromUri(seed);
    } else {
        const testPairs = createTestPairs()
        pair = testPairs.alice
    }
```

Next we define a `signingKey` with which we are able to sign transactions:

```
    const signingKey = new AccountSigningKey(provider.api.registry);
    signingKey.addKeyringPair(pair);
```

Lastly we define the `wallet` and return the `wallet` and `provider`, so that we are able to use
them in the `deploy.ts`:

```
    const wallet = new Signer(provider, pair.address, signingKey);
    return {
        wallet, provider
    };
```

This completes our `setup.ts` and allows us to move on to `deploy.ts`.

<details>
    <summary>Your src/setup.ts should look like this:</summary>

    import { Provider, Signer, AccountSigningKey } from '@acala-network/bodhi';
    import { Keyring, WsProvider } from '@polkadot/api';
    import { createTestPairs } from '@polkadot/keyring/testingPairs';
    import { KeyringPair } from '@polkadot/keyring/types';

    const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:9944';
    const seed = process.env.SEED;

    const setup = async () => {
        const provider = new Provider({
            provider: new WsProvider(WS_URL),
        })

        await provider.api.isReady;

        let pair: KeyringPair;
        if (seed) {
            const keyring = new Keyring({ type: 'sr25519' });
            pair = keyring.addFromUri(seed);
        } else {
            const testPairs = createTestPairs()
            pair = testPairs.alice
        }

        const signingKey = new AccountSigningKey(provider.api.registry);
        signingKey.addKeyringPair(pair);

        const wallet = new Signer(provider, pair.address, signingKey);
        return {
            wallet, provider
        };
    }

    export default setup;

</details>

To build `deploy.ts`, we need to import the required artifacts from dependencies as well as the
compiled smart contract and `setup.ts`. We need to specify that is should use `evmChai` as well:

```
import { use } from 'chai';
import { ContractFactory } from 'ethers';

import { evmChai } from '@acala-network/bodhi';

import HelloWorld from '../build/HelloWorld.json';
import setup from './setup';

use(evmChai);
```

The content of the `deploy.ts` contains definition of `main()` function and its initiation:

```
const main = async () => {
    
}

main()
```

In the `main()` function, we first assign `wallet` and `provider` from the `setup.ts`, then we
deploy the example smart contract and save its information to `instance`. Once the smart contract is
deployed, we use the `helloWorld()` getter function to get the value stored within it and output the
value to the console. Lastly we disconnect from the provider, with which we sever the connection to
the blockchain:

```
    const { wallet, provider } = await setup();

    console.log('Deploy HelloWorld');

    const instance = await ContractFactory.fromSolidity(HelloWorld).connect(wallet).deploy();

    const variable = await instance.helloWorld();

    console.log("Stored variable:", variable);

    provider.api.disconnect();
```

<details>
    <summary>Your src/deploy.ts should look like this:</summary>

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

        const variable = await instance.helloWorld();

        console.log("Stored variable:", variable);

        provider.api.disconnect();
    }

    main()

</details>

All that is left to do is update the `scripts` section in the `package.json` with the `deploy`
script. To add this script to your project, place the following line within `scripts` section of the
`package.json`:

```
    "deploy": "ts-node --transpile-only src/deploy.ts"
```

Running the `yarn deploy` script should return the following output:

```
yarn deploy


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ ts-node --transpile-only src/deploy.ts

Deploy HelloWorld
Stored variable: Hello World!
✨  Done in 17.75s.
```

## Summary

We have initiated an empty Waffle project and configured it to work with Acala EVM+. We added
`HelloWorld.sol` smart contract, that can be compiled using `yarn build` and wrote a test for it
which can be run using `yarn test`. Additionally we added the deploy script that can be run using
`yarn deploy`.