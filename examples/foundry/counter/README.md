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
### to local mandala
1) first start a local mandala
```
docker run -it --rm -p 9944:9944 ghcr.io/acalanetwork/mandala-node:sha-3267408 --dev --rpc-external --rpc-cors=all --rpc-methods=unsafe -levm=debug --pruning=archive --instant-sealing
```

2) then start an eth rpc adapter
```
npx @acala-network/eth-rpc-adapter@latest --localMode
```

3) deploy to local mandala with the pre-funded account
```
forge create src/Counter.sol:Counter \
  --private-key 0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f \
  --rpc-url http://localhost:8545 \
  --legacy
```

### to public network
in order to deploy to public network, we can skip step 1 and 2 in previous section, and switch to public eth rpc endpoint for step 3. For example, to deploy to public mandala, substitute `http://localhost:8545` with `https://eth-rpc-tc9.aca-staging.network`.

### use a deploy script
For more complex deployments or tests (for example if your tests need to make axios call), you might want to write a JS script. In such case you can easily integrate foundry with hardhat by following the instructions [here](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-and-foundry). You can still write, test, and build contracts with foundry.
