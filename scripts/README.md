# Bodhi Scripts
some util scripts for bodhi

- install deps: `yarn`

### bump version
`yarn bump`
bump patch version.

### get precompile info
`[RPC_URL=xxx] yarn precompile`
get precompile contracts info (token, oracle, EVM).

### block iterator
`yarn iterate`
- binary search the contract creation block
- batch iterate blocks for some logic (such as checking if a contract exist) with retry

### rpc tests
`ENDPOINT=xxx CHAIN={mandala, karura, acala} yarn rpc`
goes over some rpc calls:
- basic calls
- historical calls that involves subquery
- subscription call

helpful for quickly testing the setup of a new RPC endpoint

### tx confirmation test
`KEY=<your-mandala-private-key> yarn confirmation`
test a tx confirmation time and blocks.

### orphan tx and orphan logs test
to test local codes, first start a local rpc adapter connecting to Acala Testnet
```
yarn start -e wss://acala-dev.aca-dev.network/rpc/ws --subql http://localhost:3001
```

then start a subquery connecting to Acala testnet 

then input a sudo private key into the code, and 
```
RPC_URL=http://localhost:8545 RPC_URL_WS=ws://localhost:8545 yarn virtual-tx [--maxBlockCacheSize=0]
```

This will send two scheduled transaction in batch to acala testnet, which will produce virutal tx and orphan logs. Then the script will call related RPC methods to make sure they can be found.

### get ausd supply from block range
edit the rpc and block number in the code depending if you want to query for moonbeam or astar, then `CHAIN={Acala, Astar, Moonbeam} yarn ausd`

### use state_call for eth call
this is a POC of how to do a `eth_call` with substrate `state_call`
`cd evm-state-call && yarn state-call`

### compare subql data
refer to [here](./subql/README.md)