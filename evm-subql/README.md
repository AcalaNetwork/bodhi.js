# @acala-network/evm-subql
Subquery services that index and query Acala EVM+ transactions and logs.

## Run
### prepare
- first make sure to run an [Acala](https://github.com/AcalaNetwork/Acala) node locally and listen to port 9944. Make sure to feed some EVM transactions to it, for example we can use [these evm examples](https://github.com/AcalaNetwork/evm-examples).

- install project dependencies
```
yarn

# `rush update` will cause tslib import problem, probably because it is using symlink and has some imcompatibility.
```

- generate Typescript from the GraphQL schema, and build code. [more details](https://doc.subquery.network/quickstart/understanding-helloworld/#yarn-codegen)
```
yarn build
```

### run all services with docker
for **linux users**, simply do `docker-compose up`, that's all. 

for **mac users**, use a macOS specfic docker compose with `docker-compose -f macos-docker-compose.yml up`.

### run each service seperately
- 0) install subql lib globally (recommended by the [official doc](https://doc.subquery.network/install/install/#install-subql-cli))
```
npm i -g @subql/node @subql/query
```

- 1) run a postgres service and listen to port 5432 (in terminal 1)
```
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

- 2) run a subquery indexer (in terminal 2)
```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn index
```

- 3) run the Query service (in terminal 3)
```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn query
```

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
