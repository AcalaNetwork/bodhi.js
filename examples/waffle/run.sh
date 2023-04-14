#!/bin/bash
# Run all tests in order
examples=(
    "arbitrager"
    "dex"
    "e2e"
    "erc20"
    "evm"
    "evm-accounts"
    "hello-world"
    "honzon"
    "incentives"
    "oracle"
    "scheduler"
    "stable-asset"
    "homa"
    "uniswap"
)

for e in "${examples[@]}"
  do
    echo "--------------- testing ${e} ---------------"

    if ! yarn workspace evm-waffle-example-${e} run test; then
      ((failed=failed+1))
    fi

    echo "--------------- done testing ${e} ---------------"
  done

echo "+++++++++++++++++++++++"
echo "test failed: $failed"
echo "+++++++++++++++++++++++"
