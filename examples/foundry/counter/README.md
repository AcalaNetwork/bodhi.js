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
docker run -it --rm -p 9944:9944 -p 9933:9933 ghcr.io/acalanetwork/mandala-node:sha-a32c40b --dev --ws-external --rpc-port=9933 --rpc-external --rpc-cors=all --rpc-methods=unsafe -levm=debug --pruning=archive --instant-sealing
```

2) then start an eth rpc adapter
```
npx @acala-network/eth-rpc-adapter@latest --localMode
```

3) fetch contract deployment gas params
```
curl --location --request GET 'http://localhost:8545' \
--header 'Content-Type: application/json' \
--data-raw '{
    "jsonrpc": "2.0",
    "method": "eth_getEthGas",
    "params": [],
    "id": 1
}'

## result
{"id":1,"jsonrpc":"2.0","result":{"gasPrice":"0x2e90f303ea","gasLimit":"0x329b140"}}
```

4) deploy to local mandala with the fetched gas params 
```
forge create src/Counter.sol:Counter \
  --private-key 0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f \
  --rpc-url http://localhost:8545 \
  --gas-price 0x2e90f203ea \
  --gas-limit 0x329b140 \
  --legacy
```

### to public network
in order to deploy to public network, we can skip step 1 and 2 in previous section, and switch to public eth rpc endpoint for step 3 and 4. For example, to deploy to public mandala, substitute `http://localhost:8545` with `https://eth-rpc-mandala.aca-staging.network`.

### use a deploy script
For more complex deployments, you might need to write a script. However, foundry has poor support for custom gas, which is required to deploy a contract. In this case, we recommend using other tools such as waffle, truffle, or hardhat. You can still write, test, and build the contract in foundry.
