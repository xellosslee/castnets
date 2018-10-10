/** Route using simple templeate
 * @param {express} app server sent express object
 */
module.exports = (app) => {
  const express = require('express')
  const common = require('../modules/common.js')()
  const fs = require('fs')
  var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim())
  const crypto = require("crypto-browserify")
  var route = express.Router()
  /**유저 목록 가져오기
   * req : 페이지(0부터 시작), 개수 
   * res : resultcode와 유저 목록
   */
  route.get('/userlist/:page/:count', (req, res, next)=>{
    const connpool = app.mysqlpool
    var sql = `CALL userboardlist('', ${req.params.page},${req.params.count})`
    connpool.query(sql, (err, rows)=>{
      if (err) {
        return next(err)
      }
      //console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {"list": list, "totalcount": rows[1][0].totalcount})
    })
  })
  /**비디오 목록 가져오기
   * req : 페이지(0부터 시작), 개수 
   * res : resultcode와 유저 목록
   */
  route.get('/videolist/:page/:count', (req, res, next)=>{
    const connpool = app.mysqlpool
    var sql = `CALL videoboardlist('', ${req.params.page},${req.params.count})`
    connpool.query(sql, (err, rows)=>{
      if (err) {
        return next(err)
      }
      //console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {"list": list, "totalcount": rows[1][0].totalcount})
    })
  })
  /**유저 목록 가져오기
   * req : token (관리자 계정의 토큰), page (0부터 시작), count
   * res : resultcode와 유저 목록
   */
  route.post('/userlist/:page/:count', (req, res, next)=>{
    const connpool = app.mysqlpool
    var sql = `CALL userboardlist('${req.headers.authorization}',${req.params.page},${req.params.count})`
    connpool.query(sql, (err, rows)=>{
      if (err) {
        return next(err)
      }
      //console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {"list": list, "totalcount": rows[1][0].totalcount})
    })
  })
  /**비디오 목록 가져오기
   * req : token (관리자 계정의 토큰), page (0부터 시작), count
   * res : resultcode와 유저 목록
   */
  route.post('/videolist/:page/:count', (req, res, next)=>{
    const connpool = app.mysqlpool
    var sql = `CALL videoboardlist('${req.headers.authorization}',${req.params.page},${req.params.count})`
    connpool.query(sql, (err, rows)=>{
      if (err) {
        return next(err)
      }
      //console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {"list": list, "totalcount": rows[1][0].totalcount})
    })
  })
  /** 유저로그인
   * req : loginid(전화번호), pass, loginpath(웹:90103)
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
              var sql = `CALL adminuserlogin_token('${req.body.loginid}','${pass}',${req.body.loginpath},'${process.env.PRIVATE_IP}',@token)`

              console.log(sql)
              connection.query(sql, (err, rows) => {
                if (err) {
                  connection.release()
                  return next(err)
                }
                connection.release()
                if (rows[0].length === 0 || rows[0].length === undefined) {
                  console.log("Password missmatch")
                  common.sendResult(res, resultcode.WorngPassword)
                  return
                }
                common.sendResult(res, resultcode.Success, {"userinfo": rows[0][0]})
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
    var sql = `CALL userlogout('${req.headers.authorization}')`

    connpool.query(sql, (err) => {
      if (err) {
        return next(err)
      } else {
        common.sendResult(res, resultcode.Success)
      }
    })
  })
  return route
}