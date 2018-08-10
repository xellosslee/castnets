FROM node:10
COPY package.json /src/package.json
RUN  cd /src;
COPY . /src
EXPOSE 3000
WORKDIR /src
ENV NODE_ENV $NODE_ENV
ENV CASTNETS_DBUSER $CASTNETS_DBUSER
ENV CASTNETS_DBPASS $CASTNETS_DBPASS

# 마운트할 볼륨의 위치를 지정
#VOLUME["/data"]

CMD node server.js