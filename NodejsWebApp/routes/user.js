module.exports = function (app, conn) {
    const express = require('express');
    const crypto = require('crypto-browserify');
    var route = express.Router();
    const fs = require('fs');
    var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
    // redis 모듈사용
    //var Redis = require('ioredis');
    //var redis = new Redis(6379, '127.0.0.1');
    //route.use(function (req, res, next) {
    //    req.redis = redis;
    //    next();
    //});
    /** 회원가입
     * req : phone, email(둘중 하나만 보내면 됨), pass
     * res : resultcode 결과값과 token값 json으로 리턴
     */ 
    route.post('/join', function (req, res, next) {
        console.log(req.body);

        var conn = require('../modules/mysql.js')();
        try {
            var pass, salt;
            crypto.randomBytes(64, (err, buf) => {
                salt = buf.toString('base64');
                crypto.pbkdf2(req.body.pass, salt, 100000, 64, 'sha512', (err, key) => {
                    pass = key.toString('base64');

                    var text = 'CALL userjoin(\'' + req.body.phone + '\',\'' + req.body.email + '\',\'' + pass + '\',\'' + salt + '\')';
                    conn.query(text, function (err, rows) {
                        if (err) {
                            throw err;
                        }
                        else {
                            res.json('{"resultcode":' + resultcode.SUCCESS + '}');
                            conn.close();

                        }
                    });
                });
            });
        }
        catch (e) {
            res.json('{"resultcode":' + resultcode.FAILED + '}');
            conn.close();
        }
    });
    /** 프로필 저장
     */
    route.post('/addprofile', function (req, res, next) {
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
    /** 프로필 보기
     */
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