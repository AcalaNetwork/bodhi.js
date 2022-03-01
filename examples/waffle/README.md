# Acala EVM Waffle Examples

ETHDenver Workshop Link: https://www.crowdcast.io/e/acala-ethdenver-2021

This workshop is for learning to use Acala EVM. It demonstrates how to deploy a simple ERC20 contract, a complex project like Uniswap, and use the on-chain scheduler function to build a recurring payment DApp.

Read more about Acala EVM [here](https://wiki.acala.network/learn/basics/acala-evm)
Developer Guide [here](https://wiki.acala.network/build/development-guide/smart-contracts/get-started-evm)

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

if testing with local node, start a acala node with docker
```
docker run -it --rm -p 9944:9944 -p 9933:9933 acala/mandala-node:f3434935 --dev --instant-sealing --ws-external=true --rpc-port=9933 --rpc-external=true --rpc-cors=all --rpc-methods=unsafe
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
- cd into one of the example project
  - You can find your contract ABI in the build directory. You can upload these ABI files to [acala evm playground](https://evm.acala.network/#/upload) for testing.
  - Run the tests with `[ENDPOINT_URL=xxxxx] yarn test `.

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

### Tips and Docs
- `rushx` is an alternative to `yarn`, so `yarn test` and `rushx test` are equivalent.
- The test cases are written with with [ethers.js](https://docs.ethers.io/v5/) and [waffle](https://ethereum-waffle.readthedocs.io/en/latest/).
