# =============== eth-providers-test =============== #
FROM node:16-alpine as eth-providers-test
COPY --from=bodhi-base /app /app

WORKDIR /app
COPY eth-providers ./eth-providers

WORKDIR /app/eth-providers
ENV ENDPOINT_URL=ws://mandala-subway:9955
CMD ["yarn", "test:CI"]
