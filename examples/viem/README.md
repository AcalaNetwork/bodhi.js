# Acala EVM+ Examples - Viem
This example demonstrate how to use viem to interact with Acala EVM+. It deploys and interacts with the Echo contracts.

This tutorial will focus on using **vanilla viem**, which is compatible across node and broswer. Hardhat will only be used to compile contract and run tests. If your code doesn't run on broswer, and you hope to make use of some hardhat wrappers over viem, check out the [hardhat-viem](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem) plugin.

## Start a Local Development Stack
clean up docker containers
```
docker compose down -v
```

start the local development stack
```
docker compose up
```

once you see logs like this, the local development stack is ready. It's ok if there are some warnings/errors in the logs, since there is no transaction in the node yet.
```
 --------------------------------------------
              🚀 SERVER STARTED 🚀
 --------------------------------------------
 version         : bodhi.js/eth-rpc-adapter/2.7.16
 endpoint url    : ws://mandala-node:9944
 subquery url    : http://graphql-engine:3001
 listening to    : 8545
 max blockCache  : 200
 max batchSize   : 50
 max storageSize : 5000
 safe mode       : false
 local mode      : true
 rich mode       : false
 http only       : false
 verbose         : true
 --------------------------------------------
```

For more information about the local development stack, please refer to the [doc](https://evmdocs.acala.network/network/network-setup/local-development-network).

## Run the Example
- install deps
```
yarn install
```

- compile the contract
```
yarn build
```

- run tests on local mandala
```
yarn test
```

- run tests on public networks
```
yarn test:mandala
yarn test:karura
yarn test:acala
```
