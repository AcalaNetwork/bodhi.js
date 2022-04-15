# @acala-network/eth-rpc-adapter
A node service that allows existing Ethereum dApp to be able to interact with [Acala EVM](https://github.com/AcalaNetwork/Acala/tree/master/modules/evm).

## Run
#### from npm version
- install
```
yarn add @acala-network/eth-rpc-adapter
```

- run the server
```
LOCAL_MODE=1 npx @acala-network/eth-rpc-adapter
```

#### from local build
- build it locally
```
rush update
rush build @acala-network/eth-rpc-adapter
```

- run the dev server:
```
LOCAL_MODE=1 yarn dev
```

#### with docker
```
docker compose up
```
note that docker image might not be most up-to-date. Latest image can be found [here](https://hub.docker.com/r/acala/eth-rpc-adapter/tags)
## Options
- available ENV options:
  - **ENDPOINT_URL**: acala node WS url
  - **SUBQL_URL**: subquery service url
  - **HTTP_PORT**: HTTP port for requests
  - **WS_PORT**: WS port for requests
  - **MAX_CACHE_SIZE**: max number of blocks that lives in the cache [more info](https://evmdocs.acala.network/network/network)
  - **SAFE_MODE**: if enabled, TX and logs can only be found after they are finalized
  - **LOCAL_MODE**: enable this mode when testing with locally running mandala

for example checkout `.env.sample`:
```
ENDPOINT_URL=ws://localhost:9944 # default WS port that acala node exposes
SUBQL_URL=http://localhost:3001  # default http port that subquery exposes
HTTP_PORT=8545                   # default http port for ETH RPC methods
WS_PORT=3331                    
MAX_CACHE_SIZE=200               
SAFE_MODE=0                      # disabled by default
LOCAL_MODE=0                     # disabled by default
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