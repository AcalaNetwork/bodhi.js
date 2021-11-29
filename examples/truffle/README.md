# Truffle example: hello-world

## Table of contents

- [About](#about)
- [Setup an empty Truffle project](#setup-an-empty-truffle-project)
- [Configure Truffle](#configure-truffle)
- [Add a smart contract](#add-a-smart-contract)
- [Add a test](#add-a-test)
- [Add a deploy script](#add-a-deploy-script)
- [Summary](#summary)

## About

This is a basic example on how to setup your Truffle development environment as well as testing and
deployment configuration to be compatible with Acala EVM+. It contains a rudimentary
[HelloWorld](./contracts/HelloWorld.sol) smart contract and the required configurations and
migrations in order to test and deploy it.

## Setup an empty Truffle project

Assuming you have [Truffle](https://www.trufflesuite.com/docs/truffle/getting-started/installation)
and yarn installed, we can jump right into creating a new Truffle project.

<details>
    <summary>You can install Truffle using the following command:</summary>

    yarn add -g truffle

</details>

1. Open a terminal window in a directory where you want your hello-world example to reside and
create a directory for it and then initialize a yarn project within it, as well as add Truffle as a
dependency, with the following commands:

```
mkdir hello-world
cd hello-world
yarn init --yes
yarn add truffle
truffle init
```

In addition to initiating a Truffle project, Truffle has already created `contracts`, `migrations`
and `test` directories that we reqiure for this tutorial.

## Configure Truffle

As we will be using Truffle to compile, test and deploy the smart contract, we need to configure it.
Uncomment the following line in the `truffle-config.js`:

**For me this is line 21, so even if there is any discrepancy between Truffle versions, this should
narrow down the search.**

```
const HDWalletProvider = require('@truffle/hdwallet-provider');
```

As you may have noticed, we are importing `@truffle/hdwallet-provider`, so we need to add it to the
project. Let's add it as a develoment dependency:

```
yarn add --dev @truffle/hdwallet-provider
```

We will be enabling a classic local development network (like [Ganache](https://www.trufflesuite.com/ganache)) 
as well as Mandala local development network. Both need to be added to the configuration. Let's
first enable the classic local development network by ucommenting the section in `truffle-config.js`
(just like *HDWalletProvider*, this section is from line 44 to line 48 in my file):

```
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
```

Now that the classic development network is enabled, let's add the Mandala configuration. Paste the
following configuration below the `development` network configuration:

```
    mandala: {
      provider: () => new HDWalletProvider(["0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f"],"http://127.0.0.1:3330"),
      network_id: 595,
      gasPrice: 429496729610000, // storage_limit = 100000, validUntil = 10000, 100000 << 32 | 10000
      timeoutBlocks: 25,
      confirmations: 0
    },
```

Let's break down this configuration:

- `provider` uses the `HDWalletProvided` that we imported. We pass the default Mandala development
account to it as well as the default URL for the ETH-RPC adapter for local Mandala development
network.
- `network_id` is the default network ID of the development Mandala network.
- `gasPrice` is the default gas price for the local development Mandala network. Commented out
section reperesents additional paramerters of Acala EVM+.
- `timeoutBlocks` and `confirmations` are set to our discression and we opted for the values above
in this tutorial.

Now that Mandala local development network is added to our project, let's take care of the remaining
configuration. Mocha timeout should be active, to make sure that we don't get stuck in a loop if
something goes wrong during tests. For this line 85 (this is after the modifications) in
`truffle-config.js` should be uncommented:

```
    timeout: 100000
```

Lastly, let's set the compiler version to `0.8.9` as this is the Solidity version we will be using
in our example smart contract. To do this, line 91 needs to be uncommented and modified to:

```
      version: "0.8.9",    // Fetch exact version from solc-bin (default: truffle's version)
```

## Add a smart contract

In this tutorial we will be adding a simple smart contract that only stores one value that we can
query: `Hello World!`. To do that, we can use the Truffle built-in utility `create`:

```
truffle create contract HelloWorld
```

This command created a `HelloWorld.sol` file with a skeleton smart contract within `contracts`
directory. First line of this smart contract should specify the exact version of Solidity we will be
using, which is `0.8.9`:

```
pragma solidity =0.8.9;
```

Now let's add a public `helloWorld` variable and assign a `Hello World!` value to it in the
beginnging of the smart contract. We should also remove `public` visibility setting of the
`constructor()` as the compiler ignores it anyway. Replace the body of the smart contract with the
following code:

```
    string public helloWorld = 'Hello World!';

    constructor() {}
```

**NOTE: Make sure that the `helloWorld` variable visibility is set to public, as this will cause the
compiler to create a `helloWorld()` getter, which we will use to validate the successful deployment
of our smart contract.**

<details>
    <summary>Your smart contract in HelloWorld.sol should look like this:</summary>

    // SPDX-License-Identifier: MIT
    pragma solidity =0.8.9;

    contract HelloWorld {
        string public helloWorld = 'Hello World!';

        constructor() {}
    }

</details>

Now that we have the smart contract ready, we have to compile it. For this, we will add the `build`
script to the `package.json`. To do this, we have to add `scripts` section to it. We will be using
Truffle's compile functionality, so the `scripts` section should look like this:

```
  "scripts": {
    "build": "truffle compile"
  }
```

When you run the `build` command using `yarn build`, the `build` directory is created and it
contains the compiled smart contract.

## Add a test

To add a test for the smart contract, we can again use the Truffle built-in `create` utility:

```
truffle create test HelloWorld
```

This creates a `hello_world.js` file in `test` directory and we can start writing the tests. If you
open the file, you can see that Truffle has already imported our smart contract in the first line of
the file, so we can jump right into writing the tests. First we will create a `before` action. We
require one globally available variable, called `instance`, that will hold the information about the
deployed smart contract. The `before` action in itself will just make sure that the smart contract
is deployed. To add it, replace the current `it` block with the following code:

```
  let instance;

  before("setup development environment", async function () {
    instance = await HelloWorld.deployed();
    return assert.isTrue(true);
  });
```

Now that we have everything set up, let's add a new `it` block, in which we will test that the right
value is assigned to the `helloWorld` variable:

```
  it("returns the right value after the contract is deployed", async function() {
      
  });
```

The last step in building our example test is to get the value of the `helloWorld` variable from the
smart contract and assert that is is equal to `Hello World!`. To do this, place the following two
lines into the `it` block:

```
    const hello_world = await instance.helloWorld();

    expect(hello_world).to.equal("Hello World!");
```

<details>
    <summary>Your test/hello_world.js should look like this:</summary>

    const HelloWorld = artifacts.require("HelloWorld");

    /*
    * uncomment accounts to access the test accounts made available by the
    * Ethereum client
    * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
    */
    contract("HelloWorld", function (/* accounts */) {
        let instance;

        before("setup development environment", async function () {
            instance = await HelloWorld.deployed();
            return assert.isTrue(true);
        });

        it("returns the right value after the contract is deployed", async function() {
            const hello_world = await instance.helloWorld();

            expect(hello_world).to.equal("Hello World!");
        });
    });


</details>

To be able to run the tests, we will add two additional scripts to the `package.json`. One script
will be used to test on a traditional local development network and one will be used to test on a
Mandala local development network. We already added both into the `network` section of
`truffle-config.js`. Add these lines to the `scripts` section of your `package.json`:

```
    "test": "truffle test",
    "test-mandala": "truffle test --network mandala"
```

This script can be run using `yarn test` or `yarn test-mandala`, depending on which network we want
to use to run the tests.

**NOTE: To be able to run the tests in Truffle, we need to add a migration for the smart contracts
that we are testing. We will do this in the next section of this tutorial.**

When you run the test with `yarn test`, your tests should pass with the following output:

```
yarn test


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ truffle test
Using network 'development'.


Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.

Deploying HelloWorld
HelloWorld deployed at: 0xC1a9a4fAed294383EC9918078417FA348090964b


  Contract: HelloWorld
    ✓ returns the right value after the contract is deployed (40ms)


  1 passing (134ms)

✨  Done in 18.41s.
```

## Add a deploy script

Finally let's add a script that deploys the example smart contract. We can again use Truffle
built-in utility `create` to create a migration file:

```
truffle create migration HelloWorld
```

The utility created a barebones migration file in the `migrations` folder. First thing we need to do
is import our smart contract into it. We do this with the following line of code at the top of the
file:

```
const HelloWorld = artifacts.require("HelloWorld");
```

To make sure that our migration will successfully deploy our smart contract, we have to make sure
that our `deployer` is ready. To do that, we need to modfy the deployment function to be
asynchronous. Replace the 3rd line of the migration with:

```
module.exports = async function (deployer) {
```

Now that we have the smart contract imported within the migration, we can deploy the smart contract.
We do this by invoking `deployer`, which is defined in the definition of the function. Additionally
we will output the address of the deployed smart contract:

```
  console.log("Deploying HelloWorld");

  await deployer.deploy(HelloWorld);

  console.log("HelloWorld deployed at:", HelloWorld.address);
```

This completes our migration and allows us to deploy the example smart contract as well as run tests
for it.

<details>
    <summary>Your HelloWorld migration should look like this:</summary>

    const HelloWorld = artifacts.require("HelloWorld");

    module.exports = async function(deployer) {
        // Use deployer to state migration tasks.
        console.log("Deploying HelloWorld");

        await deployer.deploy(HelloWorld);

        console.log("HelloWorld deployed at:", HelloWorld.address);
    };

</details>

All that is left to do is update the `scripts` section in the `package.json` with the `deploy` and
`deploy-mandala` scripts. To add these scripts to your project, place the following lines within
`scripts` section of the `package.json`:

```
    "deploy": "truffle migrate",
    "deploy-mandala": "truffle migrate --network mandala"
```

Running the `yarn deploy` script should return the following output:

```
yarn deploy


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ truffle migrate

Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.



Starting migrations...
======================
> Network name:    'development'
> Network id:      1637493978695
> Block gas limit: 6721975 (0x6691b7)


1637495010_hello_world.js
=========================
Deploying HelloWorld

   Deploying 'HelloWorld'
   ----------------------
   > transaction hash:    0xfc4edba5e6266a8504a8cd49298600e2cb46f4a336b05100a078ab9e0be1c3a9
   > Blocks: 0            Seconds: 0
   > contract address:    0x3493cD3C0F5B5EE72733F302f460dAD06f81b29e
   > block number:        23
   > block timestamp:     1637503061
   > account:             0x9fc75A752a8672b570819Ad8f29277A8E27F33CB
   > balance:             99.93235234
   > gas used:            199289 (0x30a79)
   > gas price:           20 gwei
   > value sent:          0 ETH
   > total cost:          0.00398578 ETH

HelloWorld deployed at: 0x3493cD3C0F5B5EE72733F302f460dAD06f81b29e

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:          0.00398578 ETH


Summary
=======
> Total deployments:   1
> Final cost:          0.00398578 ETH


✨  Done in 22.81s.
```

## Summary

We have initiated an empty Truffle project and configured it to work with Acala EVM+. We added
`HelloWorld.sol` smart contract, that can be compiled using `yarn build`, and wrote a test for it,
which can be run using `yarn test` or `yarn test-mandala`. Additionally we added the deploy script
that can be run using `yarn deploy` or `yarn deploy-mandala`.