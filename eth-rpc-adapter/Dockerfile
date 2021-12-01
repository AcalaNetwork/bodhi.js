FROM node:14-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY . .
COPY docker/package.json ./package.json
COPY docker/yarn.lock ./yarn.lock

RUN yarn
RUN [ "yarn", "build" ]

EXPOSE 8545

USER node

CMD ["yarn", "start"]