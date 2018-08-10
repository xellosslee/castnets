#Dockerfile
FROM node:10
COPY package.json /src/package.json
RUN  cd /src;
COPY . /src
EXPOSE 3000
WORKDIR /src
ENV NODE_ENV 'test'
ENV CASTNETS_DBUSER 'castnetsmysqler'
ENV CASTNETS_DBPASS 'c@stnet&mysql1@#'

CMD node server.js