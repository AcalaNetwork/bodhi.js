# Acala EVM+ Truffle Example: Hello World
This is a basic example on how to setup your Truffle development environment as well as testing and
deployment configuration to be compatible with Acala EVM+. It contains a rudimentary
[HelloWorld](./contracts/HelloWorld.sol) smart contract and the required configurations and scripts
in order to test and deploy it.

## Start a Local Development Stack
clean up docker containers
```
docker compose down -v
```

start the local development stack
```
cd ../ # compose file is at root dir
docker compose up
```

once you see logs like this, the local development stack is ready. It's ok if there are some warnings/errors in the logs, since there is no transaction in the node yet.
```
 --------------------------------------------
              🚀 SERVER STARTED 🚀
 --------------------------------------------
 version         : bodhi.js/eth-rpc-adapter/2.7.7
 endpoint url    : ws://mandala-node:9944
 subquery url    : http://graphql-engine:3001
 listening to    : 8545
 max blockCache  : 200
 max batchSize   : 50
 max storageSize : 5000
 safe mode       : false
 local mode      : false
 rich mode       : false
 http only       : false
 verbose         : true
 --------------------------------------------
```

For more information about the local development stack, please refer to the [doc](https://evmdocs.acala.network/network/network-setup/local-development-network).

## Run
install deps
```
yarn
```

compile contracts and build types
```
yarn build
```

deploy the contract with `migrations/*.js`
```
yarn deploy:mandala
```

run tests with `test/*.js`
```
yarn test:mandala
```

### run with public mandala
you can also run these scripts with public mandala by inserting your own account key to [truffle-config.js](./truffle-config.js), and then
```
yarn deploy:mandalaPub
yarn test:mandalaPub
```

## More References
- [Acala EVM+ Development Doc](https://evmdocs.acala.network/)