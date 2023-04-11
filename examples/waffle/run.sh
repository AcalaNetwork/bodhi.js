#!/bin/bash

failed=0

build_all() {
  sh -c 'yarn \
    workspace evm-waffle-example-arbitrager \
    workspace evm-waffle-example-dex \
    workspace evm-waffle-example-e2e \
    workspace evm-waffle-example-erc20 \
    workspace evm-waffle-example-evm \
    workspace evm-waffle-example-evm-accounts \
    workspace evm-waffle-example-hello-world \
    workspace evm-waffle-example-homa \
    workspace evm-waffle-example-honzon \
    workspace evm-waffle-example-incentives \
    workspace evm-waffle-example-oracle \
    workspace evm-waffle-example-scheduler \
    workspace evm-waffle-example-stable-asset \
    build'
}

test_all() {
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

  ROOT=$(pwd)

  for e in "${examples[@]}"
  do
    echo "--------------- testing ${e} ---------------"

    cd  "${ROOT}/${e}"

    if ! yarn test; then
      ((failed=failed+1))
    fi

    echo ""
  done

  echo "+++++++++++++++++++++++"
  echo "test failed: $failed"
  echo "+++++++++++++++++++++++"
}

build_and_test() {
  build_all
  test_all

  exit $failed
}

case "$1" in
  "build") build_all ;;
  "test") test_all ;;
  "build_and_test") build_and_test ;;
  *) build_and_test ;;
esac
