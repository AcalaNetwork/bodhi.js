#!/bin/bash

yarn nyc merge packages/.coverage/eth-transactions .nyc_output/eth-transactions.json
yarn nyc merge packages/.coverage/eth-providers .nyc_output/eth-provider.json
yarn nyc merge packages/.coverage/eth-rpc-adapter .nyc_output/eth-rpc-adapter.json
yarn nyc merge packages/.coverage/e2e-hardhat .nyc_output/e2e-hardhat.json


yarn nyc report   \
  --reporter=html \
  --reporter=lcov \
  --reporter=text \
  --report-dir=coverage
