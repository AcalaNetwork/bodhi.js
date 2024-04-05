FROM subquerynetwork/subql-node-substrate:v3.10.1 as subql-node
LABEL maintainer="hello@acala.network"

VOLUME ["/app"]
WORKDIR /app/packages/evm-subql
