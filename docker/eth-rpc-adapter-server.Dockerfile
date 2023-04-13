# =============== eth-rpc-adapter =============== #
FROM bodhi-runner as eth-rpc-adapter

VOLUME ["/app"]
WORKDIR /app

HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD curl --fail http://localhost:8545 || exit 1

ENTRYPOINT yarn install --immutable; yarn workspace @acala-network/eth-rpc-adapter run start $0 $@
