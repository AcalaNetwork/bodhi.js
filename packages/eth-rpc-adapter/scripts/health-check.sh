#!/bin/bash

HEALTH_CHECK_URL="http://localhost:8545"
MAX_ATTEMPTS=30
INTERVAL=1

attempt=0
while [ $attempt -lt $MAX_ATTEMPTS ]; do
    resp=$(curl -s -X POST -H "Content-Type: application/json" -d '{
        "id": 0,
        "jsonrpc": "2.0",
        "method": "eth_chainId",
        "params": []
    }' $HEALTH_CHECK_URL)

    res=$(echo $resp | jq -r '.result')

    if [ "$res" = "0x313" ]; then
        echo "🚀 eth rpc ready in $attempt seconds"
        exit 0
    fi

    echo "waiting for eth rpc to start... ($attempt seconds)"

    sleep $INTERVAL
    attempt=$((attempt+1))
done

pm2 logs eth-rpc

echo "❌ eth rpc failed to start in $MAX_ATTEMPTS seconds"
exit 1