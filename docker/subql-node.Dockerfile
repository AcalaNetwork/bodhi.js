FROM bodhi-runner as builder
WORKDIR /app
COPY . .
RUN yarn install --immutable
RUN yarn workspace @acala-network/evm-subql pack

# =============

FROM onfinality/subql-node:v1.17.0 as subql-node
LABEL maintainer="hello@acala.network"

COPY --from=builder /app/packages/evm-subql/package.tgz /tmp
RUN tar -xvzf /tmp/package.tgz
RUN mv /package /app
RUN rm -rf /tmp
WORKDIR /app
