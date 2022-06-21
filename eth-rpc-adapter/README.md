# @acala-network/eth-rpc-adapter
A node service that allows existing Ethereum dApp to be able to interact with [Acala EVM](https://github.com/AcalaNetwork/Acala/tree/master/modules/evm).

## Run
There are 3 ways to run an RPC adapter:
- from npm package
- from local build
- from docker

#### from npm package
- run the server (should automagically install it)
```
LOCAL_MODE=1 npx @acala-network/eth-rpc-adapter
```

#### from local build
- build it locally
```
rush update
rush build -t @acala-network/eth-rpc-adapter 
```

- run the dev server:
```
LOCAL_MODE=1 yarn start
```

#### from docker
```
docker run -it --rm -e LOCAL_MODE=1 -p 8545:8545 acala/eth-rpc-adapter:aa2c8d7 yarn start
```
note that docker image might not be most up-to-date. Latest image can be found [here](https://hub.docker.com/r/acala/eth-rpc-adapter/tags)

## Options
| ENV                | flag equivalent | default             | explanation                                                                                             |
|--------------------|-----------------|---------------------|---------------------------------------------------------------------------------------------------------|
| ENDPOINT_URL       | -e, --endpoint           | ws://localhost:9944 | acala node url                                                                                          |
| SUBQL_URL          | --subql                  | undefined           | subquery graphql-engine service url, usually http://localhost:3001                                      |
| HTTP_PORT          | -h, --http-port          | 8545                | HTTP port for requests                                                                                  |
| WS_PORT            | -w, --ws-port            | 3331                | WS port for requests                                                                                    |
| MAX_CACHE_SIZE     | --cache-size             | 200                 | max number of blocks that lives in the cache [more info](https://evmdocs.acala.network/network/network) |
| MAX_BATCH_SIZE     | --max-batch-size         | 50                  | max batch size for RPC request                                                                          |
| STORAGE_CACHE_SIZE | --max-storage-size       | 5000                | max storage cache size                                                                                  |
| SAFE_MODE          | -s, --safe               | 0                   | if enabled, TX and logs can only be found after they are finalized                                      |
| FORWARD_MODE          | -f, --forward         | 0                   | if enabled, the Substrate rpc will be forwarded to the Substrate node                                  |
| LOCAL_MODE         | -l, --local              | 0                   | enable this mode when testing with locally running mandala                                              |
| VERBOSE            | -v, --verbose            | 1                   | print some extra info                                                                                   |

NOTE: Please don't mix using ENV and flags. `.env.sample` contains an example envs. 
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

## Available RPCs
### ETH compatible RPCs
These are ETH compatible RPCs, the interface and functionalities match https://eth.wiki/json-rpc/API
- `web3_clientVersion`
- `net_version`
- `eth_blockNumber`
- `eth_chainId`
- `eth_getTransactionCount`
- `eth_getCode`
- `eth_call`
- `eth_getBalance`
- `eth_getBlockByHash`
- `eth_getBlockByNumber`
- `eth_gasPrice`
- `eth_accounts`
- `eth_getStorageAt`
- `eth_getBlockTransactionCountByHash`
- `eth_getBlockTransactionCountByNumber`
- `eth_sendRawTransaction`
- `eth_estimateGas`
- `eth_getTransactionByHash`
- `eth_getTransactionReceipt`
- `eth_sign`
- `eth_sendTransaction`
- `eth_getTransactionByBlockHashAndIndex`
- `eth_getTransactionByBlockNumberAndIndex`
- `eth_getUncleCountByBlockHash`
- `eth_getUncleCountByBlockNumber`
- `eth_getUncleByBlockHashAndIndex`
- `eth_getUncleByBlockNumberAndIndex`
- `eth_getLogs`
- `eth_subscribe`
- `eth_unsubscribe`

### Custom RPCs
These are EVM+ custom RPCs that only exist on Acala/Karura
- `eth_getEthGas`: calculate eth transaction gas params from substrate gas params. More details please refer [here](https://evmdocs.acala.network/network/gas-parameters)]
- `eth_getEthResources`: calculate eth transaction gas params from transaction details, params: [TransactionRequest](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionRequest)
- `net_indexer`: get subql indexer metadata
- `net_cacheInfo`: get the cache info
- `net_isSafeMode`: check if this RPC is running in safe mode
- `net_health`: check the health of the RPC endpoint
- `net_runtimeVersion`: check the current runtime version of the underlying polkadot.js api
- `eth_isBlockFinalized`: check if a block is finalized, params: [BlockTag](https://docs.ethers.io/v5/api/providers/types/#providers-BlockTag)
- `eth_isTransactionFinalized`: check if a transaction is finalized, note that it also returns false for non-exist tx, params: string

## Test
```
yarn test     # unit tests
yarn test:dev # all tests
```

## Metamask Integration
- start the RPC server: `yarn start`
- add a custom network on Metamask:
  - Network Name: Local Mandala
  - New RPC URL: http://localhost:8545  (should be the same as the HTTP_PORT value in your `.env`, defaults to 8545)
  - Chain ID: 595
  - Currency Symbol: ACA
- import dev address:
  - by nmemonic: `fox sight canyon orphan hotel grow hedgehog build bless august weather swarm`
  - or by private key: `0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f`
- before sending any transaction:
  - don't change the default `gasPrice` nad `GasLimit`, otherwise transaction will fail.
