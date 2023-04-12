# =============== eth-providers-test =============== #
FROM node:16-alpine as eth-providers-test
COPY --from=bodhi-base /app /app

WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "run", "test"]
