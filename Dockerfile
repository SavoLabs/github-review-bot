FROM node:onbuild
MAINTAINER SAVO <tsg-dl-savolabs@savogroup.com>

EXPOSE 3000

COPY . /github-review-bot
WORKDIR /github-review-bot
RUN npm install && npm start
