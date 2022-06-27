# =============== eth-rpc-adapter =============== #
FROM node:16-alpine as eth-rpc-adapter
COPY --from=bodhi-base /app /app

WORKDIR /app
COPY eth-rpc-adapter ./eth-rpc-adapter

WORKDIR /app/eth-rpc-adapter

# looks like CMD can't read commands from docker-compose.yml, so we use ENTRYPOINT
ENTRYPOINT ["yarn", "start"]
