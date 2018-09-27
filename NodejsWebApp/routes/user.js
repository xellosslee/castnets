module.exports = app => {
  const express = require("express")
  const session = require("express-session")
  const common = require("../modules/common.js")()
  const fs = require("fs")
  const path = require("path")
  var resultcode = JSON.parse(fs.readFileSync("resultcode.json", "utf8").trim())
  const crypto = require("crypto-browserify")
  var nodemailer = require("nodemailer")
  var route = express.Router()

  route.use(
    session({
      secret: "keyboard cat nari",
      resave: false,
      saveUninitialized: true
    })
  )
  // redis 모듈사용
  //var Redis = require('ioredis')
  //var redis = new Redis(6379, '127.0.0.1')
  //route.use((req, res, next)=>{
  //    req.redis = redis
  //    next()
  //})
  // email send infomation
  var smtpTransport = nodemailer.createTransport({
    host: "smart.whoismail.net",
    port: 587,
    secure: false,
    auth: {
      user: "admin@castnets.co.kr",
      pass: "iglab2018!"
    }
  });
  // route.get('*', (req, res, next)=>{
  //   if (req.protocol !== 'https') {
  //     if (req.hostname === "localhost") {
  //       res.redirect('https://' + req.hostname + ':8443' + req.originalUrl);
  //     } else {
  //       res.redirect('https://' + req.hostname + req.originalUrl);
  //     }
  //   } else
  //     next();
  // });
  // sms send infomation
  const request = require("request")
  /** 회원가입
   * req : logid(sms인증 받았던 logid), email(둘중 하나만 보내면 됨), pass, loginpath(구글:90101 애플:90102)
   * res : resultcode 결과값과 token값 json으로 리턴
   */
  route.post("/join", (req, res, next) => {
    console.log(req.body)
    const connpool = app.mysqlpool
    try {
      var pass, salt
      crypto.randomBytes(64, (err, buf) => {
        salt = buf.toString("base64")
        crypto.pbkdf2(req.body.pass, salt, 100000, 64, "sha512", (err, key) => {
          pass = key.toString("base64")

          connpool.getConnection((err, connection) => {
            connection.beginTransaction(() => {
              var sql = `SET @token = 0;
                CALL userjoin_token('${(req.body.logid === undefined ? 0 : req.body.logid)}',
                ${(req.body.email === undefined ? 'NULL' : '\'' + req.body.email + '\'')},
                '${pass}','${salt}',${req.body.loginpath},'${process.env.PRIVATE_IP}',@token);SELECT @token`
                
              //console.log(sql)
              connection.query(sql, (err, rows) => {
                if (err) {
                  connection.rollback(() => {
                    console.log("rollback join1")
                    common.sendResult(res, resultcode.failed)
                    connection.release()
                    throw err
                  })
                }

                var token = rows[2][0]["@token"]
                sql = `SET @emailkey = '';CALL emailsend('${token}', @emailkey);SELECT @emailkey`

                //console.log(sql)
                connection.query(sql, (err, rows) => {
                  if (err) {
                    connection.rollback(() => {
                      console.log("rollback join2")
                      common.sendResult(res, resultcode.failed)
                      connection.release()
                      throw err
                    })
                  }
                  // 이메일로 가입한 경우 인증메일 발송
                  if ((req.body.logid === undefined ? "" : req.body.logid) == "") {
                    // 이메일 인증키 가져오기
                    // 인증메일 발송
                    var mailOptions = {
                      from: "캐스트네츠 <admin@castnets.co.kr>",
                      to: req.body.email,
                      subject: "가입인증 메일",
                      html: common.htmlTempleate01.replace("|emailkey|", rows[2][0]["@emailkey"])
                    }
                    smtpTransport.sendMail(mailOptions, (err, response) => {
                      if (err) {
                        console.log(err)
                        connection.rollback(() => {
                          console.log("rollback join3")
                          common.sendResult(res, resultcode.failed)
                          connection.release()
                          throw err
                        })
                      } else {
                        console.log("Cert mail sent : " + response.message)

                        connection.commit(() => {
                          common.sendResult(res, resultcode.Success, { token: token })
                          connection.release()
                        })
                      }
                      smtpTransport.close()
                    })
                  } else {
                    // 휴대폰으로 가입한 경우 바로 성공
                    connection.commit(() => {
                      common.sendResult(res, resultcode.Success, { token: token })
                      connection.release()
                    })
                  }
                })
              })
            }) // connection.beginTransaction
          }) // connpool.getConnection((err, connection) => {
        })
      })
    } catch (e) {
      connection.rollback(() => {
        console.log("rollback join4")
      })
      common.sendResult(res, resultcode.failed)
      throw err
    }
  })
  /** 인증문자 발송
   * req : 휴대전화번호 phone, key(현재시간을 암호화하여 전송 : 무분별하게 호출되는것을 막기 위함)
   * res : resultcode 결과값과 logid를 json으로 리턴 (인증완료 할때 해당 logid를 함께 보내야함)
   * 암복호화 예제
  const cipher = crypto.createCipher('aes-256-cbc', 'keyboard cat')
  let result = cipher.update(Date.now().toString(), 'utf8', 'base64') // 'HbMtmFdroLU0arLpMflQ'
  result += cipher.final('base64') // 'HbMtmFdroLU0arLpMflQYtt8xEf4lrPn5tX5k+a8Nzw='
  console.log(result)
  const decipher = crypto.createDecipher('aes-256-cbc', 'keyboard cat')
  let result2 = decipher.update(result, 'base64', 'utf8') // 복호화할문 (base64, utf8이 위의 cipher과 반대 순서입니다.)
  result2 += decipher.final('utf8') // 복호화할문장 (여기도 base64대신 utf8)
  console.log(result2)
   */
  route.post("/sendcertsms", (req, res, next) => {
    console.log(req.body)
    try {
      const decipher = crypto.createDecipher("aes-256-cbc", "keyboard cat")
      let result2 = decipher.update(req.body.key, "base64", "utf8") // 암호화할문 (base64, utf8이 위의 cipher과 반대 순서입니다.)
      result2 += decipher.final("utf8") // 암호화할문장 (여기도 base64대신 utf8)

      if (Number(result2) + 5000 <= Date.now()) {
        // 해당 암호문이 만들어진지 5초 이상 경과하였다면 오류로 판단
        console.log("sendcertsms received wrong key")
        // RestApi 테스트를 위해 임시 비활성화
        //return next(err)
      }
    } catch (err) {
      // 복호화에 실패하면 에러 리턴
      return next(err)
    }
    const connpool = app.mysqlpool
    // 해당 전화번호로 문자 메시지를 마지막으로 보낸지 1분이상 경과하였는지 체크
    var sql = "CALL smssendcheck('" + req.body.phone + "')"
    connpool.getConnection((err, connection) => {
      connection.query(sql, (err, rows) => {
        if (err) {
          res.json(result)
          connection.release()
          throw err
        } else {
          if (rows[0][0]["cnt"] > 0) {
            // 1분이내에 전송한 기록이 있는경우 실패 리턴
            common.sendResult(res, resultcode.TooFastSmsSent)
            connection.release()
          } else if (rows[0][0]["cnt"] === -1) {
            // 동일한 폰번호로 가입되어 있다면 실패
            common.sendResult(res, resultcode.AlreadyExistsPhone)
            connection.release()
          } else {
            // 1분이내에 전송한 기록이 없어야만 전송함
            // 전송기록을 먼저 남김
            var certnum = Math.floor(Math.random() * (9999 - 1000)) + 1000 // 1000~9999 까지의 임의의 숫자 생성
            var msg = `캐스트네츠 [${certnum}] 인증번호를 입력해주세요.`
            var sql = `SET @logid=0;CALL smssendlogadd('${req.body.phone}','${msg}', @logid);SELECT @logid`
            connection.query(sql, (err, rows) => {
              if (err) {
                res.json(result)
                connection.release()
                throw err
              } else {
                var logid = rows[2][0]["@logid"]
                if (logid > 0) {
                  // 기록이 정상적으로 남았음
                  // 요청 세부 내용
                  var options = {
                    url: "https://apis.aligo.in",
                    method: "POST",
                    headers: {
                      "User-Agent": "Super Agent/0.0.1",
                      "Content-Type": "application/x-www-form-urlencodedcharset=UTF-8"
                    },
                    form: {
                      key: "lz2v2t9s1qa1259p8az1u2tiy49z773x",
                      user_id: "ilgoonlab",
                      sender: "01046350508",
                      receiver: req.body.phone,
                      msg: msg,
                      testmode_yn: "Y"
                    }
                  }
                  // 요청 시작 받은값은 body
                  request(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                      var json = JSON.parse(body)
                      console.log(json)
                      var sql = `CALL smssendlogupdate(@logid, '${JSON.stringify(json)}')`
                      connection.query(sql, (err, rows) => {
                        if (err) {
                          res.json(result)
                          connection.release()
                          throw err
                        } else {
                          connection.release()
                          if (json.result_code == 1) {
                            common.sendResult(res, resultcode.Success, {logid: logid})
                          } else {
                            common.sendResult(res, resultcode.SmsSendFailed)
                          }
                          res.json(result)
                        }
                      })
                    }
                  })
                } else {
                  // 기록 남기기 실패 - 시스템에러
                  common.sendResult(res, resultcode.Failed)
                  connection.release()
                }
              }
            })
          }
        }
      })
    })
  })
  /** sms인증
   * req : logid(문자발송시 리턴받은 값), certnum 인증숫자
   * res : resultcode 결과값 json으로 리턴
   */
  route.post("/smscert", (req, res, next) => {
    console.log(req.body)

    const connpool = app.mysqlpool
    var sql = `CALL smscert("${req.body.logid}","${req.body.certnum}")`
    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      }
      if (rows[0][0].valiedlogid == 0) {
        common.sendResult(res, resultcode.SmsCertNotValied)
      } else if (rows[0][0].matchcertnum == 0) {
        common.sendResult(res, resultcode.CertNumNotMatch)
      } else if (rows[0][0].timelimit == 0) {
        common.sendResult(res, resultcode.CertTimeOut)
      } /*if(rows[1].affectedRows > 0)*/ else {
        common.sendResult(res, resultcode.Success)
      }
    })
  })
  /** 유저로그인
   * req : loginid(이메일 혹은 전화번호), pass, loginpath(구글:90101 애플:90102)
   * res : resultcode 결과값 json으로 리턴
   */
  route.post("/login", (req, res, next) => {
    console.log(req.body)

    const connpool = app.mysqlpool
    var pass, salt
    var sql = `CALL usersaltget('${req.body.loginid}')`

    connpool.getConnection((err, connection) => {
      connection.query(sql, (err, rows) => {
        if (err) {
          connection.release()
          return next(err)
        } else {
          if (rows[0].length <= 0) {
            common.sendResult(res, resultcode.NotExistsAccount)
            connection.release()
            return
          }
          console.log(`get salt : ${rows[0][0]["salt"]}`)
          salt = rows[0][0]["salt"]

          crypto.pbkdf2(req.body.pass,salt,100000,64,"sha512",
            (err, key) => {
              if (err) {
                connection.release()
                return next(err)
              }
              pass = key.toString("base64")
              var sql = `SET @token = '';CALL userlogin_token('${req.body.loginid}','${pass}',${req.body.loginpath},'${process.env.PRIVATE_IP}',@token);SELECT @token`

              console.log(sql)
              connection.query(sql, (err, rows) => {
                if (err) {
                  connection.release()
                  return next(err)
                }
                connection.release()
                if (rows[2][0]["@token"] == null || rows[2][0]["@token"] === 0) {
                  console.log("Password missmatch")
                  common.sendResult(res, resultcode.WorngPassword)
                  return
                }
                common.sendResult(res, resultcode.Success, {"token": rows[2][0]["@token"]})
              })
            }
          )
        }
      })
    })
  })
  /** 유저 로그아웃
   * req : token
   * res : resultcode 결과값
   */
  route.post("/logout", (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = "CALL userlogout('" + req.body.token + "')"

    connpool.query(sql, (err) => {
      if (err) {
        return next(err)
      } else {
        common.sendResult(res, resultcode.Success)
      }
    })
  })
  /** 유저 토큰 정상 체크
   * req : token
   * res : resultcode 결과값
   */
  route.post("/tokencheck", (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = "CALL usertokencheck('" + req.body.token + "')"

    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        if (rows[0].length <= 0) {
          common.sendResult(res, resultcode.InvalidToken)
        } else {
          console.log(`User alive check : ${rows[0][0]["userid"]}_${rows[0][0]["alive"]}`
          )
          if (rows[0][0]["alive"] == 0) {
            common.sendResult(res, resultcode.ExpiredToken)
          } else {
            common.sendResult(res, resultcode.Success)
          }
        }
      }
    })
  })
  /** 유저 이메일 인증처리
   * req : emailkey
   * res : resultcode 결과값
   */
  route.post("/emailresend", (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = "SET @emailkey = '';CALL emailsend('" + req.body.token + "', @emailkey);SELECT @emailkey"

    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      }
      // 이메일 인증키 가져오기
      // 인증메일 발송
      var mailOptions = {
        from: "캐스트네츠 <admin@castnets.co.kr>",
        to: req.body.email,
        subject: "가입인증 메일",
        html: common.htmlTempleate01.replace(
          "|emailkey|",
          rows[2][0]["@emailkey"]
        )
      }
      smtpTransport.sendMail(mailOptions, (err, response) => {
        smtpTransport.close()
        if (err) {
          return next(err)
        } else {
          console.log("Cert mail sent : " + response.message)

          common.sendResult(res, resultcode.Success)
        }
      })
    })
  })
  /** 유저 이메일 인증처리
   * req : emailkey
   * res : resultcode 결과값
   */
  route.get("/emailcert/:emailkey", (connpoolreq, res, next) => {
    const connpool = app.mysqlpool
    connpool.getConnection((err, connection) => {
      connection.beginTransaction(() => {
        var sql = "CALL emailcert('" + req.params.emailkey + "')"
  
        connection.query(sql, (err, rows) => {
          if (err) {
            connection.rollback(() => {
              console.log("rollback emailcert1")
              res.send(common.htmlTempleate03)
              connection.release()
              throw err
            })
          } else {
            console.log(rows)
            if (rows["affectedRows"] >= 1) {
              connection.commit(() => {
                res.send(common.htmlTempleate02)
                connection.release()
              })
            } else {
              connection.rollback(() => {
                console.log("rollback emailcert2")
                res.send(common.htmlTempleate03)
                connection.release()
              })
            }
          }
        })
      })
    })
  })
  /** 유저프로필 이미지 받기
   * 주소값에 본인의 이름값(로그인 후 각자 변경가능)전달
   * res : 실패시 resultcode.Failed 가 전달됨. status는 500. 성공시에는 이미지가 전달됨.
   */
  route.get("/profile/:name", (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = `CALL userprofile('${req.params.name}')`

    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        if (rows[0].length > 0) {
          res.sendFile(rows[0][0].filepath)
        } else {
          return next(new Error('error'))
        }
      }
    })
  })
  /** 유저프로필배경 보기
   * 주소값에 본인의 이름값(로그인 후 각자 변경가능)전달
   */
  route.get("/profileback/:name", (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = `CALL userprofileback('${req.params.name}')`

    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        if (rows[0].length > 0) {
          res.sendFile(rows[0][0].filepath)
        } else {
          return next(new Error("profileback"))
        }
      }
    })
  })
  /** 유저이름 변경 가능 여부 확인
   * req : token, name
   * res : resultcode 결과값
   */
  route.post("/usernamecheck", (req, res, next) => {
    console.log(req.body)
    const connpool = app.mysqlpool
    var sql = `CALL usernamecheck('${req.body.token}','${req.body.name}')`
    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        if (rows[0][0].canchange == 1) {
          common.sendResult(res, resultcode.Success)
        } else {
          common.sendResult(res, resultcode.AlreadyExistsName)
        }
      }
    })
  })
  /** 유저이름 변경
   * req : token, name
   * res : resultcode 결과값
   */
  route.post("/usernamechange", (req, res, next) => {
    console.log(req.body)
    const connpool = app.mysqlpool
    var sql = `CALL usernamechange('${req.body.token}','${req.body.name}')`
    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        if (rows["affectedRows"] == 1) {
          common.sendResult(res, resultcode.Success)
        } else {
          common.sendResult(res, resultcode.Failed)
        }
      }
    })
  })
  /**특정 유저의 영상을 가져온다 (get방식으로는 무조건 소유주 없는 프로필로 보여짐)
   * req : 유저 닉네임
   * res : 해당 유저의 영상 목록 & resultcode {영상 객체는 lat, lon, capturedate, createdate, filepath 값을 가짐}
   */
  route.get('/uservideolist/:name', (req, res, next)=>{
    const connpool = app.mysqlpool
    connpool.query(`CALL uservideolist('${req.params.name}','')`, (err, rows)=>{
      if (err) {
        return next(err)
      }
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {"list": list})
    })
  })
  /**특정 유저의 영상을 가져온다
   * req : 유저 닉네임, 자신의 토큰(자신의 프로필인지 비교하기 위함)
   * res : 해당 유저의 영상 목록 & resultcode {영상 객체는 lat, lon, capturedate, createdate, filepath 값을 가짐}
   */
  route.post('/uservideolist/:name', (req, res, next)=>{
    const connpool = app.mysqlpool
    connpool.query(`CALL uservideolist('${req.params.name}','${req.body.token}')`, (err, rows)=>{
      if (err) {
        return next(err)
      }
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {"list": list})
    })
  })
  /** 영상 그룹 생성 (그룹안에 포함될 영상목록을 함께 보냄)
   * req : token, groupname(공백이라도 보내야 함), list[{nextvideogroupid, nextvideoid, nextdisplayorder}]
   * res : resultcode 결과값
   */
  route.post("/videogroupadd", (req, res, next) => {
    console.log(req.body)
    const connpool = app.mysqlpool
    connpool.getConnection((err, connection) => {
      if (err) {
        return next(err)
      }
      connection.beginTransaction(()=>{
        var sql = `SET @userid = UseridFromToken('${req.body.token}');
          CALL videogroupadd(@userid,'${req.body.groupname}')`
          connection.query(sql, (err, rows) => {
          if (err) {
            return next(err)
          } else {
            var insertid = rows["insertId"]
            if (insertid > 0) {
              sql = `CALL videogroupmove(@userid,${insertid},0,0,0,'${req.body.groupname}')`
  
            } else {
              common.sendResult(res, resultcode.Failed)
            }
          }
        })
        
        connection.rollback(()=>{
          console.log('rollback profilebackadd')
          next(new Error('rollback profilebackadd'))
        })
      })
    })
  })
  /** 영상 그룹 이동
   * req : token, groupname(공백이라도 보내야 함), list[{privvideogroupid, privvideoid, privdisplayorder, nextvideogroupid, nextvideoid, nextdisplayorder}]
   * res : resultcode 결과값
   */
  route.post("/videogroupmove", (req, res, next) => {
    console.log(req.body)
    const connpool = app.mysqlpool
    var sql = `SET @userid = UseridFromToken('${req.body.token}');CALL videogroupadd(@userid,'${req.body.groupname}')`
    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        var insertid = rows["insertId"]
        if (insertid > 0) {
          sql = `CALL videogroupmove(@userid,'${req.body.groupname}')`

        } else {
          common.sendResult(res, resultcode.Failed)
        }
      }
    })
  })
  // // catch 404 and forward to error handler
  // route.use((req, res, next) => {
  //   var err = new Error("Not Found")
  //   err.status = 404
  //   next(err)
  // })

  return route
}
