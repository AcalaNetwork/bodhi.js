# @acala-network/evm-subql
Acala EVM Subquery 

**NOTE**: this doc is BETA

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
yarn codegen
yarn build
```

### run
for **linux users**, simply do `docker-compose up`, that's all. 

for **mac users**, for unknown reason(s) the above command will fail, so we have to run each service separately locally:

- run a postgres service and listen to port 5432
```
docker run -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:12-alpine
```

- install and run a subquery node
```
npm install -g @subql/node

export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
npx subql-node -f . --local --batch-size 200 --subquery-name=acala-evm --debug

# this will start the subquery node, but then it will stop running since subquery only indexes finalized blocks, and our local node doesn't have finalized block. 
```

- install and run the Query service
```
npm install -g @subql/query

export DB_HOST=localhost
npx subql-query --name acala-evm --playground --debug
```
