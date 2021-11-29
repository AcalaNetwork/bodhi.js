#!/bin/sh

build_all() {
  sh -c 'rush build \
    -t evm-waffle-example-dex \
    -t evm-waffle-example-e2e \
    -t evm-waffle-example-erc20 \
    -t evm-waffle-example-oracle \
    -t evm-waffle-example-state-rent \
    -t evm-waffle-example-arbitrager \
    -t evm-waffle-example-scheduler'
}

rebuild_all() {
  sh -c 'rush rebuild \
    -t evm-waffle-example-dex \
    -t evm-waffle-example-e2e \
    -t evm-waffle-example-erc20 \
    -t evm-waffle-example-oracle \
    -t evm-waffle-example-state-rent \
    -t evm-waffle-example-arbitrager \
    -t evm-waffle-example-scheduler'
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
