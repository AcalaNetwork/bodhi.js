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
rushx dev
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
`rushx test`