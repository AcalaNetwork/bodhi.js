# Acala EVM+ SDKs
These are some tools and SDKs related to Acala EVM+. It also contains some examples about how to interact with EVM+ with these tools.

Packages:
- [bodhi.js](./packages/bodhi)
- [eth-providers](./packages/eth-providers)
- [eth-rpc-adapter](./packages/eth-rpc-adapter)
- [evm-subql](./packages/evm-subql)
- [examples](./examples)

## Getting Started
- initialize submodules (only need to do once after git clone)
```
git submodule update --init --recursive
```

- install all dependencies
```
yarn
```

- build
```
yarn build
```

- run tests
```
yarn test
```

## e2e-tests
```
# build the bodhi-runner image
docker build . -t bodhi-runner -f docker/bodhi-runner.Dockerfile
yarn e2e:eth-providers
yarn e2e:eth-rpc-adapter
yarn e2e:waffle
yarn e2e:hardhat
yarn e2e:truffle
```

## Run Tests
### with docker
- clean up
```
docker compose down -v
```

- run tests
```
## build the bodhi-runner image
docker build . -t bodhi-runner -f docker/bodhi-runner.Dockerfile

## run any test
docker compose up --abort-on-container-exit --exit-code-from=xxx --build -- xxx

where xxx ∈ {
  eth-providers-test,
  eth-rpc-adapter-test,
  waffle-examples-test,
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
  - build locally: `docker build . -t eth-rpc-local -f packages/eth-rpc-adapter/Dockerfile`
  - [public docker images](https://hub.docker.com/r/acala/eth-rpc-adapter/tags)
- evm subquery
  - build locally: `docker build . -t evm-subql-local -f packages/evm-subql/Dockerfile`
  - [public docker images](https://hub.docker.com/r/acala/evm-subql/tags)

## More References
- Most of JSON-RPC methods provided by [eth-rpc-adapter](./packages/eth-rpc-adapter/) are compatible with standard [ETH JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/), for more details please checkout [available RPCs](./packages/eth-rpc-adapter/README.md#available-rpcs).
- Most of the APIs of [eth-providers](./packages/eth-providers/) is compatible with [ethers.js](https://docs.ethers.io/v5/single-page/) providers.

### CI
To release new NPN packages then first bump versions and commit.
Use `prerelease` for beta releases
```
yarn bump <patch, minor, major, prerelease>
git add .
git commit -m "bump v2.x.x"
```

To release docker images then tag the commit and push.
Use manual `workflow_dispatch` for beta releasees
```
git tag v2.x.x
git push --atomic origin master v2.x.x
```
