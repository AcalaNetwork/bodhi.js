# Acala Arbitrager Example

## Whait is an Arbitrager

> Arbitrage is the purchase and sale of an asset in order to profit from a difference in the asset's
> price between marketplaces.

Arbitrager example uses [Scheduler](https://wiki.acala.network/build/development-guide/smart-contracts/advanced/use-on-chain-scheduler),
a built in service, to periodically asses which token to sell and which to buy. It uses [Oracle](https://wiki.acala.network/build/development-guide/smart-contracts/advanced/use-oracle-feeds)
to determine the price of each token and calculate which one it should buy and then initiates a swap
on Uniswap.

## Example usage

You can deploy the Arbitrager example to a local development network by using the provided scripts.

### Set up the development network

The local development network can be run in a Docker container or build & run directly form the
source.

If you prefer Docker, you need to run it and use the following command:

```
docker run --rm -p 9944:9944 acala/mandala-node:f3434935 --dev --ws-external --rpc-methods=unsafe --instant-sealing  -levm=trace
```

If you whish to build and run the local development network from source, you can clone the
[AcalaNetwork/Acala](https://github.com/AcalaNetwork/Acala) repository and follow the steps on how
to set it up under the chapter **3. BUILD**. or use the following commands:

<details>
    <summary>Barebone steps on setting up the network after the repository has been clones is available here</summary>

    curl https://sh.rustup.rs -sSf | sh

    git config --global submodule.recurse true

    make init

</details>

After you have setup the network, run it with in EVM compatibility mode:
```
make run-eth
```

### Setting up the Arbitrager

In order to be able to use the Arbitrager example you need to install its dependencies. To do you,
you need to have `nodejs` and `yarn` installed. Your node version has to be at least `v12.x`.

To install the required dependencies for this example, run:
```
rush update
```

To build the **Arbitrager** example, use:
```
yarn build
```

To deploy the example and see the demo operation of the **Arbitrager**, use:
```
yarn deploy
```

<details>
    <summary>
        If you are having issues with yarn deploy, use this command and contact us to provide
        assistance
    </summary>

    node --trace-warnings -r ts-node/register/transpile-only src/deploy.ts

</details>

## Demo

The `deploy` script that you run using `yarn deploy`, includes example of two swaps being made and
additional information.

Once you run it, the instances of *AUSD*, *DOT*, *Uniswap Factory* and *Uniswap Router* smart
contracts are deployed to your local development network. The output should first give you the
information about the addresses of Uniswap factory and router smart contract instances of your local
development network (these change every time you run the script):

```
{
  factory: '0x55A2f6658B942BC8a37FECA2d953dCA73F39b923',
  router: '0x9951F6Dc177C0FE1ba76d01566D586395089951e'
}
```

After the Uniswap information is displayed, the approvals for these tokens, to be handled by the
Uniswap Router instance, are initiated. Liquidity is set for our address that is being used for
deployment. Trading pair is created and liquidity information is retrieved.

Then the information about the trading pair is printed out. It contains the information about the
trading pair (in this example we are using AUSD and DOT and the address of it should change every
time you run the example as well) and information about the liquidity pool:

```
{
  tradingPair: '0xCD79aBb7B0E7dBABaC79899933cc5914F1176e39',
  lpTokenAmount: '999999999999000',
  liquidityPoolAmountAUSD: '1000000000000000',
  liquidityPoolAmountDOT: '1000000000000000'
}
```

After this information is displayed, **Arbitrager** smart contract is deployed. The constructor of
the **Arbitrager** smart contract receives the following parameters:

- Address of the Uniswap factory
- Address of the Uniswap router
- Address of the AUSD smart contract
- Address of the DOT smart contract
- Period to be passed to the **Scheduler**

The `period` parameter is used to set the minimum number of blocks the **Scheduler** has to wait
before calling the `trigger()` function.

When the **Arbitrager** smart contract is deployed the following steps occur:

1. It assigns the addresses passed to the constructor to the global variables
2. It approves the Uniswap router to handle the tokens owned by the address that deployed the
contract (in our case, that would be the *deployer*)
3. It schedules the call of the `trigger()` function with the native **Scheduler** smart contract

    - The period passed to the constructor is used to tell the **Scheduler** how many blocks should
    pass from the call being scheduled to its execution
    - All other inputs are hadcoded in this example
    - To read more about how **Scheduler** works, please consult the [wiki](https://wiki.acala.network/build/development-guide/smart-contracts/advanced/use-on-chain-scheduler)

After the **Arbitrager** is successfully deployed, the script transfers the tokens to its address.
The deploy script then sets the prices of the tokens in order for the **Arbitrager** to be able to
determine which token is should swap for which. The price of *AUSD* is set to *1000* and the price
of *DOT* is set to *2000*.

The balances of AUSD and DOT tokens for the **Arbitrager** smart contract and for the liquidity pool
are printed out:
```
{
  arbitrager: '0xDb19dB041b98d4b9a33c2Bf5C4986E8A0e8CC66F',
  amountAUSD: '10000000000000',
  amountDOT: '10000000000000',
  lpAmountAUSD: '1000000000000000',
  lpAmountDOT: '1000000000000000'
}
```

We wait for two block and the **Scheduler** calls the `trigger()` function in the **Arbitrager** and
the latter determines to swap *DOT* for *USDA*. This can be seen in the next printout:
```
{
  arbitrager: '0xDb19dB041b98d4b9a33c2Bf5C4986E8A0e8CC66F',
  amountAUSD: '10996006981039',
  amountDOT: '9000000000000',
  lpAmountAUSD: '999003993018961',
  lpAmountDOT: '1001000000000000'
}
```

When `trigger()` is called by the **Scheduler**, the **Arbitrager** determines which token to swap
for which by retrieving the balances and the prices of the token. It then calculates which and how
much of a certain token it should swap. At the end of its execution, it schedules another call with
**Scheduler** using the same `min_delay` as the first time, since it is stored in a global variable
called `period`.

The script then changes the prices of the tokens and sets the price of *AUSD* to *2000* and the
price of *DOT* to *1000*. Since we only waited for one block, the `trigger()` has not been called
yet:
```
{
  arbitrager: '0xDb19dB041b98d4b9a33c2Bf5C4986E8A0e8CC66F',
  amountAUSD: '10996006981039',
  amountDOT: '9000000000000',
  lpAmountAUSD: '999003993018961',
  lpAmountDOT: '1001900000000000'
}
```

After waiting for the additional two blocks, the balances are printed out for the last time and we
can see that the `trigger()` has been called again:
```
{
  arbitrager: '0xDb19dB041b98d4b9a33c2Bf5C4986E8A0e8CC66F',
  amountAUSD: '12694582322692',
  amountDOT: '7290000000000',
  lpAmountAUSD: '997305417677308',
  lpAmountDOT: '1002710000000000'
}
```
