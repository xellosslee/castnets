#Dockerfile
FROM node:10
COPY package.json /src/package.json
RUN  cd /src;
COPY . /src
EXPOSE 3000
WORKDIR /src

CMD node server.js