# =============== eth-rpc-adapter =============== #
FROM node:16-alpine as eth-rpc-adapter
COPY --from=bodhi-base /app /app

RUN apk add curl

WORKDIR /app

HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD curl --fail http://localhost:8545 || exit 1

# looks like CMD can't read commands from docker-compose.yml, so we use ENTRYPOINT
ENTRYPOINT ["yarn", "workspace", "@acala-network/eth-rpc-adapter", "run", "start"]
