# =============== subql-node =============== #
FROM onfinality/subql-node:v1.7.0 as subql-node
COPY evm-subql /app/evm-subql

WORKDIR /app/evm-subql
RUN yarn
RUN yarn build
