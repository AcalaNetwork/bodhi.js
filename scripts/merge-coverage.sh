#!/bin/bash

yarn nyc merge packages/eth-providers/coverage .nyc_output/eth-provider.json
yarn nyc merge packages/eth-rpc-adapter/coverage .nyc_output/eth-rpc-adapter.json
yarn nyc report   \
  --reporter=html \
  --reporter=lcov \
  --reporter=text \
  --report-dir=coverage
