FROM node:14-alpine

ARG mandala_url=wss://node-6870830370282213376.rz.onfinality.io/ws?apikey=0f273197-e4d5-45e2-b23e-03b015cb7000
ENV ENDPOINT_URL=$mandala_url

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package.json.docker ./package.json
COPY yarn.lock.docker ./yarn.lock

RUN yarn

COPY . .

RUN [ "yarn", "build" ]

EXPOSE 8545

CMD ["yarn", "ts-node", "src/index.ts"]