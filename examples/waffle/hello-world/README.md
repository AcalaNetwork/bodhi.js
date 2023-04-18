# Waffle example: hello-world

## Table of contents

- [Waffle example: hello-world](#waffle-example-hello-world)
  - [Table of contents](#table-of-contents)
  - [About](#about)
  - [Setup an empty Waffle project](#setup-an-empty-waffle-project)
  - [Configure Waffle](#configure-waffle)
  - [Add a smart contract](#add-a-smart-contract)
  - [Add a test](#add-a-test)
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

```solidity
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
development (for testing) and `@acala-network/bodhi` dependency,
to be able to interact with the network. Use the following two lines of code to add them:

```
yarn add --dev @types/chai chai @types/mocha mocha
yarn add @acala-network/bodhi
```

Now that we have all of the necessary dependencies added to our project, let's start writing the
test. On the first line of the test, import the `expect` and `use` from `chai` dependency:

```ts
const { expect, use } = require("chai");
```

Import `deployContract` and `solidity` from `ethereum-waffle` and `Contract` from `ethers`:

```ts
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
```

Additionally we will need `evmChai`, `Signer` and `TestProvider` from `@acala-network/bodhi` and
`WsProvider` from `@polkadot/api`. Don't worry about importing `@polkadot/api` package, as it is a
dependent package of `@acala-network/bodhi` and is already added to the project:

```ts
import { evmChai, Signer, getTestUtils } from '@acala-network/bodhi';
import { WsProvider } from '@polkadot/api';
```

Now let's import the compiled smart contract and tell the test to use `solidity` and `evmChai`:

```ts
import HelloWorld from '../build/HelloWorld.json';

use(solidity);
use(evmChai);
```

The setup of the test is now done and we can start writing the content of the test. We will be
wrapping our test within a `describe` block, so add it below the `provider` definition:

```ts
describe("HelloWorld", () => {

});
```

The `describe` block will contain `before` and `after` action. The `before` action will assign
`Signer` to the `wallet` variable, that we define in the beginning of the block, and assign
`Contract` instance to the `instance` variable that we also define in the beginning of the
`describe` block. The `after` block will disconnect from the `provider`, severing the connection to
the chain, after the test successfuly execute:

```ts
    let wallet: Signer;
    let instance: Contract;

    before(async () => {
        const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
        wallet = (await getTestUtils(endpoint)).wallets[0];
        instance = await deployContract(wallet, HelloWorld);
    });

    after(async () => {
      provider.api.disconnect();
    });
```

To validate that the `helloWorld` variable was set correctly when the contract was deployed, we will
add an `it` block, in which we assert that the `helloWorld()` getter returns `"Hello World!"`:

```ts
    it("returns the right value after the contract is deployed", async () => {
      expect(await instance.helloWorld()).to.equal("Hello World!");
    });
```

With that, our test is ready to be run.

<details>
    <summary>Your test/HelloWorld.test.ts should look like this:</summary>

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
        wallet.provider.api.disconnect();
    });

    it('returns the right value after the contract is deployed', async () => {
        console.log(instance.address);
        expect(await instance.helloWorld()).to.equal('Hello World!');
    });
    });


</details>

To be able to run the tests, we will add an additional script to the `package.json`. Add this line
to the `scripts` section of your `package.json`:

```
    "test": "NODE_ENV=test mocha -r ts-node/register/transpile-only -r tsconfig-paths/register --timeout 50000 --no-warnings test/**/*.test.ts"
```

This script can be run using `yarn test` and pattern matches all the files in the `test` repository
that end with `.test.ts`. We don't need to specify the network that this test should run on, as we
have explicitly set the provider to connect to our local development network.

When you run the test with `yarn test`, your tests should pass with the following output:

```
yarn test


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ NODE_ENV=test mocha -r ts-node/register/transpile-only -r tsconfig-paths/register --timeout 50000 --no-warnings test/**/*.test.ts


  HelloWorld
    ✔ returns the right value after the contract is deployed


  1 passing (35s)

✨  Done in 53.61s.
```

## Summary

We have initiated an empty Waffle project and configured it to work with Acala EVM+. We added
`HelloWorld.sol` smart contract, that can be compiled using `yarn build` and wrote a test for it
which can be run using `yarn test`. Additionally we added the deploy script that can be run using
`yarn deploy`.