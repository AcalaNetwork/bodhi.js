# Acala EVM Waffle Examples
These are some exmaples that demonstrate how to interact with Acala EVM+ with [ethers.js](https://docs.ethers.io/v5/) and [waffle](https://ethereum-waffle.readthedocs.io/en/latest/).

It's recommended to read through [basic bodhi usage](../../bodhi/README.md) before diving into the examples.

Note that these examples mainly use **Polkadot Signers** to interact with EVM+. For other tools that rely mostly on [JSON-RPC](https://eth.wiki/json-rpc/API), checkout these examples:
- [hardhat](https://github.com/AcalaNetwork/hardhat-tutorials)
- [truffle](https://github.com/AcalaNetwork/truffle-tutorials)

## Run
install all dependencies
```
rush update
```

compile and build all contracts
```
./run.sh build    # only rebuild if source file changed
./run.sh rebuild  # force rebuild all
```

start a local mandala node with docker
```
docker run -it --rm -p 9944:9944 -p 9933:9933 ghcr.io/acalanetwork/mandala-node:sha-f045637 --dev --instant-sealing --ws-external --rpc-port=9933 --rpc-external --rpc-cors=all --rpc-methods=unsafe
```

run all tests
```
[ENDPOINT_URL=ws://127.0.0.1:9944] ./run.sh test
```

build and run together
```
./run.sh run
```

or we can run tests for a single example:
```
rush update                       # install all deps (only need once)
cd some-example
rush build -t .                   # build only this project
[ENDPOINT_URL=xxxxx] yarn test    # run tests for this project
```

## Development
update dep package version for all examples
```
rush add -p <package> --all
```

update dep package version for a single example
```
cd <project>
rush add -p <package>
```

## Tips
- we only need to do `rush update` once, which will install deps to **all** examples
- `rushx` is an alternative to `yarn`, so we can also do `rushx test`

## More Resources
Read more about Acala EVM [here](https://wiki.acala.network/learn/basics/acala-evm)

Developer Guide [here](https://evmdocs.acala.network/)

Also checkout [ETHDenver Workshop](https://www.crowdcast.io/e/acala-ethdenver-2021), which demonstrates how to deploy a simple ERC20 contract, a complex project like Uniswap, and use the on-chain scheduler function to build a recurring payment DApp.