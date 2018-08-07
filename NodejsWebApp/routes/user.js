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
     * req : phone, email(둘중 하나만 보내면 됨), pass, loginpath(구글:90101 애플:90102)
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

                    var text = 'SET @token = \'\';\
                        CALL userjoin(\'' + (req.body.phone === undefined ? '' : req.body.phone) + '\',\''
                        + (req.body.email === undefined ? '' : req.body.email) + '\',\''
                        + pass + '\',\'' + salt + '\',' + req.body.loginpath + ', @token);'
                        + 'SELECT @token;';

                    //console.log(text);
                    conn.query(text, function (err, rows) {
                        if (err) {
                            res.json({ resultcode: resultcode.Failed, token: "" });
                            conn.close();
                            throw err;
                        }
                        else {
                            console.log('Issued access token : ' + rows[2][0]['@token']);
                            res.json({ resultcode: resultcode.Success, token: rows[2][0]['@token'] });
                            conn.close();
                        }
                    });
                });
            });
        }
        catch (e) {
            res.json({ resultcode: resultcode.Failed, token: "" });
            conn.close();
            throw err;
        }
    });
    /** 유저로그인
     * req : loginid(이메일 혹은 전화번호), pass, loginpath(구글:90101 애플:90102)
     * res : resultcode 결과값과 token값 json으로 리턴
     */
    route.post('/login', function (req, res, next) {
        console.log(req.body);

        var conn = require('../modules/mysql.js')();
        try {
            var pass, salt;
            var sql = 'CALL usergetsalt(\'' + req.body.loginid + '\');';

            conn.query(sql, function (err, rows) {
                if (err) {
                    res.json({ resultcode: resultcode.Failed, token: "" });
                    conn.close();
                    throw err;
                }
                else {
                    if (rows[0].length <= 0) {
                        res.json({ resultcode: resultcode.NotExistsAccount, token: "" });
                        conn.close();
                        return;
                    }
                    console.log('get salt : ' + rows[0][0]['salt']);
                    salt = rows[0][0]['salt'];

                    crypto.pbkdf2(req.body.pass, salt, 100000, 64, 'sha512', (err, key) => {
                        pass = key.toString('base64');

                        var sql = 'SET @token = \'\';'
                            + 'CALL userlogin(\'' + req.body.loginid + '\',\''
                            + pass + '\',' + req.body.loginpath + ', @token);'
                            + 'SELECT @token;';

                        console.log(sql);
                        conn.query(sql, function (err, rows) {
                            if (err) {
                                res.json({ resultcode: resultcode.NotExistsAccount, token: "" });
                                conn.close();
                                throw err;
                            }
                            else {
                                if (rows[2][0]['@token'] == null) {
                                    console.log('Password missmatch');
                                    res.json({ resultcode: resultcode.WorngPassword, token: "" });
                                    conn.close();
                                    return;
                                }
                                console.log('Issued access token : ' + rows[2][0]['@token']);
                                res.json({ resultcode: resultcode.Success, token: rows[2][0]['@token'] });
                                conn.close();
                            }
                        });
                    });
                }
            });
        }
        catch (e) {
            res.json({ resultcode: resultcode.Failed, token: "" });
            conn.close();
            throw err;
        }
    });
    /** 유저 토큰 정상 체크
     * req : token
     * res : resultcode 결과값
     */
    route.post('/checktoken', function (req, res, next) {
        console.log(req.body);

        var conn = require('../modules/mysql.js')();
        try {
            var pass, salt;
            var sql = 'CALL usersessioncheck(\'' + req.body.token + '\');';

            conn.query(sql, function (err, rows) {
                if (err) {
                    res.json({ resultcode: resultcode.Failed });
                    conn.close();
                    throw err;
                }
                else {
                    if (rows[0].length <= 0) {
                        res.json({ resultcode: resultcode.InvalidToken });
                        conn.close();
                        return;
                    }
                    console.log('User alive check : ' + rows[0][0]['userid'] + '_' + rows[0][0]['alive']);
                    if (rows[0][0]['alive'] == 0) {
                        res.json({ resultcode: resultcode.ExpiredToken });
                    }
                    else {
                        res.json({ resultcode: resultcode.Success });
                    }
                    conn.close();
                }
            });
        }
        catch (e) {
            res.json({ resultcode: resultcode.Failed });
            conn.close();
            throw err;
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
     * 주소값에 본인의 이름값(로그인 후 각자 변경가능)전달
     */
    route.get('/profile/:name', function (req, res, next) {
        var key = req.params.name;


    });
    // catch 404 and forward to error handler
    route.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    return route;
};