# @acala-network/evm-subql

Subquery services that index and query Acala EVM+ transactions and logs.

## Run

### Prepare

- install dependencies

```
yarn
```

- generate the required types from the GraphQL schema, and build code

```shell
yarn build
```

### Run all of the services using Docker

This will run all 4 services together:
1. A Mandala node with `--instant-sealing` in development mode
2. A Postgres database
3. A SubQl indexer that indexes data into Postgres
4. A SubQl query that wraps the data with GraphQl interface

```shell
docker-compose down -v      # clean docker volume (optional)

docker-compose up
```

Please note that the indexer won't start until we [feed some transactions to the node](#feed-evm-transactions-to-node) if the node is running with `--instant-sealing` 

### Run each service in the CLI seperately

Optionally, if you don't want to use the Docker, you can also run each service separately in the CLI ([official documentation](https://academy.subquery.network/run_publish/run.html#running-an-indexer-subql-node)). 

NOTE: using CLI is for **local testing** only, so you can get familiar with each service. [For production](#for-production) please use docker setup instead.

1. Install SubQl globally

```shell
npm i -g @subql/node@1.21.2 @subql/query@1.4.0
```

2. Run an [Acala](https://github.com/AcalaNetwork/Acala) node locally and listen to port number `9944` (in the first terminal)

If you already have a node running elsewhere, you can skip this step.

```shell
docker run -it --rm -p 9944:9944 ghcr.io/acalanetwork/mandala-node:sha-7ae4bf4 --dev --rpc-external --rpc-cors=all --rpc-methods=unsafe -levm=debug --pruning=archive --instant-sealing
```

3. Run a Postgres service and listen to port number 5432 (in the second terminal)

```shell
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

4. [Feed some transactions to node](#feeding-evm-transactions-to-the-node) if the node is running with `--instant-sealing`

5. Run a subquery indexer (in the third terminal)

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn index
```

6. Run the Query service (in the fourth terminal)

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn query
```

### Feeding EVM transactions to the node

If the acala node is running with `--instant-sealing`, it won't start producing blocks without transactions coming in, and subquery indexer won't start either without any new blocks. So we need to feed some transactions to it. 

For example we can run any of the [evm examples](https://github.com/AcalaNetwork/bodhi.js/tree/master/examples).

```shell
cd ../../examples/waffle/dex
yarn build 
yarn test
```

If there are any transactions in the node, we should see the subquery indexer log something similar to this:

```shell
<BlockDispatcherService> INFO Enqueing blocks 3...12, total 10 blocks
<BlockDispatcherService> INFO fetch block [3,12], total 10 blocks
...
```

## Query Data

Now we can explore the GraphQl data at [`http://localhost:3001/`](http://localhost:3001/) 🎉🎉

For example we can query:

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

## For Production

Previous examples are examples of the **local development setup**, which uses the [example configuration](./project.yaml) that is tailored to local development node. 

For production deployment, there are a couple differences: 

#### services
In local setup we can run all of the services together with one single [docker compose](./docker-compose.yml). However, in prod we  usually need to start each of the `{ node, postgres, indexer, query }` seperately with Docker or k8s.

#### image
In the local example, we use `onfinality/subql-node:v1.17.0` as indexer image, which requires **local mounted project path**. For prod we should use [acala/evm-subql](https://hub.docker.com/r/acala/evm-subql/tags) instead, which already has all the required files encapsulated, so we don't need to mount local files anymore.

An example is [here](../docker-compose-example.yml#L27)

Latest stable versions:
- `acala/eth-rpc-adapter:v2.7.4`
- `acala/evm-subql:v2.6.5`
- `onfinality/subql-query:v1.4.0`

#### config
One trick is that we don't have to start indexing from block 0, since Acala and Karura didn't enable EVM+ until a certain block. In particular we can use these two configs for production (change the `endpoint` value to your custom one if needed):

- [Acala production](./project-acala-840000.yaml), by setting `-f=/app/project-acala-840000.yaml`
- [Karura production](./project-karura-1780000.yaml), by setting `-f=/app/project-karura-1780000.yaml`


It usually takes 1 to 3 days to index all of the data, depending on the node latency and performance.

### Upgrade Production Subquery
To upgrade the production subql, we usually need to do a full re-index. In order not to interrupt the currnetly running subql, we can run another indexer in parallel to the old one, and hot replace the old one once the full re-index is finished. 

Below are the detailed steps:
1) start a new indexer service `acala/evm-subql` that uses a difference `--db-schema`, for example, `--db-schema=evm-karura-2`. It can share the same DB with the old indexer
2) wait until the new indexer finish indexing
3) update the config of graphql service `onfinality/subql-query` to use the new indexer. In particular, change the `--name` command, such as `--name=evm-karura-2`, and `--indexer=<new indexer url>`
4) delete the old indexer service, as well as the old db schema
5) upgrade is finished! No need to modify `eth-rpc-adapter`

Note: for `acala/evm-subql:v2.5.9` please add `--disable-historical` command. ([example](https://github.com/AcalaNetwork/bodhi.js/blob/d763bc588a4a90e4421d65ebfe1d95ba581c6d37/evm-subql/docker-compose.yml#L52))

## Dump and Restore Database
Sometimes it's useful to take a snapshot of the database, so that we can restore it when needed. We can also pass it along to others, so that they can quickly setup a copy of the same evm subql project, without needing to index from the beginning.

Below are CLI commands to do it, you can also use pgAdmin GUI to achieve the same thing.

### install postgres CLI
make sure you have `pg_dump` and `pg_restore` commands available. 

- for Mac: `brew install libpq`
- for other OS: `you are on your own`

### dump database
suppose we have an `evm-karura` schema in `postgres` db, and we want to dump it to a tar file `evm-karura.tgz`.
```
export PGPASSWORD=<password>
pg_dump                   \
  --host <db-host-url>    \
  --port 5432             \
  --dbname postgres       \
  --username postgres     \
  --format tar            \
  --file ./evm-karura.tgz \
  --schema evm-karura     \
  --verbose
```

### restore database
in previous step we dumped data from `evm-karura` schema in database `postgres`, so when restoring data, we need to first make sure a db called `postgres` exists, and it does **NOT** have `evm-karura` schema. Then we can restore the database with the following command
```
export PGPASSWORD=<password>
pg_restore             \
  --host <db-host-url> \
  --port 5432          \
  --dbname postgres    \
  --username postgres  \
  --verbose            \
  ./evm-karura.tgz
```

### (optional) rename schema
Since we dumped `evm-karura` schema, the restore process will create a new schema with the same name. If you want to use a different name, you can simply rename `evm-karura` schema to the desired name after the restore process. 

This can be done with pgAdmin by:
- right click the schema name
- select "properties"
- enter a new name and save

## More References

- [SubQuery official documentation](https://doc.subquery.network/)
- [About the unsafe flag](https://academy.subquery.network/run_publish/references.html#unsafe-node-service)
- [Acala EVM+ documentation](https://evmdocs.acala.network/network/network-setup/local-development-network)
- [Subql Quick Migration Guide](https://hackmd.io/Z3ka28y4Tky6sHPsQVt2lw)
