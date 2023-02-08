FROM node:19.6.0-alpine3.17 AS development

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install --development --frozen-lockfile

COPY . .

CMD ["yarn", "start:dev"]