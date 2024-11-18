# Acala EVM+ Foundry Examples - Counter
An example about how to build, test, and deploy a simple Counter contract to Acala EVM+.

## Build and Test
- install [foundry](https://book.getfoundry.sh/getting-started/installation#installation) if you haven't.

- generate remapping for VScode (optional)
```
forge remappings > remappings.txt
```

- install deps
```
foundryup
```

- build
```
forge build
```

- test
```
forge test
```

## Deploy
### to local acala fork
first start a local acala fork and an eth rpc adapter
```
cd ../../..     # root of the project
docker compose up
```

deploy to local acala fork with the pre-funded account
```
forge create src/Counter.sol:Counter \
  --private-key 0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f \
  --rpc-url http://localhost:8545 \
  --legacy
```

### to public network
in order to deploy to public network, we can skip step 1 and 2 in previous section, and switch to public eth rpc endpoint for step 3. For example, to deploy to acala mainnet, substitute `http://localhost:8545` with `https://eth-rpc-acala.aca-api.network`.

### use a deploy script
For more complex deployments or tests (for example if your tests need to make axios call), you might want to write a JS script. In such case you can easily integrate foundry with hardhat by following the instructions [here](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-and-foundry). You can still write, test, and build contracts with foundry.
