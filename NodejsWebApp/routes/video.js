module.exports = (app)=>{
  const express = require('express');
  const session = require('express-session');
  const common = require('../modules/common.js')();
  const fs = require('fs');
  var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
  var route = express.Router();

  route.use(session({
    secret: 'keyboard cat nari',
    resave: false,
    saveUninitialized: true
  }));
  /**자신 주변의 영상을 가져온다
   * req : 현재 자신의 GPS 위치, 개수, 거리값(이전의 리스트에서 가장 높은 거리값)
   * res : 해당 범위의 영상 목록 & resultcode {영상 객체는 lan, lng, capturedate, createdate, filepath 값을 가짐}
   * GET 방식으로 전송하는것을 추천
   */
  route.get('/list/:lat/:lng/:cnt/:pos', (req, res)=>{
    var conn = require('../modules/mysql.js')();
    try {
      var sql = "CALL videolist(" + (req.params.lat === undefined ? 37.394926 : req.params.lat) + "," +
        (req.params.lng === undefined ? 127.111144 : req.params.lng) + "," + req.params.cnt + "," + req.params.pos + ")";
      conn.query(sql, (err, rows)=>{
        if (err) {
          conn.close();
          throw err;
        }

        console.log(rows);
        var list = [];
        if (rows[0].length > 0) {
          rows[0].forEach((row)=>{
            list.push(row);
          });
        }
        common.sendResult(res, conn, resultcode.Success, {"list": list});
      });
    } catch (err) {
      common.sendResult(res, conn, resultcode.Failed);
      throw err;
    }
  });
  /**지도위의 영상위치를 가져온다
   * req : 현재 표시되는 지도의 시작지점(좌측 위)과 끝지점(우측 아래)의 위경도
   * res : 해당 범위의 영상 목록 & resultcode {영상 객체는 lan, lng, capturedate, createdate, filepath 값을 가짐}
   * GET 방식으로 전송하는것을 추천
   */
  route.get('/maplist/:slat/:slng/:elat/:elng', (req, res)=>{
    var conn = require('../modules/mysql.js')();
    try {
      conn.query('CALL videomaplist(' + req.params.slat + ',' + req.params.slng + ',' + req.params.elat + ',' + req.params.elng + ')', (err, rows)=>{
        if (err) {
          common.sendResult(res, conn, resultcode.Failed);
          throw err;
        }

        console.log(rows);
        var list = [];
        if (rows[0].length > 0) {
          rows[0].forEach((row)=>{
            list.push(row);
          });
        }
        common.sendResult(res, conn, resultcode.Success, {"list": list});
      });
    } catch (err) {
      common.sendResult(res, conn, resultcode.Failed);
      throw err;
    }
  });
  /**특정 영상 주변의 영상을 가져온다
   * req : 현재 영상의 번호, 자신의 위치
   * res : 해당 범위의 영상 목록 & resultcode {영상 객체는 lan, lng, capturedate, createdate, filepath 값을 가짐}
   * GET 방식으로 전송하는것을 추천
   */
  route.get('/targetlist/:videoid/:lat/:lng', (req, res)=>{
    var conn = require('../modules/mysql.js')();
    try {
      conn.query('CALL videotargetlist(' + req.params.videoid + ',' + req.params.lat + ',' + req.params.lng + ')', (err, rows)=>{
        if (err) {
          common.sendResult(res, conn, resultcode.Failed);
          throw err;
        }

        console.log(rows);
        var list = [];
        if (rows[0].length > 0) {
          rows[0].forEach((row)=>{
            list.push(row);
          });
        }
        common.sendResult(res, conn, resultcode.Success, {"list": list});
      });
    } catch (err) {
      common.sendResult(res, conn, resultcode.Failed);
      throw err;
    }
  });
  /**비디오 영상플레이 기록
   * req : videoid, token(존재하지 않으면 미전달), logtype 영상입장 70101, 영상완료(끝까지 재생) 70102, 영상퇴장 70103
   * res : 결과 없음. 성공여부에 상관없이 진행
   */
  route.post('/view', (req, res)=>{
    var conn = require('../modules/mysql.js')();
    var sql = "CALL videoview(" + req.body.videoid + ",'" + req.body.token === undefined ? null : req.body.token + "'," + req.body.logtype + ")";
    var result = {};
    result.resultcode = resultcode.Failed;
    conn.query(sql, (err, rows)=>{
      if (err) {
        common.sendResult(res, conn, resultcode.Failed);
        throw err;
      }
      common.sendResult(res, conn, resultcode.Success);
    });
  });
  /**비디오 스트리밍 (http권장)
   * req : html5에서는 플레이어에서 각종 정보를 보내줌. 앱에서는 특정 videoid 값을 보내야함
   * res : 해당 영상 내용을 리턴
   */
  route.get('/stream/:videoid', (req, res)=>{
    var conn = require('../modules/mysql.js')();
    try {
      var sql = "CALL videostream(" + req.params.videoid + ")";
      conn.query(sql, (err, rows)=>{
        if (err) {
          common.sendResult(res, conn, resultcode.Failed);
          throw err;
        }
        if (rows[0].length <= 0) {
          console.log('Cannot found video' + req.params.videoid);
          conn.close();
          return;
        } else {
          var path = rows[0][0]['filepath'];
          var stat = fs.statSync(path);
          var total = stat.size;
          if (req.headers['range']) {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];

            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
            console.log('reqRange : ' + req.headers.range);
            console.log('resRange : ' + start + ' - ' + end + ' = ' + chunksize);

            var file = fs.createReadStream(path, {
              start: start,
              end: end
            });
            res.writeHead(206, {
              'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4'
            });
            file.pipe(res);
          } else {
            console.log('ALL: ' + total);
            res.writeHead(200, {
              'Content-Length': total,
              'Content-Type': 'video/mp4'
            });
            fs.createReadStream(path).pipe(res);
          }
          conn.close();
        }
      });
    } catch (err) {
      conn.close();
      throw err;
    }
  });

  return route;
};