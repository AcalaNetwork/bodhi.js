# =============== subql-node =============== #
FROM onfinality/subql-node:v0.33.0 as subql-node
COPY evm-subql /app/evm-subql

WORKDIR /app/evm-subql
RUN apk update && apk upgrade && apk add python3 make gcc g++
RUN yarn
RUN yarn build
