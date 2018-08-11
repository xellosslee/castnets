module.exports = function (app) {
    const express = require('express');
    require('../modules/common.js');
    const fs = require('fs');
    var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
    const crypto = require('crypto-browserify');
    var nodemailer = require('nodemailer');
    var route = express.Router();
    // redis 모듈사용
    //var Redis = require('ioredis');
    //var redis = new Redis(6379, '127.0.0.1');
    //route.use(function (req, res, next) {
    //    req.redis = redis;
    //    next();
    //});
    var smtpTransport = nodemailer.createTransport({
        host: 'smart.whoismail.net',
        port: 587,
        secure: false,
        auth: {
            user: 'admin@castnets.co.kr',
            pass: 'iglab2018!'
        }
    });
    route.get('*', function (req, res, next) {
        if (req.protocol !== 'https') {
            if (req.hostname === "localhost") {
                res.redirect('https://' + req.hostname + ':8443' + req.originalUrl);
            }
            else {
                res.redirect('https://' + req.hostname + req.originalUrl);
            }
        }
        else
            next();
    });
    /** 회원가입
     * req : logid(sms인증 받았던 logid), email(둘중 하나만 보내면 됨), pass, loginpath(구글:90101 애플:90102)
     * res : resultcode 결과값과 token값 json으로 리턴
     */ 
    route.post('/join', function (req, res, next) {
        console.log(req.body);
        var conn = require('../modules/mysql.js')();
        var result = {};
        result.resultcode = resultcode.Failed;
        try {
            var pass, salt;
            crypto.randomBytes(64, (err, buf) => {
                salt = buf.toString('base64');
                crypto.pbkdf2(req.body.pass, salt, 100000, 64, 'sha512', (err, key) => {
                    pass = key.toString('base64');

                    var sql = "SET @userid = 0;"
                        + "CALL userjoin('" + (req.body.logid === undefined ? 0 : req.body.logid) + "','"
                        + (req.body.email === undefined ? '' : req.body.email) + "','"
                        + pass + "','" + salt + "'," + req.body.loginpath + ", @userid);"
                        + "SELECT @userid;";

                    //console.log(sql);
                    conn.query(sql, function (err, rows) {
                        if (err) {
                            res.json(result);
                            conn.close();
                            throw err;
                        }
                        else {
                            result.resultcode = resultcode.Success;
                            req.session.userid = rows[2][0]['@userid'];
                            res.json(result);
                            conn.close();

                            // 이메일로 가입한 경우 인증메일 발송
                            if ((req.body.logid === undefined ? '' : req.body.logid) == '') {
                                // 인증메일 발송
                                var mailOptions = {
                                    from: '캐스트네츠 <admin@castnets.co.kr>',
                                    to: 'xellossmail@gmail.com',
                                    subject: '가입인증 메일',
                                    html: '<h1>HTML 보내기 테스트</h1><p><img src="http://www.nodemailer.com/img/logo.png"/></p>'
                                };
                                //smtpTransport.sendMail(mailOptions, function (error, response) {
                                //    if (error) {
                                //        console.log(error);
                                //    } else {
                                //        console.log("Cert mail sent : " + response.message);
                                //    }
                                //    smtpTransport.close();
                                //});
                            }
                        }
                    });
                });
            });
        }
        catch (e) {
            res.json(result);
            conn.close();
            throw err;
        }
    });
    /** 인증문자 발송
     * req : 휴대전화번호 phone, key(현재시간을 암호화하여 전송 : 무분별하게 호출되는것을 막기 위함)
     * res : resultcode 결과값과 certkey를 json으로 리턴 (인증완료 할때 해당 certkey를 함께 보내야함)
     * 암복호화 예제
    const cipher = crypto.createCipher('aes-256-cbc', 'keyboard cat');
    let result = cipher.update(Date.now().toString(), 'utf8', 'base64'); // 'HbMtmFdroLU0arLpMflQ'
    result += cipher.final('base64'); // 'HbMtmFdroLU0arLpMflQYtt8xEf4lrPn5tX5k+a8Nzw='
    console.log(result);
    const decipher = crypto.createDecipher('aes-256-cbc', 'keyboard cat');
    let result2 = decipher.update(result, 'base64', 'utf8'); // 복호화할문 (base64, utf8이 위의 cipher과 반대 순서입니다.)
    result2 += decipher.final('utf8'); // 복호화할문장 (여기도 base64대신 utf8)
    console.log(result2);
     */
    route.post('/sendcertsms', function (req, res, next) {
        var result = {};
        result.resultcode = resultcode.Failed;

        console.log(req.body);
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', 'keyboard cat');
            let result2 = decipher.update(req.body.key, 'base64', 'utf8'); // 암호화할문 (base64, utf8이 위의 cipher과 반대 순서입니다.)
            result2 += decipher.final('utf8'); // 암호화할문장 (여기도 base64대신 utf8)

            if (Number(result2) + 3000 <= Date.now()) { // 해당 암호문이 만들어진지 3초 이상 경과하였다면 오류로 판단
                console.log('sendcertsms received wrong key');
                // RestApi 테스트를 위해 임시 비활성화
                //res.json(result);
                //return;
            }
        }
        catch (err) { // 복호화에 실패하면 에러 리턴
            res.json(result);
            throw err;
        }
        var conn = require('../modules/mysql.js')();
        try {
            // 해당 전화번호로 문자 메시지를 마지막으로 보낸지 1분이상 경과하였는지 체크
            var sql = "CALL smssendcheck('" + req.body.phone + "');";
            conn.query(sql, function (err, rows) {
                if (err) {
                    res.json(result);
                    conn.close();
                    throw err;
                }
                else {
                    if (rows[0][0]['cnt'] > 0) { // 1분이내에 전송한 기록이 있는경우 실패 리턴
                        result.resultcode = resultcode.TooFastSmsSent;
                        res.json(result);
                        conn.close();
                    }
                    else if (rows[0][0]['cnt'] === -1) {// 동일한 폰번호로 가입되어 있다면 실패
                        result.resultcode = resultcode.AlreadyExistsPhone;
                        res.json(result);
                        conn.close();
                    }
                    else { // 1분이내에 전송한 기록이 없어야만 전송함
                        // 전송기록을 먼저 남김
                        var certnum = Math.floor(Math.random() * (9999 - 1000)) + 1000; // 1000~9999 까지의 임의의 숫자 생성
                        var msg = "캐스트네츠 [" + certnum + "] 인증번호를 입력해주세요.";
                        var sql = "SET @logid=0;CALL smssendlogadd('" + req.body.phone + "','" + msg + "', @logid);SELECT @logid;";
                        conn.query(sql, function (err, rows) {
                            if (err) {
                                res.json(result);
                                conn.close();
                                throw err;
                            }
                            else {
                                if (rows[2][0]['@logid'] > 0) { // 기록이 정상적으로 남았음
                                    // 실제 발송해야함, 일단 발송 성공했다 치고 로그 업데이트
                                    var smsresult = "결과";
                                    var sql = "CALL smssendlogupdate(@logid, '" + smsresult + "');";
                                    conn.query(sql, function (err, rows) {
                                        if (err) {
                                            res.json(result);
                                            conn.close();
                                            throw err;
                                        }
                                        else {
                                            result.resultcode = resultcode.Success;
                                            result.certkey = rows[2][0]['@logid'];
                                            res.json(result);
                                            conn.close();
                                        }
                                    });
                                }
                                else { // 기록 남기기 실패 - 시스템에러
                                    res.json(result);
                                    conn.close();
                                }
                            }
                        });
                    }
                }
            });
        }
        catch (err) {
            res.json(result);
            conn.close();
            throw err;
        }
    });
    /** sms인증
     * req : logid(문자발송시 리턴받은 값), certnum 인증숫자
     * res : resultcode 결과값 json으로 리턴
     */
    route.post('/smscert', function (req, res, next) {
        console.log(req.body);

        var conn = require('../modules/mysql.js')();
        var result = {};
        result.resultcode = resultcode.Failed;
        try {
            var sql = "CALL smscert(" + req.body.logid + "," + req.body.certnum + ");";
            conn.query(sql, function (err, rows) {
                if (err) {
                    res.json(result);
                    conn.close();
                    throw err;
                }
                else {
                    if (rows.affectedRows == 0) {
                        result.resultcode = resultcode.CertNumNotMatch;
                    }
                    else {
                        result.resultcode = resultcode.Success;
                    }
                    res.json(result);
                    conn.close();
                }
            });
        }
        catch (err) {
            res.json(result);
            conn.close();
            throw err;
        }
    });
    /** 유저로그인
     * req : loginid(이메일 혹은 전화번호), pass, loginpath(구글:90101 애플:90102)
     * res : resultcode 결과값 json으로 리턴
     */
    route.post('/login', function (req, res, next) {
        console.log(req.body);

        var conn = require('../modules/mysql.js')();
        var result = {};
        result.resultcode = resultcode.Failed;
        try {
            var pass, salt;
            var sql = "CALL usergetsalt('" + req.body.loginid + "');";

            conn.query(sql, function (err, rows) {
                if (err) {
                    res.json(result);
                    conn.close();
                    throw err;
                }
                else {
                    if (rows[0].length <= 0) {
                        result.resultcode = resultcode.NotExistsAccount;
                        res.json(result);
                        conn.close();
                        return;
                    }
                    console.log('get salt : ' + rows[0][0]['salt']);
                    salt = rows[0][0]['salt'];

                    crypto.pbkdf2(req.body.pass, salt, 100000, 64, 'sha512', (err, key) => {
                        pass = key.toString('base64');

                        var sql = "SET @userid = 0;"
                            + "CALL userlogin('" + req.body.loginid + "','"
                            + pass + "'," + req.body.loginpath + ", @userid);"
                            + "SELECT @userid;";

                        console.log(sql);
                        conn.query(sql, function (err, rows) {
                            if (err) {
                                result.resultcode = resultcode.NotExistsAccount;
                                res.json(result);
                                conn.close();
                                throw err;
                            }
                            else {
                                if (rows[2][0]['@userid'] == null || rows[2][0]['@userid'] == 0) {
                                    console.log('Password missmatch');
                                    result.resultcode = resultcode.WorngPassword;
                                    res.json(result);
                                    conn.close();
                                    return;
                                }
                                result.resultcode = resultcode.Success;
                                res.session.userid = rows[2][0]['@userid'];
                                res.json(result);
                                conn.close();
                            }
                        });
                    });
                }
            });
        }
        catch (err) {
            res.json(result);
            conn.close();
            throw err;
        }
    });
    /** 유저 토큰 정상 체크
     * req : token
     * res : resultcode 결과값
     */
    route.post('/tokencheck', function (req, res, next) {
        console.log(req.body);

        var conn = require('../modules/mysql.js')();
        var result = {};
        result.resultcode = resultcode.Failed;
        try {
            var pass, salt;
            var sql = "CALL usertokencheck('" + req.body.token + "');";

            conn.query(sql, function (err, rows) {
                if (err) {
                    res.json(result);
                    conn.close();
                    throw err;
                }
                else {
                    if (rows[0].length <= 0) {
                        result.resultcode = resultcode.InvalidToken;
                    }
                    else {
                        console.log('User alive check : ' + rows[0][0]['userid'] + '_' + rows[0][0]['alive']);
                        if (rows[0][0]['alive'] == 0) {
                            result.resultcode = resultcode.ExpiredToken;
                        }
                        else {
                            result.resultcode = resultcode.Success;
                            res.session.userid = rows[0][0]['userid'];
                        }
                    }
                    res.json(result);
                    conn.close();
                }
            });
        }
        catch (e) {
            res.json(result);
            conn.close();
            throw err;
        }
    });
    /** 유저프로필 보기
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