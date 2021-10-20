# @acala-network/bodhi.js
Some tools and SDKs related to Acala EVM. 

Packages:
- [bodhi](./bodhi)
- [eth-rpc-adapter](./eth-rpc-adapter)
- [evm-subql](./evm-subql)

## Getting Started
- install all dependencies
```
rush update
```

- build
```
rush build
```

- run any scripts defined in `package.json`
```
rushx <script-name>
```

## Documentation
- This project is managed by [Rushstack](https://github.com/microsoft/rushstack).
- Most of the api of `bodhi.js` is compatible with [ethers.js](https://docs.ethers.io/v5/single-page/).

## Release Workflow
Currently only [bodhi](./bodhi) package will be auto released.

In order to trigger a auto release, we need to tag the commit with 'v*', any other commit won't trigger the auto publish. Also, remember to update the `version` filed in `package.json`, otherwise publishing will fail.

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
