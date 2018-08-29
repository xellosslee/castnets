module.exports = (app)=>{
  const express = require('express');
  const session = require('express-session');
  const common = require('../modules/common.js')();
  const fs = require('fs');
  const path = require('path');
  var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
  const crypto = require('crypto-browserify');
  var nodemailer = require('nodemailer');
  var route = express.Router();

  route.use(session({
    secret: 'keyboard cat nari',
    resave: false,
    saveUninitialized: true
  }));
  // redis 모듈사용
  //var Redis = require('ioredis');
  //var redis = new Redis(6379, '127.0.0.1');
  //route.use((req, res, next)=>{
  //    req.redis = redis;
  //    next();
  //});
  // email send infomation
  var smtpTransport = nodemailer.createTransport({
    host: 'smart.whoismail.net',
    port: 587,
    secure: false,
    auth: {
      user: 'admin@castnets.co.kr',
      pass: 'iglab2018!'
    }
  });
  route.get('*', (req, res, next)=>{
    if (req.protocol !== 'https') {
      if (req.hostname === "localhost") {
        res.redirect('https://' + req.hostname + ':8443' + req.originalUrl);
      } else {
        res.redirect('https://' + req.hostname + req.originalUrl);
      }
    } else
      next();
  });
  // sms send infomation
  const request = require('request');
  /** 회원가입
   * req : logid(sms인증 받았던 logid), email(둘중 하나만 보내면 됨), pass, loginpath(구글:90101 애플:90102)
   * res : resultcode 결과값과 token값 json으로 리턴
   */
  route.post('/join', (req, res, next)=>{
    console.log(req.body);
    var conn = require('../modules/mysql.js')();
    try {
      var pass, salt;
      crypto.randomBytes(64, (err, buf) => {
        salt = buf.toString('base64');
        crypto.pbkdf2(req.body.pass, salt, 100000, 64, 'sha512', (err, key) => {
          pass = key.toString('base64');

          conn.beginTransaction(()=>{
            var sql = "SET @token = 0;" +
              "CALL userjoin_token('" + (req.body.logid === undefined ? 0 : req.body.logid) + "','" +
              (req.body.email === undefined ? '' : req.body.email) + "','" +
              pass + "','" + salt + "'," + req.body.loginpath + ", @token);" +
              "SELECT @token;";

            //console.log(sql);
            conn.query(sql, (err, rows)=>{
              if (err) {
                conn.rollback(()=>{
                  console.log('rollback join1');
                  common.sendResult(res, conn, resultcode.failed)
                  throw err;
                });
              }

              var token = rows[2][0]['@token'];
              sql = "SET @emailkey = '';" +
                "CALL emailsend('" + token + "', @emailkey);" +
                "SELECT @emailkey;";

              //console.log(sql);
              conn.query(sql, (err, rows)=>{
                if (err) {
                  conn.rollback(()=>{
                    console.log('rollback join2');
                    common.sendResult(res, conn, resultcode.failed);
                    throw err;
                  });
                }

                // 이메일로 가입한 경우 인증메일 발송
                if ((req.body.logid === undefined ? '' : req.body.logid) == '') {
                  // 이메일 인증키 가져오기
                  // 인증메일 발송
                  var mailOptions = {
                    from: '캐스트네츠 <admin@castnets.co.kr>',
                    to: req.body.email,
                    subject: '가입인증 메일',
                    html: common.htmlTempleate01.replace('|emailkey|', rows[2][0]['@emailkey'])
                  };
                  smtpTransport.sendMail(mailOptions, (err, response)=>{
                    if (err) {
                      console.log(err);
                      conn.rollback(()=>{
                        console.log('rollback join3');
                        common.sendResult(res, conn, resultcode.failed);
                        throw err;
                      });
                    } else {
                      console.log("Cert mail sent : " + response.message);

                      conn.commit(()=>{
                        common.sendResult(res, conn, resultcode.Success, {
                          "token": token
                        });
                      });
                    }
                    smtpTransport.close();
                  });
                } else { // 휴대폰으로 가입한 경우 바로 성공
                  conn.commit(()=>{
                    common.sendResult(res, conn, resultcode.Success, {
                      "token": token
                    });
                  });
                }
              });
            });
          }); // conn.beginTransaction
        });
      });
    } catch (e) {
      conn.rollback(()=>{
        console.log('rollback join4');
      });
      common.sendResult(res, conn, resultcode.failed);
      throw err;
    }
  });
  /** 인증문자 발송
   * req : 휴대전화번호 phone, key(현재시간을 암호화하여 전송 : 무분별하게 호출되는것을 막기 위함)
   * res : resultcode 결과값과 logid를 json으로 리턴 (인증완료 할때 해당 logid를 함께 보내야함)
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
  route.post('/sendcertsms', (req, res, next)=>{
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
    } catch (err) { // 복호화에 실패하면 에러 리턴
      res.json(result);
      throw err;
    }
    var conn = require('../modules/mysql.js')();
    try {
      // 해당 전화번호로 문자 메시지를 마지막으로 보낸지 1분이상 경과하였는지 체크
      var sql = "CALL smssendcheck('" + req.body.phone + "');";
      conn.query(sql, (err, rows)=>{
        if (err) {
          res.json(result);
          conn.close();
          throw err;
        } else {
          if (rows[0][0]['cnt'] > 0) { // 1분이내에 전송한 기록이 있는경우 실패 리턴
            result.resultcode = resultcode.TooFastSmsSent;
            res.json(result);
            conn.close();
          } else if (rows[0][0]['cnt'] === -1) { // 동일한 폰번호로 가입되어 있다면 실패
            result.resultcode = resultcode.AlreadyExistsPhone;
            res.json(result);
            conn.close();
          } else { // 1분이내에 전송한 기록이 없어야만 전송함
            // 전송기록을 먼저 남김
            var certnum = Math.floor(Math.random() * (9999 - 1000)) + 1000; // 1000~9999 까지의 임의의 숫자 생성
            var msg = "캐스트네츠 [" + certnum + "] 인증번호를 입력해주세요.";
            var sql = "SET @logid=0;CALL smssendlogadd('" + req.body.phone + "','" + msg + "', @logid);SELECT @logid;";
            conn.query(sql, (err, rows)=>{
              if (err) {
                res.json(result);
                conn.close();
                throw err;
              } else {
                var logid = rows[2][0]['@logid'];
                if (logid > 0) { // 기록이 정상적으로 남았음
                  // 요청 세부 내용
                  var options = {
                    url: 'https://apis.aligo.in',
                    method: 'POST',
                    headers: {
                      'User-Agent': 'Super Agent/0.0.1',
                      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                    },
                    form: {
                      "key": "lz2v2t9s1qa1259p8az1u2tiy49z773x",
                      "user_id": "ilgoonlab",
                      "sender": "01046350508",
                      "receiver": req.body.phone,
                      "msg": msg,
                      "testmode_yn": "Y"
                    }
                  };
                  // 요청 시작 받은값은 body
                  request(options, (error, response, body)=>{
                    if (!error && response.statusCode == 200) {
                      var json = JSON.parse(body);
                      console.log(json);
                      var sql = "CALL smssendlogupdate(@logid, '" + JSON.stringify(json) + "');";
                      conn.query(sql, (err, rows)=>{
                        if (err) {
                          res.json(result);
                          conn.close();
                          throw err;
                        } else {
                          if (json.result_code == 1) {
                            result.resultcode = resultcode.Success;
                            result.logid = logid;
                          } else {
                            result.resultcode = resultcode.SmsSendFailed;
                          }
                          res.json(result);
                          conn.close();
                        }
                      });
                    }
                  });
                } else { // 기록 남기기 실패 - 시스템에러
                  res.json(result);
                  conn.close();
                }
              }
            });
          }
        }
      });
    } catch (err) {
      res.json(result);
      conn.close();
      throw err;
    }
  });
  /** sms인증
   * req : logid(문자발송시 리턴받은 값), certnum 인증숫자
   * res : resultcode 결과값 json으로 리턴
   */
  route.post('/smscert', (req, res, next)=>{
    console.log(req.body);

    var conn = require('../modules/mysql.js')();
    var result = {};
    result.resultcode = resultcode.Failed;
    try {
      var sql = "CALL smscert(" + req.body.logid + "," + req.body.certnum + ");";
      conn.query(sql, (err, rows)=>{
        if (err) {
          res.json(result);
          conn.close();
          throw err;
        } else {
          if (rows[0][0].valiedlogid == 0) {
            result.resultcode = resultcode.SmsCertNotValied;
          } else if (rows[0][0].matchcertnum == 0) {
            result.resultcode = resultcode.CertNumNotMatch;
          } else if (rows[0][0].timelimit == 0) {
            result.resultcode = resultcode.CertTimeOut;
          } else /*if(rows[1].affectedRows > 0)*/ {
            result.resultcode = resultcode.Success;
          }
          res.json(result);
          conn.close();
        }
      });
    } catch (err) {
      res.json(result);
      conn.close();
      throw err;
    }
  });
  /** 유저로그인
   * req : loginid(이메일 혹은 전화번호), pass, loginpath(구글:90101 애플:90102)
   * res : resultcode 결과값 json으로 리턴
   */
  route.post('/login', (req, res, next)=>{
    console.log(req.body);

    var conn = require('../modules/mysql.js')();
    var result = {};
    result.resultcode = resultcode.Failed;
    result.token = '';
    try {
      var pass, salt;
      var sql = "CALL usergetsalt('" + req.body.loginid + "');";

      conn.query(sql, (err, rows)=>{
        if (err) {
          res.json(result);
          conn.close();
          throw err;
        } else {
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

            var sql = "SET @token = '';" +
              "CALL userlogin_token('" + req.body.loginid + "','" +
              pass + "'," + req.body.loginpath + ", @token);" +
              "SELECT @token;";

            console.log(sql);
            conn.query(sql, (err, rows)=>{
              if (err) {
                result.resultcode = resultcode.NotExistsAccount;
                res.json(result);
                conn.close();
                throw err;
              } else {
                if (rows[2][0]['@token'] == null || rows[2][0]['@token'] == 0) {
                  console.log('Password missmatch');
                  result.resultcode = resultcode.WorngPassword;
                  res.json(result);
                  conn.close();
                  return;
                }
                result.resultcode = resultcode.Success;
                result.token = rows[2][0]['@token'];
                res.json(result);
                conn.close();
              }
            });
          });
        }
      });
    } catch (err) {
      res.json(result);
      conn.close();
      throw err;
    }
  });
  /** 유저 로그아웃
   * req : token
   * res : resultcode 결과값
   */
  route.post('/logout', (req, res, next)=>{
    console.log(req.body);

    var conn = require('../modules/mysql.js')();
    var result = {};
    result.resultcode = resultcode.Failed;
    try {
      var pass, salt;
      var sql = "CALL userlogout('" + req.body.token + "');";

      conn.query(sql, (err, rows)=>{
        if (err) {
          res.json(result);
          conn.close();
          throw err;
        } else {
          result.resultcode = resultcode.Success;
          res.json(result);
          conn.close();
        }
      });
    } catch (err) {
      res.json(result);
      conn.close();
      throw err;
    }
  });
  /** 유저 토큰 정상 체크
   * req : token
   * res : resultcode 결과값
   */
  route.post('/tokencheck', (req, res, next)=>{
    console.log(req.body);

    var conn = require('../modules/mysql.js')();
    var result = {};
    result.resultcode = resultcode.Failed;
    try {
      var pass, salt;
      var sql = "CALL usertokencheck('" + req.body.token + "');";

      conn.query(sql, (err, rows)=>{
        if (err) {
          res.json(result);
          conn.close();
          throw err;
        } else {
          if (rows[0].length <= 0) {
            result.resultcode = resultcode.InvalidToken;
          } else {
            console.log('User alive check : ' + rows[0][0]['userid'] + '_' + rows[0][0]['alive']);
            if (rows[0][0]['alive'] == 0) {
              result.resultcode = resultcode.ExpiredToken;
            } else {
              result.resultcode = resultcode.Success;
            }
          }
          res.json(result);
          conn.close();
        }
      });
    } catch (err) {
      res.json(result);
      conn.close();
      throw err;
    }
  });
  /** 유저 이메일 인증처리
   * req : emailkey
   * res : resultcode 결과값
   */
  route.post('/emailresend', (req, res, next)=>{
    var conn = require('../modules/mysql.js')();
    try {
      var sql = "SET @emailkey = '';" +
        "CALL emailsend('" + req.body.token + "', @emailkey);" +
        "SELECT @emailkey;";

      conn.query(sql, (err, rows)=>{
        if (err) {
          common.sendResult(res, conn, resultcode.failed);
          throw err;
        }
        // 이메일 인증키 가져오기
        // 인증메일 발송
        var mailOptions = {
          from: '캐스트네츠 <admin@castnets.co.kr>',
          to: req.body.email,
          subject: '가입인증 메일',
          html: common.htmlTempleate01.replace('|emailkey|', rows[2][0]['@emailkey'])
        };
        smtpTransport.sendMail(mailOptions, (err, response)=>{
          smtpTransport.close();
          if (err) {
            console.log(err);
            common.sendResult(res, conn, resultcode.failed);
            throw err;
          } else {
            console.log("Cert mail sent : " + response.message);

            common.sendResult(res, conn, resultcode.Success);
          }
        });
      });
    } catch (err) {
      common.sendResult(res, conn, resultcode.failed);
      throw err;
    }
  });
  /** 유저 이메일 인증처리
   * req : emailkey
   * res : resultcode 결과값
   */
  route.get('/emailcert/:emailkey', (req, res, next)=>{
    var conn = require('../modules/mysql.js')();
    try {
      conn.beginTransaction(()=>{
        var sql = "CALL emailcert('" + req.params.emailkey + "');";

        conn.query(sql, (err, rows)=>{
          if (err) {
            conn.rollback(()=>{
              console.log('rollback emailcert1');
              res.send(common.htmlTempleate03);
              conn.close();
              throw err;
            });
          } else {
            console.log(rows);
            if (rows.affectedRows >= 1) {
              conn.commit(()=>{
                res.send(common.htmlTempleate02);
                conn.close();
              });
            } else {
              conn.rollback(()=>{
                console.log('rollback emailcert2');
                res.send(common.htmlTempleate03);
                conn.close();
              });
            }
          }
        });
      });
    } catch (err) {
      conn.rollback(()=>{
        console.log('rollback emailcert3');
        res.send(common.htmlTempleate03);
        conn.close();
        throw err;
      });
    }
  });
  /** 유저프로필 보기
   * 주소값에 본인의 이름값(로그인 후 각자 변경가능)전달
   */
  route.get('/profile/:name', (req, res, next)=>{
    var conn = require('../modules/mysql.js')();
    var default_profile = path.join(__dirname, '../resources/image/castnetslogo.png');
    try {
      var sql = "CALL userprofile('" + req.params.name + "');";

      conn.query(sql, (err, rows)=>{
        if (err) {
          res.sendFile(default_profile);
          conn.close();
          throw err;
        } else {
          if (rows[0].length > 0) {
            res.sendFile(rows[0][0].filepath);
            conn.close();
          } else {
            res.sendFile(default_profile);
            conn.close();
          }
        }
      });
    } catch (err) {
      res.sendFile(default_profile);
      conn.close();
      throw err;
    }
  });
  /** 유저프로필배경 보기
   * 주소값에 본인의 이름값(로그인 후 각자 변경가능)전달
   */
  route.get('/profileback/:name', (req, res, next)=>{
    var conn = require('../modules/mysql.js')();
    var default_profile = path.join(__dirname, '../resources/image/castnetslogo.png');
    try {
      var sql = "CALL userprofileback('" + req.params.name + "');";

      conn.query(sql, (err, rows)=>{
        if (err) {
          res.sendFile(default_profile);
          conn.close();
          throw err;
        } else {
          if (rows[0].length > 0) {
            res.sendFile(rows[0][0].filepath);
            conn.close();
          } else {
            res.sendFile(default_profile);
            conn.close();
          }
        }
      });
    } catch (err) {
      res.sendFile(default_profile);
      conn.close();
      throw err;
    }
  });
  /** 유저이름 변경 가능 여부 확인
   * req : token, name
   * res : resultcode 결과값
   */
  route.post('/usernamecheck', (req, res, next)=>{
    console.log(req.body);
    var conn = require('../modules/mysql.js')();
    try {
      var sql = "CALL usernamecheck('" + req.body.token + "','" + req.body.name + "');";
      conn.query(sql, (err, rows)=>{
        if (err) {
          common.sendResult(res,conn,resultcode.Failed);
          throw err;
        } else {
          if (rows[0][0].canchange == 1) {
            common.sendResult(res,conn,resultcode.Success);
          } else {
            common.sendResult(res,conn,resultcode.AlreadyExistsName);
          }
        }
      });
    } catch (err) {
      common.sendResult(res,conn,resultcode.Failed);
      throw err;
    }
  });
  /** 유저이름 변경
   * req : token, name
   * res : resultcode 결과값
   */
  route.post('/usernamechange', (req, res, next)=>{
    console.log(req.body);
    var conn = require('../modules/mysql.js')();
    try {
      var sql = "CALL usernamechange('" + req.body.token + "','" + req.body.name + "');";
      conn.query(sql, (err, rows)=>{
        if (err) {
          common.sendResult(res,conn,resultcode.Failed);
          throw err;
        } else {
          if (rows[0].affectedRows == 1) {
            common.sendResult(res,conn,resultcode.Success);
          } else {
            common.sendResult(res,conn,resultcode.Failed);
          }
        }
      });
    } catch (err) {
      common.sendResult(res,conn,resultcode.Failed);
      throw err;
    }
  });
  // catch 404 and forward to error handler
  route.use((req, res, next)=>{
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  return route;
};