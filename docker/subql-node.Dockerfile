FROM subquerynetwork/subql-node-substrate:v3.10.1 AS subql-node
LABEL maintainer="hello@acala.network"

VOLUME ["/app"]
WORKDIR /app/packages/evm-subql

# has to override entry point for now
# https://github.com/subquery/subql/pull/2344
ENTRYPOINT ["/sbin/tini", "--", "/bin/run"],
