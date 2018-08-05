module.exports = function (app, path) {
    const express = require('express');
    const multer = require('multer');
    const fs = require('fs');
    var upload = multer({ storage: storage });
    var route = express.Router();
    const self = this;
    self.rootdir = __dirname;
    require('../modules/common.js');
    /** 디렉토리 생성
     * @param {any} dirPath 전체경로를 전달
     */
    function mkdirpath(dirPath) {
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath);
            }
            catch (e) {
                mkdirpath(path.dirname(dirPath));
                mkdirpath(dirPath);
            }
        }
    }
    /** 업로드 위치 지정 및, 파일이름 지정
     */
    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
            if (file.mimetype.indexOf('video') !== -1) {
                // 폴더가 없다면 생성 (일별로 폴더 신규 생성)
                if (process.env.NODE_ENV === 'product') {
                    this.strpath = path.join('/data/uploads/video/' + new Date().toISOString().substr(0, 10));
                }
                else if (process.env.NODE_ENV === 'test') {
                    this.strpath = path.join('/data/uploads/video/' + new Date().toISOString().substr(0, 10));
                }
                else {
                    this.strpath = path.join(__dirname, './../uploads/video/' + new Date().toISOString().substr(0, 10));
                }
                mkdirpath(this.strpath);
                cb(null, this.strpath);
            }
            else if (file.mimetype.indexOf('image') !== -1) {
                // 폴더가 없다면 생성 (일별로 폴더 신규 생성)
                if (process.env.NODE_ENV === 'product') {
                    this.strpath = path.join('/data/uploads/profile/' + new Date().toISOString().substr(0, 10));
                }
                else if (process.env.NODE_ENV === 'test') {
                    this.strpath = path.join('/data/uploads/profile/' + new Date().toISOString().substr(0, 10));
                }
                else {
                    this.strpath = path.join(__dirname, './../uploads/profile/' + new Date().toISOString().substr(0, 10));
                }
                mkdirpath(this.strpath);
                cb(null, this.strpath);
            }
        },
        filename: function (req, file, cb) {
            // 중복파일명이 있는지 체크
            if (fs.existsSync(this.strpath + '/' + file.originalname)) {
                // 현재 디렉토리내의 모든 파일의 파일명 읽어옴
                var allfilenames = fs.readdirSync(this.strpath);
                // 전체 목록중 파일명이 같은것들만 따로 추림
                var filenames = allfilenames.filter(c => c.substr(0, file.originalname.split('.')[0].length) === file.originalname.split('.')[0]);
                var num = 0;
                filenames.forEach(function (f) {
                    if (f.split('_').length > 1) {
                        num = parseInt(f.split('_')[1].split('.')[0]) >= parseInt(num) ? f.split('_')[1].split('.')[0] : num;
                    }
                });
                num++;
                cb(null, file.originalname.split('.')[0] + '_' + num + '.' + file.originalname.split('.')[1]);
            }
            else {
                cb(null, file.originalname);
            }
        }
    });
    /* 업로드 동작은 프로필 사진, 영상 등록 모두 공통적으로 사용한다.
     * req : post데이터에 file과 userno를 담아서 전송
     * res : 업로드 된 결과코드
     */
    route.post('/upload', upload.single('file'), function (req, res) {
        //console.log(req.file);
        res.send('Uploaded : ' + req.file.filename);
    });
    /* req : 현재 표시되는 지도의 위경도와 높이 lat, lon, zoom
     * res : 해당 위치 주변의 영상 목록
     * GET 방식으로 전송하는것을 추천
     */
    route.get('/list', function (req, res) {
        var params;
        params.slat = req.query.slat === undefined ? 37.394655 : req.query.slat;
        params.slng = req.query.slng === undefined ? 127.1098378 : req.query.slng;
        params.elat = req.query.elat === undefined ? 37.394655 : req.query.elat;
        params.elng = req.query.elng === undefined ? 127.1098378 : req.query.elng;

        var conn = require('../modules/mysql.js')();
        var list = [];
        try {
            conn.query('CALL videolist(' + params.slat + ',' + params.slng + ',' + params.elat + ',' + params.elng + ')', function (err, rows) {
                if (err) throw err;

                console.log(rows);
                rows.forEach(function (row) {
                    list.push(row);
                });
            });
            conn.close();
        }
        catch (e) {
            conn.close();
        }
        list.resultcode = resultcode.SUCCESS;
        res.json(JSON.stringify(list));
    });
    /* req : html5에서는 플레이어에서 각종 정보를 보내줌
     * res : 해당 영상 내용을 리턴
     */
    route.get('/stream', function (req, res) {
        const serverpath = 'uploads/video/sample01.mp4';
        const stat = fs.statSync(serverpath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1;
            const chunksize = end - start + 1;
            const file = fs.createReadStream(serverpath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4'
            };
            res.writeHead(206, head);
            file.pipe(res);
        }
        else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4'
            };
            res.writeHead(200, head);
            fs.createReadStream(serverpath).pipe(res);
        }
    });
    return route;
};