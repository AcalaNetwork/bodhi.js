# @acala-network/evm-subql
Subquery services that index and query Acala EVM+ transactions and logs.

## Run
### prepare
- install project dependencies
```
yarn
```

- generate Typescript from the GraphQL schema, and build code. [more details](https://doc.subquery.network/quickstart/understanding-helloworld/#yarn-codegen)
```
yarn build
```

- build `eth-provider` package if haven't done it
```
rush update
rush build
```

### run all services with docker
This includes a Mandala node within Docker.

```
docker-compose down && docker volume prune      # clean docker volume (optional)

docker-compose up                               # linux users
docker-compose -f macos-docker-compose.yml up   # mac users
```

Make sure to feed some EVM transactions to acala node, for example we can use [these evm examples](https://github.com/AcalaNetwork/evm-examples).

### run each service seperately
- first install subql globally (recommended by the [official doc](https://doc.subquery.network/install/install/#install-subql-cli))
```
npm i -g @subql/node @subql/query
```

- run an [Acala](https://github.com/AcalaNetwork/Acala) node locally and listen to port 9944 (in terminal 1), and feed EVM data to it


- run a postgres service and listen to port 5432 (in terminal 2)
```
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

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

## Notes
- Other packages in `bodhi.js` use `rush` to manage, but we use `yarn` for this one. Since `rush update` will cause tslib import problem, because `rush` uses symlink so pacakges point to outside, but `subql/node`'s NodeVM doesn't allow import from outside. 