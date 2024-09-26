# Acala EVM+ SDKs
[![codecov](https://codecov.io/github/AcalaNetwork/bodhi.js/graph/badge.svg?token=knumpsfImD)](https://codecov.io/github/AcalaNetwork/bodhi.js)

These are some tools and SDKs related to Acala EVM+. It also contains some examples about how to interact with EVM+ with these tools.


Packages:
- [bodhi.js](./packages/bodhi)
- [eth-providers](./packages/eth-providers)
- [eth-rpc-adapter](./packages/eth-rpc-adapter)
- [evm-subql](./packages/evm-subql)

## Getting Started
- install all dependencies
```
yarn
```

- build
```
yarn build
```

## Run Tests
- clean up
```
docker compose down -v
```

- start a chopsticks acala fork as the test node
```
docker compose up
```

- run tests
```
yarn workspace @acala-network/<pkg-name> run test:coverage
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
