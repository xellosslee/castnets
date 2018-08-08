/** Route using simple templeate
 * @param {express} app server sent express object
 */
module.exports = function (app, path) {
    const express = require('express');
    const common = require('../modules/common.js')();
    const fs = require('fs');
    var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
    var route = express.Router();

    const multer = require('multer');
    const self = this;
    self.rootdir = __dirname;
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
                common.mkdirpath(this.strpath);
                cb(null, this.strpath);
            }
            else if (file.mimetype.indexOf('image') !== -1) {
                // 폴더가 없다면 생성 (일별로 폴더 신규 생성)
                if (process.env.NODE_ENV === 'product') {
                    this.strpath = path.join('/data/uploads/image/' + new Date().toISOString().substr(0, 10));
                }
                else if (process.env.NODE_ENV === 'test') {
                    this.strpath = path.join('/data/uploads/image/' + new Date().toISOString().substr(0, 10));
                }
                else {
                    this.strpath = path.join(__dirname, './../uploads/image/' + new Date().toISOString().substr(0, 10));
                }
                common.mkdirpath(this.strpath);
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
    var upload = multer({ storage: storage });
    /* 업로드 동작은 프로필 사진, 영상 등록 모두 공통적으로 사용한다. 파일명은 최대 200자까지만 가능.
     * array로 받는 경우엔 무조건 buffer로 저장되며 buffer를 다시 파일로 저장해야함
     * req : post데이터에 files명칭의 파일배열과 token, registlocation을 담아서 전송
     * res : 업로드후 결과코드 및 업로드 된 객체 정보
     */
    route.post('/upload', upload.single('file'), function (req, res) {
        console.log(req.file);
        var conn = require('../modules/mysql.js')();
        var result = {};
        result.resultcode = resultcode.Failed;

        try {
            // 토큰으로 userid를 뽑아둔다
            conn.query("SET @userid = UseridFromToken('" + req.body.token + "');", function (err, rows) {
                if (err) {
                    res.json(result);
                    conn.close();
                    throw err;
                }
                console.log(rows);

                conn.query("CALL fileadd(@userid, '" + req.file.destination.replace('/\\\\/g', '/') + "', '" + req.file.filename + "', '" + req.file.originalname + "', " + req.body.registlocation + ");", function (err, rows) {
                    if (err) {
                        res.json(result);
                        conn.close();
                        throw err;
                    }
                    console.log(rows);
                    if (rows.affectedRows > 0) {
                        result.resultcode = resultcode.Success;
                    }
                    res.json(result);
                    conn.close();
                });
            });
        }
        catch (e) {
            res.json(result);
            conn.close();
        }
    });

    // catch 404 and forward to error handler
    route.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    return route;
};