# =============== waffle-tutorials =============== #
FROM bodhi-runner as waffle-tutorials
VOLUME ["/app"]
WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD yarn install --immutable; yarn build; yarn run test:mandala:ci
