#!/bin/bash

getBlockNumber() {
    local rpcUrl=$1
    local networkName=$2

    response=$(curl -s -H "Content-Type: application/json" --data \
        '{"jsonrpc":"2.0", "method":"chain_getHeader", "params":[], "id":1}' \
        $rpcUrl)

    # Extract the block number in hexadecimal, removing the "0x" prefix
    blockNumberHex=$(echo $response | jq -r '.result.number' | sed 's/0x//')

    # Convert the hexadecimal block number to decimal
    blockNumberDecimal=$((16#$blockNumberHex))

    echo "$networkName Block Number: $blockNumberDecimal"
}

getBlockNumber "https://karura-rpc.aca-api.network" "karura"
getBlockNumber "https://acala-rpc.aca-api.network" "acala"
