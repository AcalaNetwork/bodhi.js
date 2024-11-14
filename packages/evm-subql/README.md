# @acala-network/evm-subql
Subquery services that index and query Acala EVM+ transactions and logs.

## Run with Docker
```shell
docker compose down -v      # clean docker volume
docker compose up
```

This will run all 3 services together:
- a postgres database
- a subql node indexer that indexes data into postgres
- a subql query service that wraps the data with GraphQl interface, so we can query the data via GraphQl API

Note that docker compose is for demo purpose, and in production we usually need to start each of the `{ postgres, indexer, query }` seperately, so it's more flexible and controllable.

subql node should output something like this
```
INFO Node started on port: 3000
INFO Enqueueing blocks 1102550...1102570, total 20 blocks
INFO Enqueueing blocks 1102570...1102590, total 20 blocks
```

We start indexing from block 1102550 for Acala as defined in the [config file](./project-acala.ts), since the first acala evm tx is at block 1102550.

### query the data
We now check if the whole stack works as expected by querying the data via subql query service at `http://localhost:3001`

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

The health check can be performed like this:

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

### Connect with eth rpc
As the subql query is running, we can now start the eth rpc with `SUBQL_URL=http://localhost:3001` so that it can query the data from subql query service.

For example, when we query `eth_getTransactionByHash` or `eth_getLogs`, the eth rpc will internally query the requested data from subql query. ([more details](https://evmdocs.acala.network/miscellaneous/faqs#when-do-i-need-to-provide-subquery-url-for-eth-rpc-adpater-or-evmrpcprovider))

## Build and Run Locally with npm
For production it's recommended to use [docker setup](#run-with-docker), but if you don't want to use Docker, you can still run each service locally ([subquery docs](https://academy.subquery.network/run_publish/run.html#running-an-indexer-subql-node)).

install deps and build subql types and code locally
```
yarn
yarn build
```

install subql cli globally
```shell
npm i -g @subql/node@5.2.9 @subql/query@2.10.0
```

run a postgres db (in the second terminal). For production you can use other postgres providers such as AWS RDS, this is only for demo purpose.
```shell
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

run a subql node indexer (in the third terminal)
```shell
export TZ=UTC
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

  subql-node \
    -f ./project-acala.yaml \
    --network-endpoint wss://acala-rpc.aca-api.network \
    --db-schema evm-acala \
    --batch-size 20 \
    --workers 2 \
    --store-flush-interval 10 \
    --log-level info \
    --disable-historical \
    --scale-batch-size \
    --unsafe
```

run a subql query service (in the fourth terminal)
```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

subql-query \
  --name evm-acala \
  --playground \
  --indexer http://localhost:3000
```

now we should be able to [query the data](#query-the-data) via `http://localhost:3001`, and [connect with eth rpc](#connect-with-eth-rpc).

## Latest Stable Versions
- eth rpc: `acala/eth-rpc-adapter:2.9.4`
- subql node: `acala/evm-subql:2.9.4` (or `@subql/node@5.2.9`)
- subql query: `subquerynetwork/subql-query:v2.10.0` (or `@subql/query@2.10.0`)

[release page](https://github.com/AcalaNetwork/bodhi.js/releases)

## Upgrade Subquery
To upgrade subql, we usually **DO NOT** need to reindex from the beginning, which means we don't need to clear the db. We just need to upgrade the `acala/evm-subql` image version and restart the indexer, it should just continue indexing from the last indexed block. We also usually **DO NOT** need to touch subql query service.

If you are running subql node locally, just pull the latest code and run `yarn build`, then run `yarn index` again to restart the indexer.

In rare cases, we might need to do a full re-index (we will explicitly state in the release note when this is needed). In order not to interrupt the currnetly running subql, we can run another indexer in parallel to the old one, and hot replace the old one once the full re-index is finished.

Below are the detailed steps:
1) start a new indexer service `acala/evm-subql` that uses a difference `--db-schema`, for example, `--db-schema=evm-acala-2`. It can share the same DB with the old indexer
2) wait until the new indexer finish indexing
3) update the config of graphql service `subquerynetwork/subql-query` to use the new indexer. In particular, change the `--name` command to `--name=evm-acala-2`, and `--indexer=<new subql node url>`
4) delete the old indexer service, as well as the old db schema
5) upgrade is finished! No need to modify `eth-rpc-adapter`

## Dump and Restore Database
Sometimes it's useful to take a snapshot of the database, so that we can restore it when needed. We can also pass it along to others, so that they can quickly setup a copy of the same evm subql project, without needing to index from the beginning.

Below are CLI commands to do it, you can also use pgAdmin GUI to achieve the same thing.

### install postgres CLI
make sure you have `pg_dump` and `pg_restore` commands available.

- for Mac: `brew install libpq`
- for other OS: `you are on your own`

### dump database
suppose we have an `evm-acala` schema in `postgres` db, and we want to dump it to a tar file `evm-acala.tgz`.
```
export PGPASSWORD=<password>
pg_dump                   \
  --host <db-host-url>    \
  --port 5432             \
  --dbname postgres       \
  --username postgres     \
  --format tar            \
  --file ./evm-acala.tgz \
  --schema evm-acala     \
  --verbose
```

### restore database
in previous step we dumped data from `evm-acala` schema in database `postgres`, so when restoring data, we need to first make sure a db called `postgres` exists, and it does **NOT** have `evm-acala` schema. Then we can restore the database with the following command
```
export PGPASSWORD=<password>
pg_restore             \
  --host <db-host-url> \
  --port 5432          \
  --dbname postgres    \
  --username postgres  \
  --verbose            \
  ./evm-acala.tgz
```

### rename schema (optional)
Since we dumped `evm-acala` schema, the restore process will create a new schema with the same name. If you want to use a different name, you can simply rename `evm-acala` schema to the desired name after the restore process.

This can be done with pgAdmin by:
- right click the schema name
- select "properties"
- enter a new name and save

## More References
- [SubQuery official documentation](https://doc.subquery.network/)
- [About the unsafe flag](https://academy.subquery.network/run_publish/references.html#unsafe-node-service)
- [Acala EVM+ documentation](https://evmdocs.acala.network/)
- [Subql Quick Migration Guide](https://hackmd.io/Z3ka28y4Tky6sHPsQVt2lw)
