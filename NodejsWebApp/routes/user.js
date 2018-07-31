module.exports = function (app, conn) {
    const express = require('express');
    var route = express.Router();

    // redis 모듈사용
    //var Redis = require('ioredis');
    //var redis = new Redis(6379, '127.0.0.1');

    route.use(function (req, res, next) {
        req.redis = redis;
        next();
    });

    route.post('/profile', function (req, res, next) {
        req.accepts('application/json');

        var key = req.body.name;
        var value = JSON.stringify(req.body);

        req.redis.set(key, value, function (err, data) {
            if (err) {
                console.log(err);
                res.send("error " + err);
                return;
            }
            req.redis.expire(key, 10);
            res.json(value);
            //console.log(value);
        });
    });

    route.get('/profile/:name', function (req, res, next) {
        var key = req.params.name;

        req.redis.get(key, function (err, data) {
            if (err) {
                console.log(err);
                res.send("error " + err);
                return;
            }

            var value = JSON.parse(data);
            res.json(value);
        });
    });

    // catch 404 and forward to error handler
    route.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    return route;
};