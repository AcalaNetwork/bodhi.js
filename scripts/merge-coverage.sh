#!/bin/bash

yarn nyc merge packages/bodhi/coverage .nyc_output/bodhi.json
yarn nyc merge packages/eth-transactions/coverage .nyc_output/eth-transactions.json
yarn nyc merge packages/eth-providers/coverage .nyc_output/eth-provider.json
yarn nyc merge packages/eth-rpc-adapter/coverage .nyc_output/eth-rpc-adapter.json

yarn nyc merge packages/eth-rpc-adapter/coverage-e2e-hardhat .nyc_output/e2e-hardhat.json
yarn nyc merge packages/eth-rpc-adapter/coverage-e2e-truffle .nyc_output/e2e-truffle.json
yarn nyc merge packages/eth-rpc-adapter/coverage-e2e-viem .nyc_output/e2e-viem.json
yarn nyc report   \
  --reporter=html \
  --reporter=lcov \
  --reporter=text \
  --report-dir=coverage
