﻿module.exports = (app) => {
  const express = require('express')
  const session = require('express-session')
  const common = require('../modules/common.js')()
  const fs = require('fs')
  var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim())
  var route = express.Router()

  route.use(session({
    secret: 'keyboard cat nari',
    resave: false,
    saveUninitialized: true
  }))
  /**자신 주변의 영상을 가져온다
   * req : 자신의 위치, 가져올 영상개수, 페이지 넘버(0부터 1씩 증가)
   * res : 해당 범위의 영상 목록 & resultcode {영상 객체는 lat, lon, capturedate, createdate, filepath, distance 값을 가짐}
   */
  route.get('/list/:lat/:lng/:cnt/:page', (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = `CALL videolist('${req.headers.authorization}',${req.params.lat},${req.params.lng},${req.params.cnt},${req.params.page})`
    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      }
      //console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row) => {
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {
        "list": list
      })
    })
  })
  /**지도위의 영상위치를 가져온다
   * req : 현재 표시되는 지도의 시작지점(좌측 위)과 끝지점(우측 아래)의 위경도
   * res : 해당 범위의 영상 목록 & resultcode {영상 객체는 lat, lon, capturedate, createdate, filepath 값을 가짐}
   */
  route.get('/maplist/:slat/:slng/:elat/:elng', (req, res, next) => {
    const connpool = app.mysqlpool
    connpool.query('CALL videomaplist(' + req.params.slat + ',' + req.params.slng + ',' + req.params.elat + ',' + req.params.elng + ')', (err, rows) => {
      if (err) {
        return next(err)
      }
      //console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row) => {
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {
        "list": list
      })
    })
  })
  /**특정 영상 주변의 영상을 가져온다
   * req : 보여질 영상의 번호, 자신의 위치, 가져올 영상개수, 페이지 넘버(0부터 1씩 증가)
   * res : 해당 범위의 영상 목록 & resultcode {영상 객체는 lat, lon, capturedate, createdate, filepath, distancefromme, distance 값을 가짐}
   */
  route.get('/targetlist/:videoid/:lat/:lng/:cnt/:page', (req, res, next) => {
    const connpool = app.mysqlpool
    connpool.query('CALL videotargetlist(' + req.params.videoid + ',' + req.params.lat + ',' + req.params.lng + ',' + req.params.cnt + ',' + req.params.page + ')', (err, rows) => {
      if (err) {
        return next(err)
      }
      // console.log(rows)
      var list = []
      if (rows[0].length > 0) {
        rows[0].forEach((row) => {
          list.push(row)
        })
      }
      if (rows[1].length > 0) {
        rows[1].forEach((row) => {
          list.push(row)
        })
      }
      common.sendResult(res, resultcode.Success, {
        "list": list
      })
    })
  })
  /**비디오 영상플레이 기록
   * req : videoid, token(존재하지 않으면 미전달), logtype 영상입장 70101, 영상완료(끝까지 재생) 70102, 영상퇴장 70103
   * res : 결과 없음. 성공여부에 상관없이 진행
   */
  route.post('/view', (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = `CALL videoview(${req.body.videoid},'${req.headers.authorization}',${req.body.logtype})`
    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      }
      common.sendResult(res, resultcode.Success)
    })
  })
  /**비디오 스트리밍 (http권장)
   * req : html5에서는 플레이어에서 각종 정보를 보내줌. 앱에서는 특정 videoid 값을 보내야함
   * res : 해당 영상 내용을 리턴
   */
  route.get('/stream/:videoid', (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = `CALL videostream(${req.params.videoid})`
    connpool.query(sql, (err, rows) => {
      try {
        console.log(`video stream[${req.params.videoid}]`)
        if (err) {
          return next(err)
        }
        if (rows[0].length <= 0) {
          return next(`Cannot found video ${req.params.videoid}`)
        } else {
          var path = rows[0][0]['filepath']
          var stat = fs.statSync(path)
          var total = stat.size

          var filepath = rows[0][0]['filepathv']
          if (filepath !== undefined) {
            try {
              var stat1 = fs.statSync(filepath)
              console.log(stat1)
            } catch (err) {
              console.log('testlog - ' + err)
            }
          }

          if (req.headers['range']) {
            var range = req.headers.range
            var parts = range.replace(/bytes=/, "").split("-")
            var partialstart = parts[0]
            var partialend = parts[1]

            var start = parseInt(partialstart, 10)
            var end = partialend ? parseInt(partialend, 10) : total - 1
            var chunksize = (end - start) + 1
            console.log(`reqRange : ${req.headers.range}`)
            console.log(`resRange : ${start} - ${end} = ${chunksize}`)

            var file = fs.createReadStream(path, {
              start: start,
              end: end
            })
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${total}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4'
            })
            file.pipe(res)
          } else {
            console.log(`Total bytes: ${total}`)
            res.writeHead(200, {
              'Content-Length': total,
              'Content-Type': 'video/mp4'
            })
            fs.createReadStream(path).pipe(res)
          }
        }
      } catch (err) { // 스트리밍 과정에서 오류가 나는 경우가 있음
        if (err) {
          return next(err)
        }
      }
    })
  })
  /**비디오 썸네일
   * req : videoid를 주소에 담아서 전달
   * res : 해당 영상의 썸네일을 리턴
   */
  route.get('/thumbnail/:videoid', (req, res, next) => {
    const connpool = app.mysqlpool
    var sql = `CALL videothumbnail('${req.params.videoid}')`

    connpool.query(sql, (err, rows) => {
      if (err) {
        return next(err)
      } else {
        if (rows[0].length > 0) {
          res.sendFile(rows[0][0].filepath)
        } else {
          res.send('')
        }
      }
    })
  })

  return route
}