/** Route using simple templeate
 * @param {express} app server sent express object
 */
module.exports = (app)=>{
  const express = require('express')
  const session = require('express-session')
  const common = require('../modules/common.js')()
  const fs = require('fs')
  const path = require('path')
  const resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim())
  const async = require('async');
  var route = express.Router()
  route.use(session({
    secret: 'keyboard cat nari',
    resave: false,
    saveUninitialized: true
  }))
  const nodeGeocoder = require('node-geocoder')
  var options = {
    provider: 'google',
    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: 'AIzaSyDZM_zs2pQDj-45KLiVY9Jf4H4m5AzTFa0',
    language:'ko',
    region:'KR',
    formatter: null         // 'gpx', 'string', ...
  }
  var geocoder = nodeGeocoder(options)

  const multer = require('multer')
  const self = this
  self.rootdir = __dirname
  /** 업로드 위치 지정 및, 파일이름 지정
   */
  var storage = multer.diskStorage({
    destination: (req, file, cb)=>{
      if (file.mimetype.indexOf('video') !== -1) {
        // 폴더가 없다면 생성 (일별로 폴더 신규 생성)
        if (process.env.NODE_ENV === 'production') {
          this.strpath = path.join('/data/uploads/video/' + new Date().toISOString().substr(0, 10));
        } else if (process.env.NODE_ENV === 'demo') {
          this.strpath = path.join('/data/uploads/video/' + new Date().toISOString().substr(0, 10));
        } else {
          this.strpath = path.join(__dirname, './../uploads/video/' + new Date().toISOString().substr(0, 10))
        }
        common.mkdirpath(this.strpath)
        cb(null, this.strpath)
      } else if (file.mimetype.indexOf('image') !== -1) {
        // 폴더가 없다면 생성 (일별로 폴더 신규 생성)
        if (process.env.NODE_ENV === 'production') {
          this.strpath = path.join('/data/uploads/image/' + new Date().toISOString().substr(0, 10));
        } else if (process.env.NODE_ENV === 'demo') {
          this.strpath = path.join('/data/uploads/image/' + new Date().toISOString().substr(0, 10));
        } else {
          this.strpath = path.join(__dirname, './../uploads/image/' + new Date().toISOString().substr(0, 10))
        }
        common.mkdirpath(this.strpath)
        cb(null, this.strpath)
      }
    },
    filename: (req, file, cb)=>{
      // 중복파일명이 있는지 체크
      if (fs.existsSync(this.strpath + '/' + file.originalname)) {
        // 현재 디렉토리내의 모든 파일의 파일명 읽어옴
        var allfilenames = fs.readdirSync(this.strpath)
        // 전체 목록중 파일명이 같은것들만 따로 추림
        var filenames = allfilenames.filter(c => c.substr(0, file.originalname.split('.')[0].length) === file.originalname.split('.')[0])
        var num = 0
        filenames.forEach((f)=>{
          if (f.split('_').length > 1) {
            num = parseInt(f.split('_')[1].split('.')[0]) >= parseInt(num) ? f.split('_')[1].split('.')[0] : num
          }
        })
        num++
        cb(null, file.originalname.split('.')[0] + '_' + num + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
      } else {
        cb(null, file.originalname)
      }
    }
  })
  var upload = multer({
    storage: storage
  })
  /* 업로드 동작은 프로필 사진, 영상 등록 모두 공통적으로 사용한다. 파일명은 최대 200자까지만 가능.
   * ### array로 받는 경우엔 무조건 buffer로 저장되며 buffer를 다시 파일로 저장해야함 * 해당 post는 별도로 구현해야 함
   * req : post데이터에 file명칭의 파일과 thumbnail 이름으로 썸네일 이미지, 유저token, registlocation(안드,애플,웹), filetype: [60201 video, 60202 profile, 60203 profileback], lan(profile 일땐 생략), lng(profile 일땐 생략), comment(profile 일땐 생략), capturedate(profile 일땐 생략)을 담아서 전송
   * res : 업로드후 결과코드 및 업로드 된 객체 정보 (url 주소)
   */
  route.post('/upload', upload.fields([
        {name:'file', maxCount:1},
        {name:'thumbnail', maxCount:1}
      ]), (req, res, next)=>{
    console.log(`upload at : ${req.files.file[0].originalname}, thumbnail : ${req.files.thumbnail === undefined ? '' : req.files.thumbnail[0].originalname}`)
    var connpool = app.mysqlpool
    connpool.getConnection((err, connection) =>{
      if (err) {
        common.sendResult(res, resultcode.failed)
        connection.release()
        throw err
      }
      async.waterfall([
        (cb) => {// 토큰으로 userid를 뽑아둔다 (mysql 변수에 담기기 때문에 별도로 전달할 필요 없음)
          connection.query(`SET @userid = UseridFromToken('${req.headers.authorization}')`, (err, rows)=>{
            if (err) {
              common.sendResult(res, resultcode.failed)
              connection.release()
              throw err
            }
            cb()
          })
        },
        (cb) => {
          connection.beginTransaction(()=>{
            cb()
          })
        },
        (cb) => {
          var sql = `SET @fileid = 0;SET @thumbnailid = NULL;CALL fileadd(@userid, '${process.env.PRIVATE_IP}','${path.normalize(req.files.file[0].destination).replace(/\\/g, '/')}',
            '${req.files.file[0].filename}','${req.files.file[0].originalname}',${req.body.registlocation},${req.body.filetype},@fileid);`
          connection.query(sql, (err, rows)=>{
            if (err) {
              connection.rollback(()=>{
                common.sendResult(res, resultcode.failed)
                connection.release()
              })
              throw err
            }
            cb()
          })
        },
        (cb) => {
          if (req.files.thumbnail !== undefined && req.files.thumbnail !== null) {
            var sql = `CALL fileadd(@userid, '${process.env.PRIVATE_IP}','${path.normalize(req.files.thumbnail[0].destination).replace(/\\/g, '/')}',
              '${req.files.thumbnail[0].filename}','${req.files.thumbnail[0].originalname}',${req.body.registlocation},60204,@thumbnailid);`
            connection.query(sql, (err, rows)=>{
              if (err) {
                connection.rollback(()=>{
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
              cb()
            })
          }
          else {
            cb()
          }
        },
        (cb) => {
          if (req.body.filetype === "60201") {
            var addr = '';
            geocoder.reverse({"lat":req.body.lan, "lon": req.body.lng})
            .then((ress) => {
              addr = ress
              console.log(addr)
              connection.query(`CALL videoadd(@userid,@fileid,@thumbnailid,${req.body.lan},${req.body.lng},'${addr[0].formattedAddress}','${req.body.comment}','${req.body.capturedate}')`, (err, rows)=>{
                if (err) {
                  connection.rollback(() => {
                    common.sendResult(res, resultcode.failed)
                    connection.release()
                  })
                  throw err
                }
                console.log(rows)
                if (rows['affectedRows'] > 0) {
                  connection.commit(() => {
                    common.sendResult(res, resultcode.Success)
                    connection.release()
                    cb()
                  })
                } else {
                  connection.rollback(() => {
                    console.log('rollback videoadd')
                    common.sendResult(res, resultcode.failed)
                    connection.release()
                  })
                  fs.unlink(path.join(path.normalize(req.files.file[0].destination).replace(/\\/g, '/'), req.files.file[0].filename), (err) => { // 삭제처리가 성공하든 말든 진행
                    if (err)
                      throw err
                    console.log('successfully deleted : ' + path.join(path.normalize(req.files.file[0].destination).replace(/\\/g, '/'), req.files.file[0].filename))
                  })
                }
              })
            })
            .catch((err) => {
              connection.rollback(() => {
                common.sendResult(res, resultcode.failed)
                connection.release()
              })
              throw err
            })
          } else if (req.body.filetype === "60202") {
            connection.query("SET @removefile = '';CALL profileadd(@userid,@fileid,@removefile);SELECT @removefile", (err, rows) => {
              if (err) {
                connection.rollback(() => {
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
              console.log(rows)
              if (rows[1]['affectedRows'] > 0) {
                connection.commit(() => {
                  if (rows[2][0]['@removefile'] !== null && rows[2][0]['@removefile'] !== '') {
                    fs.unlink(rows[2][0]['@removefile'], (err) => { // 삭제처리가 성공하든 말든 진행
                      if (err)
                        throw err
                      console.log('successfully deleted : ' + rows[2][0]['@removefile'])
                    })
                  }
                  common.sendResult(res, resultcode.Success)
                  connection.release()
                  cb()
                })
              } else {
                connection.rollback(() => {
                  console.log('rollback profileadd')
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                fs.unlink(path.join(path.normalize(req.files.file[0].destination).replace(/\\/g, '/'), req.files.file[0].filename), (err) => { // 삭제처리가 성공하든 말든 진행
                  if (err)
                    throw err
                  console.log('successfully deleted : ' + path.join(path.normalize(req.files.file[0].destination).replace(/\\/g, '/'), req.files.file[0].filename))
                })
              }
            })
          } else if (req.body.filetype === "60203") {
            connection.query("SET @removefile = '';CALL profilebackadd(@userid,@fileid,@removefile);SELECT @removefile", (err, rows) => {
              if (err) {
                connection.rollback(() => {
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
              console.log(rows)
              if (rows[1]['affectedRows'] > 0) {
                connection.commit(() => {
                  if (rows[2][0]['@removefile'] !== null && rows[2][0]['@removefile'] !== '') {
                    fs.unlink(rows[2][0]['@removefile'], (err) => { // 삭제처리가 성공하든 말든 진행
                      if (err)
                        throw err
                      console.log('successfully deleted : ' + rows[2][0]['@removefile'])
                    })
                  }
                  common.sendResult(res, resultcode.Success)
                  connection.release()
                  cb()
                })
              } else {
                connection.rollback(() => {
                  console.log('rollback profilebackadd')
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                fs.unlink(path.join(path.normalize(req.files.file[0].destination).replace(/\\/g, '/'), req.files.file[0].filename), (err) => { // 삭제처리가 성공하든 말든 진행
                  if (err)
                    throw err
                  console.log('successfully deleted : ' + path.join(path.normalize(req.files.file[0].destination).replace(/\\/g, '/'), req.files.file[0].filename))
                })
              }
            })
          } else {
            common.sendResult(res, resultcode.UnkownType)
            connection.release()
            cb()
          }
        },
      ],
      (err, result) => {
        if(err) {
          console.log(`error upload : ${err}`)
        }
        else {
          console.log('Upload complete')
        }
      })
    })
  })

  // catch 404 and forward to error handler
  route.use((req, res, next)=>{
    var err = new Error('Not Found')
    err.status = 404
    next(err)
  })

  return route
}