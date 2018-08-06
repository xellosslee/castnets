FROM node:10
COPY package.json /src/package.json
RUN  cd /src;
COPY . /src
EXPOSE 3000
WORKDIR /src

# 마운트할 볼륨의 위치를 지정
#VOLUME["/data"]

CMD node server.js