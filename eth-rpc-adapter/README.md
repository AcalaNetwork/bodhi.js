# @acala-network/eth-rpc-adapter
A node service that allows existing Ethereum dApp to be able to interact with [Acala EVM](https://github.com/AcalaNetwork/Acala/tree/master/modules/evm).

## Run
- provide an optional `.env` file for:
  - **ENDPOINT_URL**: acala node WS url
  - **SUBQL_URL**: subquery service url
  - **HTTP_PORT**: HTTP port for requests
  - **WS_PORT**: WS port for requests

for example checkout `.env.sample`:
```
ENDPOINT_URL=ws://localhost:9944 # default WS port that acala node exposes
SUBQL_URL=http://localhost:3001  # default http port that subquery exposes
HTTP_PORT=8545                   # default http port that hardhat looks for
WS_PORT=3331
```

- install dependencies
```
rush update
```

- run the dev server:
```
yarn dev
```

## Usage
Now that the adaptor service is running and listening to HTTP_PORT, we can send EVM related requests to this port.

For example
```
### request
GET http://localhost:8545
{
    "jsonrpc": "2.0",
    "method": "eth_chainId",
    "params": [],
    "id": 1
}

### response
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": "0x253"
}
```

## Test
```
yarn test     # unit tests
yarn test:dev # all tests
```

## Metamask Integration
- start the RPC server: `yarn dev`
- add a custom network on Metamask:
  - Network Name: Local Mandala
  - New RPC URL: http://localhost:8545  (should be the same as the HTTP_PORT value in your `.env`, defaults to 8545)
  - Chain ID: 595
  - Currency Symbol: ACA
- import dev address:
  - by nmemonic: `fox sight canyon orphan hotel grow hedgehog build bless august weather swarm`
  - or by private key: `0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f`
- before sending any transaction:
  - don't change the default `GasLimit` and `Max Fee`
  - can change `Max Priority Fee`, manually setting this a small value (such as 0.000001) will significanlty lower the tx gas cost.