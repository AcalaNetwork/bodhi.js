# =============== yarn install =============== #
FROM bodhi-runner as yarn-install

VOLUME ["/app"]
WORKDIR /app

ENTRYPOINT yarn install --immutable;
