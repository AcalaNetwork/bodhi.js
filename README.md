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
rush build --to @acala-network/eth-rpc-adaptor //  build all the things that @acala-network/eth-rpc-adaptor depends on, and also @acala-network/eth-rpc-adaptor itself
```

- run build when the file changes
```
rush build:watch // watch all packages
rush build:watch --to @acala-network/eth-rpc-adaptor //  watch all the things that @acala-network/eth-rpc-adaptor depends on, and also @acala-network/eth-rpc-adaptor itself
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

### CI (deprecated, rush has some different workflow)
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
