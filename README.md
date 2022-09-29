# @acala-network/bodhi.js
Some tools and SDKs related to Acala EVM.  

Packages:
- [bodhi](./bodhi)
- [eth-rpc-adapter](./eth-rpc-adapter)
- [evm-subql](./evm-subql)
- [examples](./examples)

## Getting Started
- initialize submodules (only need to do once after git clone)
```
git submodule update --init --recursive
```

- install all dependencies
```
rush update
```

- build
```
## build all projects
rush build 

## build all the projects that @acala-network/eth-rpc-adapter depends on, and itself
rush build -t @acala-network/eth-rpc-adapter
```

- run build when the file changes
```
## build and watch all projects
rush build:watch

## build and watch all the projects that @acala-network/eth-rpc-adapter depends on, and itself
rush build:watch -t @acala-network/eth-rpc-adapter
```

- add pacakge
```
rush add -p <package> --all             # for all projects
cd <project> && rush add -p <package>   # for this project only
```

## Run Tests
### with docker
- clean up
```
docker compose down -v
```

- run tests
```
## build the bodhi-base image
docker build . -t bodhi-base -f docker/bodhi-base.Dockerfile

## run any test
docker compose up --abort-on-container-exit --exit-code-from=xxx --build -- xxx

where xxx ∈ {
  eth-providers-test,
  eth-rpc-adapter-test,
  waffle-examples-test,
  waffle-tutorials-test,
  hardhat-tutorials-test,
  truffle-tutorials-test,
}

## run all tests (not recommended since log will be too messy)
docker compose up
```

we can grep container logs by
```
docker compose logs --tail=0 --follow   # all logs
docker logs -f <container_id>           # logs for specific container
```

## Docker Images
- eth-rpc-adapoter
  - build locally: `docker build . -t eth-rpc-local -f eth-rpc-adapter/Dockerfile`
  - [public docker images](https://hub.docker.com/r/acala/eth-rpc-adapter/tags)
- evm subquery
  - build locally: `docker build . -t evm-subql-local -f evm-subql/Dockerfile`
  - [public docker images](https://hub.docker.com/r/acala/evm-subql/tags)

## Documentation
- This project is managed by [Rushstack](https://github.com/microsoft/rushstack).
- Most of JsonRpc methods provided by [eth-rpc-adapter](./eth-rpc-adapter/) are compatible with [standard ETH JsonRpcs](https://ethereum.org/en/developers/docs/apis/json-rpc/), for more details please checkout [available RPCs](./eth-rpc-adapter/README.md#available-rpcs).
- Most of the Apis of [eth-providers](./eth-providers/) is compatible with [ethers.js](https://docs.ethers.io/v5/single-page/) providers. (TODO: add more details)

## Release Workflow
### manual
```
rush publish -p --set-access-level public -n <paste_npm_token_here>
```

### CI
first bump versions and commit
```
node scripts/bump-version.ts
git commit -m "bump version v2.x.x"
```

then tag the commit and push
```
git tag v2.x.x
git push --follow-tags
```


