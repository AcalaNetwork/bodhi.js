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
`yarn rpc`
goes over some rpc calls:
- basic calls
- historical calls that involves subquery
- subscription call

helpful for quickly testing the setup of a new RPC endpoint

### tx confirmation test
`KEY=<your-mandala-private-key> yarn confirmation`
test a tx confirmation time and blocks.

### virtual tx and orphan logs test
first input a sudo private key into the code, then `yarn virtual-tx`

This will send a schedule transaction to acala testnet, which will produce virutal tx and orphan logs. Then the script will call related RPC methods to make sure they can be found.

### get ausd supply from block range
edit the rpc and block number in the code depending if you want to query for moonbeam or astar, then `CHAIN={Acala, Astar, Moonbeam} yarn ausd`
