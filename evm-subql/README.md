# @acala-network/evm-subql
Subquery services that index and query Acala EVM+ transactions.

## Run
### prepare
- first make sure to run an [Acala](https://github.com/AcalaNetwork/Acala) node locally and listen to port 9944

- install dependencies
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

for **mac users**, docker will need some different config, please checkout [this branch](https://github.com/AcalaNetwork/eth-rpc-adaptor/tree/mac-docker-settings/evm-subql) for running docker with mac.

### run each service seperately
- 1) run a postgres service and listen to port 5432
```
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

- 2) run a subquery indexer (note: currently there is still some runtime error, which is under investigation)
```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432

yarn index
```

- 3) run the Query service (WIP)
```
export DB_HOST=localhost
yarn query
```
