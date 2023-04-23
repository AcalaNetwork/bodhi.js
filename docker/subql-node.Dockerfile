FROM onfinality/subql-node:v1.17.0 as subql-node
LABEL maintainer="hello@acala.network"

VOLUME ["/app"]
WORKDIR /app/packages/evm-subql
CMD yarn build
