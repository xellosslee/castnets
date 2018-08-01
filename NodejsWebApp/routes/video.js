module.exports = function (app, conn, path) {
    const express = require('express');
    const multer = require('multer');
    const fs = require('fs');

    /* 업로드를 위한 multer디스크 설정
     */
    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
            if (file.mimetype.indexOf('video') != -1) {
                cb(null, 'uploads/video');
            }
            else if (file.mimetype.indexOf('image') != -1) {
                cb(null, 'uploads/profile');
            }
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
    });

    var upload = multer({ storage: storage })
    var route = express.Router();

    /* 업로드 동작은 프로필 사진, 영상 등록 모두 공통적으로 사용한다.
     * req : post데이터에 file과 userno를 담아서 전송
     * res : 
     */
    route.post('/upload', upload.single('file'), function (req, res) {
        console.log(req.file);
        res.send('Uploaded : ' + req.file.filename);
    });

    /* req : 현재 표시되는 지도의 위경도와 높이 lat, lon, zoom
     * res : 해당 위치 주변의 영상 목록
     * GET 방식으로 전송하는것을 추천
     */
    route.get('/list', function (req, res) {
        var conn = require('../modules/mysql.js')();
        conn.close();

        req.lat = req.query.lat == undefined ? 37.394655 : req.query.lat;
        req.lon = req.query.lon == undefined ? 127.1098378 : req.query.lon;
        req.zoom = req.query.zoom == undefined ? 17.17 : req.query.zoom;

        var list = [];
        var item = {};

        item.thumnail = 'uploads/thumbnail/thumbnail.png';
        item.lat = 37.394656;
        item.lon = 127.1098378;

        list.push(item);

        res.send(JSON.stringify(list));
    });

    /* req : range는 기본 플레이어에서 
     */
    route.get('/stream', function (req, res) {
        const path = 'uploads/video/sample01.mp4';
        const stat = fs.statSync(path)
        const fileSize = stat.size
        const range = req.headers.range
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10)
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1
            const chunksize = (end - start) + 1
            const file = fs.createReadStream(path, { start, end })
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(200, head)
            fs.createReadStream(path).pipe(res)
        }
    });

    return route;
};