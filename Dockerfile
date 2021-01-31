FROM node:current-buster-slim
MAINTAINER Wesley Hales <wesleyhales@gmail.com>

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8000 443 80

VOLUME ["/tmp", "/usr/src/app/logs"]
RUN ["chmod", "+x", "/usr/src/app/starter_with_env.sh"]
ENTRYPOINT ["/usr/src/app/starter_with_env.sh"]

