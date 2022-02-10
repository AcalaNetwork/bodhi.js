# @acala-network/bodhi.js
Some tools and SDKs related to Acala EVM.  

Packages:
- [bodhi](./bodhi)
- [eth-rpc-adapter](./eth-rpc-adapter)
- [evm-subql](./evm-subql)
- [examples](./examples)

## Getting Started
- install all dependencies
```
rush update
```

- build
```
rush build // build all
rush build -t @acala-network/eth-rpc-adapter //  build all the things that @acala-network/eth-rpc-adapter depends on, and also @acala-network/eth-rpc-adapter itself
```

- run build when the file changes
```
rush build:watch // watch all packages
rush build:watch -t @acala-network/eth-rpc-adapter //  watch all the things that @acala-network/eth-rpc-adapter depends on, and also @acala-network/eth-rpc-adapter itself
```

- run a script defined in project's `package.json`
```
cd <project>
rushx <script-name>
```

- add pacakge
```
rush add -p <package> --all             # for all projects
cd <project> && rush add -p <package>   # for this project only
```

## use with docker
### build and run `eth-rpc-adaptor`
```
docker build -f eth-rpc-adapter/Dockerfile . -t eth-rpc-adapter
docker run -it -p 8545:8545 [--env-file=eth-rpc-adapter/.env] eth-rpc-adapter yarn dev
```

### run tests with docker
- clean up
```
# super-quickly clean up docker containers and volumes (make sure you know what you are doing)
docker compose down ; docker rm -f $(docker ps -a -q) ; docker volume rm $(docker volume ls -q)

# or more safe way to clean up only related services
docker rm -vf $(docker ps -a | grep bodhijs_subquery-node | awk '{print $1}')
docker rm -vf $(docker ps -a | grep bodhijs_graphql-engine | awk '{print $1}')
docker rm -vf $(docker ps -a | grep bodhijs_postgres | awk '{print $1}')
docker rm -vf $(docker ps -a | grep bodhijs_mandala-node | awk '{print $1}')
docker rm -vf $(docker ps -a | grep bodhijs_eth-rpc-adapter-server | awk '{print $1}')
docker rm -vf $(docker ps -a | grep bodhijs_loop | awk '{print $1}')
docker rm -vf $(docker ps -a | grep bodhijs_feed-tx | awk '{print $1}')
```

- run tests
```
### run any test
docker-compose up --abort-on-container-exit --exit-code-from=xxx --build -- xxx

where xxx ∈ {
  eth-providers-test,
  eth-rpc-adapter-test,
  waffle-examples-test,
  waffle-tutorials-test,
  hardhat-tutorials-test,
  truffle-tutorials-test,
}

### run all tests (not recommended since log will be too messy)
docker-compose up
```

we can grep container logs by
```
docker-compose logs --tail=0 --follow   # all logs
docker logs -f <container_id>           # logs for specific container
```


## Documentation
- This project is managed by [Rushstack](https://github.com/microsoft/rushstack).
- Most of the api of `bodhi.js` is compatible with [ethers.js](https://docs.ethers.io/v5/single-page/).

## Release Workflow
### manual
```
## first let rush determine what projects were changed
rush change --bulk --message "version x.x.x" --bump-type "patch"

## build
rush build

## publish
rush publish -p --set-access-level public -n <paste_npm_token_here>
```

### CI
In order to trigger a auto release, we need to tag the commit with 'v*', any other commit won't trigger the auto publish. Also, remember to update the `version` fields in `package.json`, otherwise publishing will fail.

For example
```
git commit -m "bump version to v2.0.8-beta"
git tag v2.0.8-beta

# push code, this won't trigger CI
# if this creates a pull request, make sure to merge it before push tag
git push

# push the tag, this will trigger CI auto release
# do this after the code is actually merged
git push origin v2.0.8-beta
```


