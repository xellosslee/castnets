/** Route using simple templeate
 * @param {express} app server sent express object
 */
module.exports = (app) => {
  const express = require('express')
  const common = require('../modules/common.js')()
  const fs = require('fs')
  var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim())
  var route = express.Router()
  /**유저 목록 가져오기
   * req : 페이지(0부터 시작), 개수 
   * res : resultcode와 유저 목록
   */
  route.get('/userlist/:page/:count', (req, res, next)=>{
    req.conn = require('../modules/mysql.js')()
    var sql = `CALL userboardlist(${req.params.page},${req.params.count})`
    req.conn.query(sql, (err, rows)=>{
      if (err) {
        return next(err)
      }
      console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, req.conn, resultcode.Success, {"list": list, "totalcount": rows[1][0].totalcount})
    })
  })
  /**비디오 목록 가져오기
   * req : 페이지(0부터 시작), 개수 
   * res : resultcode와 유저 목록
   */
  route.get('/videolist/:page/:count', (req, res, next)=>{
    req.conn = require('../modules/mysql.js')()
    var sql = `CALL videoboardlist(${req.params.page},${req.params.count})`
    req.conn.query(sql, (err, rows)=>{
      if (err) {
        return next(err)
      }
      console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row)=>{
          list.push(row)
        })
      }
      common.sendResult(res, req.conn, resultcode.Success, {"list": list, "totalcount": rows[1][0].totalcount})
    })
  })
  return route
}