# =============== subql-node =============== #
FROM onfinality/subql-node:v0.33.0 as subql-node
COPY evm-subql /app/evm-subql

WORKDIR /app/evm-subql
RUN yarn
RUN yarn build
