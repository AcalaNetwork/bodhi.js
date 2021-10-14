# ETH RPC Adapter

A node service that wraps Substrate based Acala service and make it EVM compatible.

## Run
- install dependencies: `yarn`

- provide a `.env` file for:
  - **ENDPOINT_URL**: acala node WS url
  - **HTTP_PORT**: HTTP port for requests
  - **WS_PORT**: WS port for requests

- run the dev server: `yarn dev`

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
