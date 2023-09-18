# @acala-network/eth-rpc-adapter
A node service that provides [JSON-RPC](https://eth.wiki/json-rpc/API) for [Acala EVM+](https://github.com/AcalaNetwork/Acala/tree/master/modules/evm), in order for existing Ethereum dApp and tools to interact with EVM+ with minumum changes.

## Run
First run a Mandala node locally
```
docker run -it --rm -p 9944:9944 ghcr.io/acalanetwork/mandala-node:sha-fe67fd1 --dev --rpc-external --rpc-cors=all --rpc-methods=unsafe -levm=debug --pruning=archive --instant-sealing
```

Then there are 3 ways to run an RPC adapter:
- from docker
- from npm package
- from local build

#### from docker
```
docker run -it --rm -e LOCAL_MODE=1 -p 8545:8545 acala/eth-rpc-adapter:v2.7.6 yarn start
```
latest image can be found [here](https://hub.docker.com/r/acala/eth-rpc-adapter/tags)

#### from npm package
```
npx @acala-network/eth-rpc-adapter \
  --endpoint ws://localhost:9944 \
  --local-mode
```

#### from local build
- build it locally
```
rush update
rush build -t @acala-network/eth-rpc-adapter 
```

- run the dev server:
```
yarn start --local-mode [--other-options]
```

## Options
NOTE: Please don't mix using ENVs and cli options. Cli options are preferred, and will overwrite ENVs.

More details can also be found by `yarn start --help` or `npx @acala-network/eth-rpc-adapter --help`.

| ENV                | cli options equivalent | default             | explanation                                                                                             |
|--------------------|------------------------|---------------------|---------------------------------------------------------------------------------------------------------|
| ENDPOINT_URL       | -e, --endpoint         | ws://localhost:9944 | Node websocket endpoint(s): can provide one or more endpoints, seperated by comma url        |
| SUBQL_URL          | --subql                | undefined           | Subquery url: *optional* if testing contracts locally that doesn\'t query logs or historical Tx, otherwise *required* |
| PORT               | -p, --port             | 8545                | port to listen for http and ws requests                                    |
| MAX_CACHE_SIZE     | --max-cache-size       | 200                 | max number of blocks that lives in the cache [more info](https://evmdocs.acala.network/network/network) |
| MAX_BATCH_SIZE     | --max-batch-size       | 50                  | max batch size for RPC request                                                                          |
| STORAGE_CACHE_SIZE | --max-storage-size     | 5000                | max storage cache size                                                                                  |
| SAFE_MODE          | -s, --safe-mode        | 0                   | if enabled, TX and logs can only be found after they are finalized                                      |
| LOCAL_MODE         | -l, --local-mode       | 0                   | enable this mode when testing with locally running instant-sealing mandala                              |
| HTTP_ONLY          | --http-only            | 0                   | only allow http requests, disable ws connections                  |
| VERBOSE            | -v, --verbose          | 1                   | print some extra info                                                                                   |

## Usage
Now that the adaptor service is running and listening to the `--port`, we can send Eth JsonRpc requests to this port (both `GET` and `POST` are supported).

For example
```
### request
curl --location --request GET 'http://localhost:8545' \
--header 'Content-Type: application/json' \
--data-raw '{
    "jsonrpc": "2.0",
    "method": "eth_chainId",
    "params": [],
    "id": 1
}'

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
- `eth_getTransactionByBlockHashAndIndex`
- `eth_getTransactionByBlockNumberAndIndex`
- `eth_getUncleCountByBlockHash`
- `eth_getUncleCountByBlockNumber`
- `eth_getUncleByBlockHashAndIndex`
- `eth_getUncleByBlockNumberAndIndex`
- `eth_getLogs`
- `eth_subscribe`
- `eth_unsubscribe`
- `eth_newFilter`
- `eth_newBlockFilter`
- `eth_getFilterLogs` (doesn't support unfinalized logs yet)
- `eth_getFilterChanges` (doesn't support unfinalized logs yet)
- `eth_uninstallFilter`

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

## Integrate Metamask Locally
As Eth RPCs are now available locally, we can connect metamask to it
- start the RPC server locally: `yarn start --local`
- add a custom network on Metamask:
  - Network Name: Local Mandala
  - New RPC URL: http://localhost:8545
  - Chain ID: 595
  - Currency Symbol: ACA
- import dev address to metamask:
  - by nmemonic: `fox sight canyon orphan hotel grow hedgehog build bless august weather swarm`
  - or by private key: `0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f`

#### tips
- before sending any transaction, please don't change the default `gasPrice` or `GasLimit`, otherwise transaction will fail. [more info](https://evmdocs.acala.network/network/gas-parameters)
- everytime we restart the local network, we need to reset metamask for local network, so the nonce and cache will be cleared: `settings => advanced => reset account`

## Modes
#### safe mode (deprecated)
In this mode, Txs and logs can only be found after they are finalized. Now deprecated in favor for the `finalized` and `safe` block tags.

#### local mode
For local testing, we usually turn this mode on, together with a local `--instant-sealing` mandala node. It has some optimization to run faster with local node, and some minor bug prevention.

## For Production
For production deployment we can simply use [acala/eth-rpc-adapter](https://hub.docker.com/r/acala/eth-rpc-adapter/tags) directly. Remember **NOT** to turn on `local mode` or `rich mode`

## Run Tests Locally 
- start local mandala node + subql stacks
```
cd ../evm-subql
yarn && yarn build
docker compose up
```

- start rpc adapter
```
rush update && rush build -t .
yarn start -l --subql http://localhost:3001
```

- feed deterministic txs (after this step there should be 22 blocks)
```
cd ../examples/waffle/dex/ && yarn test
cd ../e2e/ && yarn test
```

- run tests
```
yarn test:e2e
```
