module.exports = function (app) {
    const express = require('express');
    require('../modules/common.js');
    const fs = require('fs');
    var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
    var route = express.Router();
    /* req : 현재 표시되는 지도의 시작지점(좌측 위)과 끝지점(우측 아래)의 위경도
     * res : 해당 범위의 영상 목록 & resultcode
     * GET 방식으로 전송하는것을 추천
     */
    route.get('/list/:slat/:slng/:elat/:elng', function (req, res) {
        var conn = require('../modules/mysql.js')();
        var list = [];
        try {
            conn.query('CALL videolist(' + req.params.slat + ',' + req.params.slng + ',' + req.params.elat + ',' + req.params.elng + ')', function (err, rows) {
                if (err) throw err;

                console.log(rows);
                if (rows[0].length > 0) {
                    rows[0].forEach(function (row) {
                    list.push(row);
                    });
                }
                var result = {};
                result.resultcode = resultcode.Success;
                result.list = list;
                res.json(result);
                conn.close();
            });
        }
        catch (e) {
            var result = {};
            result.resultcode = resultcode.Failed;
            res.json(result);
            conn.close();
        }
    });
    /* req : html5에서는 플레이어에서 각종 정보를 보내줌
     * res : 해당 영상 내용을 리턴
     */
    route.get('/stream', function (req, res) {
        var path = 'uploads/video/sample01.mp4';
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

            var file = fs.createReadStream(path, { start: start, end: end });
            res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
            file.pipe(res);
        } else {
            console.log('ALL: ' + total);
            res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
            fs.createReadStream(path).pipe(res);
        }
    });
    return route;
};