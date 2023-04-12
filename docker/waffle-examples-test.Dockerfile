# =============== waffle-examples =============== #
FROM node:16-alpine as waffle-examples
COPY --from=bodhi-base /app /app

WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "run", "test:examples"]
