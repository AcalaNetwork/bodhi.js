#!/bin/sh

build_all() {
  sh -c 'rush build \
    -t evm-example-dex \
    -t evm-example-e2e \
    -t evm-example-erc20 \
    -t evm-example-oracle \
    -t evm-example-state-rent \
    -t evm-example-arbitrager \
    -t evm-example-scheduler'
}

rebuild_all() {
  sh -c 'rush rebuild \
    -t evm-example-dex \
    -t evm-example-e2e \
    -t evm-example-erc20 \
    -t evm-example-oracle \
    -t evm-example-state-rent \
    -t evm-example-arbitrager \
    -t evm-example-scheduler'
}

test_all() {
  examples=(
    "dex"
    "oracle"
    "erc20"
    "state-rent"
    "e2e"
    "scheduler"
    "arbitrager"
    "uniswap"
  )

  ROOT=$(pwd)

  for e in "${examples[@]}"
  do
    echo "--------------- testing ${e} ---------------"

    cd  "${ROOT}/${e}"
    rushx test

    echo ""
  done
}

build_and_test() {
  build_all
  test_all
}

case "$1" in
  "build") build_all ;;
  "rebuild") rebuild_all ;;
  "test") test_all ;;
  *) build_and_test ;;
esac
