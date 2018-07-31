FROM nginx

RUN apt-get update
RUN apt-get install nginx

COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d ./conf.d
COPY sites-available ./sites-available

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]