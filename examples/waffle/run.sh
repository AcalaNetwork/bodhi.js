#!/bin/bash

failed=0

build_all() {
  sh -c 'rush build \
    -t evm-waffle-example-arbitrager \
    -t evm-waffle-example-dex \
    -t evm-waffle-example-e2e \
    -t evm-waffle-example-erc20 \
    -t evm-waffle-example-evm \
    -t evm-waffle-example-evm-accounts \
    -t evm-waffle-example-hello-world \
    -t evm-waffle-example-homa \
    -t evm-waffle-example-oracle \
    -t evm-waffle-example-scheduler'
}

rebuild_all() {
  sh -c 'rush rebuild \
    -t evm-waffle-example-arbitrager \
    -t evm-waffle-example-dex \
    -t evm-waffle-example-e2e \
    -t evm-waffle-example-erc20 \
    -t evm-waffle-example-evm \
    -t evm-waffle-example-evm-accounts \
    -t evm-waffle-example-hello-world \
    -t evm-waffle-example-homa \
    -t evm-waffle-example-oracle \
    -t evm-waffle-example-scheduler'
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
    "homa"
    "oracle"
    "scheduler"
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
  "rebuild") rebuild_all ;;
  "test") test_all ;;
  "build_and_test") build_and_test ;;
  *) build_and_test ;;
esac
