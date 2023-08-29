# Acala EVM Waffle Examples
These are some exmaples that demonstrate how to interact with Acala EVM+ with [ethers.js](https://docs.ethers.io/v5/) and [waffle](https://ethereum-waffle.readthedocs.io/en/latest/).

It's recommended to read through [basic bodhi usage](../../packages/bodhi/README.md) before diving into the examples.

Note that the usecase for these examples is when **we already have a signer instance at hand**, such as from `polkadot.js` extension or `talisman` (in the examples we simulate a such wallet via `getTestUtils`).

For other tools that implement signers themselves, and rely mostly on [JSON-RPC](https://eth.wiki/json-rpc/API), checkout these examples:
- [hardhat](https://github.com/AcalaNetwork/hardhat-tutorials)
- [truffle](https://github.com/AcalaNetwork/truffle-tutorials)

## Run
first start a local bodhi stack with docker
```
# open a new terminal
cd ../
docker compose -f docker-compose-bodhi-stack.yml up
```

install all dependencies
```
yarn install --immutable
```

build an example
```
cd some-example
yarn build
```

run tests for the example:
```
[ENDPOINT_URL=xxxxx] yarn test
```

## More Resources
- Read more about Acala EVM+ [here](https://wiki.acala.network/learn/basics/acala-evm)
- EVM+ Developer Doc [here](https://evmdocs.acala.network/)
