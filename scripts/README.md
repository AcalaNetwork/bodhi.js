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
