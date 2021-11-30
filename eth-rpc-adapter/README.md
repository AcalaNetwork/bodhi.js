# @acala-network/eth-rpc-adaptor
A node service that allows existing Ethereum dApp to be able to interact with [Acala EVM](https://github.com/AcalaNetwork/Acala/tree/master/modules/evm).

## Run
- provide an optional `.env` file for:
  - **ENDPOINT_URL**: acala node WS url
  - **HTTP_PORT**: HTTP port for requests
  - **WS_PORT**: WS port for requests

for example:
```
ENDPOINT_URL=ws://localhost:9944  # default WS port that acala node exposes
HTTP_PORT=8545                    # default http port that hardhat looks for
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

## Docker Image
- build docker image with default mandala URL
```
docker build . -t eth-rpc-adaptor
```

- build docker image with custom mandala url
```
docker build . -t eth-rpc-adaptor --build-arg mandala_url=xxxxx
```

- run with docker
```
docker run -it -p 8545:8545 eth-rpc-adaptor
```