FROM bodhi-runner as builder
LABEL maintainer="hello@acala.network"

WORKDIR /app

COPY evm-subql /app/evm-subql
WORKDIR /app/evm-subql
RUN yarn && yarn build

# =============

FROM onfinality/subql-node:v1.17.0 as subql-node
LABEL maintainer="hello@acala.network"

WORKDIR /app
COPY --from=builder /app/evm-subql /app
