# @acala-network/evm-subql
Subquery services that index and query Acala EVM+ transactions and logs.

## Run
### prepare
- install dependencies
```
yarn
```

- generate types from the GraphQL schema, and build code
```
yarn build
```

### run all services with docker
This will run all 4 services together:
- a Mandala node with `--instant-sealing` dev mode
- a postgres database
- a subql indexer that indexes data into postgres
- a subql query that wrap the data with graphql interface

```
docker-compose down && docker volume prune      # clean docker volume (optional)

docker-compose up
```

note that the indexer won't start until we [feed some tx to node](#feed-evm-transactions-to-node) if node is running with `--instant-sealing`

### run each service seperately in cli
optionally if you don't like docker, you can also run each service in cli ([official doc](https://academy.subquery.network/run_publish/run.html#running-an-indexer-subql-node)).
- first install subql globally
```
npm i -g @subql/node@1.7.0 @subql/query@1.4.0
```

- run an [Acala](https://github.com/AcalaNetwork/Acala) node locally and listen to port 9944 (in terminal 1)

If you already have a node running elsewhere, skip this step.
```
docker run -it --rm -p 9944:9944 -p 9933:9933 ghcr.io/acalanetwork/mandala-node:sha-e8998a4 --dev --ws-external --rpc-port=9933 --rpc-external --rpc-cors=all --rpc-methods=unsafe --tmp -levm=debug --instant-sealing
```

- run a postgres service and listen to port 5432 (in terminal 2)
```
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

- [feed some tx to node](#feed-evm-transactions-to-node) if node is running with `--instant-sealing`

- run a subquery indexer (in terminal 3)
```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn index
```

- run the Query service (in terminal 4)
```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn query
```

### feed evm transactions to node
If the acala node is running with `--instant-sealing`, it won't start producing blocks until transactions coming in, and subquery indexer won't start either without any new block. Sowe will need to feed some tx to it. 

For example we can run any of the [evm examples](https://github.com/AcalaNetwork/bodhi.js/tree/master/examples).
```
cd ../examples/waffle/dex
rush update
rush build -t .
yarn test
```

If there are tx in the node, we should see the subquery indexer logs something similar like this:
```
<BlockDispatcherService> INFO Enqueing blocks 3...12, total 10 blocks
<BlockDispatcherService> INFO fetch block [3,12], total 10 blocks
...
```

## Query Data
Now we can explorer graphql data at http://localhost:3001/ 🎉🎉

for example we can query
```graphql
query {
  transactionReceipts {
    nodes {
      id
      to
      from
      transactionHash
      transactionIndex
      gasUsed
      logs {
        nodes {
          id
        }
      }
    }
  }
  logs {
    nodes {
      id,
      blockNumber,
      blockHash,
      transactionIndex,
      address,
      data,
      transactionHash,
      receipt {
        id
      }
    }
  }
}
```

and health check
```graphql
query {
  _metadata {
    lastProcessedHeight
    lastProcessedTimestamp
    targetHeight
    chain
    specName
    genesisHash
    indexerHealthy
    indexerNodeVersion
  }
}
```
## For Production
Previous examples are **local dev setup**, which uses the [example config](./project.yaml) that is tailored to local dev node. 

For production, we need slightly different configs, and usually need to start each of the `{ node, postgres, indexer, query }` seperately with docker or k8s, instead of running them all in one docker container.

One trick is that we don't have to stat indexing from block 0, since Acala and Karura didn't enable evm until some certain block. In particular we can use these two configs for prod (change `endpoint` to your custom one if needed):
- [Acala prod](./project-acala-840000.yaml)
- [Karura prod](./project-acala-840000.yaml)

It usually takes one to three days to index all data, depending on the node latency and performance.

## More References
- [subquery official doc](https://doc.subquery.network/quickstart/helloworld-localhost.html)
- [about unsafe flag](https://academy.subquery.network/run_publish/references.html#unsafe)
- [acala evm+ doc](https://evmdocs.acala.network/network/network-setup/local-development-network)
