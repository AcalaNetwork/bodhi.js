# =============== subql-node =============== #
FROM onfinality/subql-node:v0.25.4-7 as subql-node
COPY evm-subql /app/evm-subql

WORKDIR /app/evm-subql
RUN yarn
RUN yarn build
