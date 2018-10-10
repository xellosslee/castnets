/** Route using simple templeate
 * @param {express} app server sent express object
 */
module.exports = (app) => {
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
    destination: (req, file, cb) => {
      // 폴더가 없다면 생성 (일별로 폴더 신규 생성)
      if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'demo') {
        this.strpath = path.join(`/data/uploads/${file.fieldname}/${new Date().toISOString().substr(0, 10)}`);
      } else {
        this.strpath = path.join(__dirname, `./../uploads/${file.fieldname}/${new Date().toISOString().substr(0, 10)}`)
      }
      common.mkdirpath(this.strpath)
      cb(null, this.strpath)
    },
    filename: (req, file, cb) => {
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
   * req : post데이터에 file명칭의 파일과 thumbnail 이름으로 썸네일 이미지, 유저token, registlocation(안드,애플,웹), lat, lon, comment, capturedate을 담아서 전송
   * res : 업로드후 결과코드 및 업로드 된 객체 정보 (url 주소)
   */
  route.post('/upload', upload.fields([
        {name:'video', maxCount:1},
        {name:'thumbnail', maxCount:1}
      ]), (req, res, next) => {
    var files = []
    if (req.files.video !== undefined) {
      console.log(`${req.files.video[0].name} : ${req.files.video[0].originalname}`)
      files.push(req.files.video)
    }
    if (req.files.thumbnail !== undefined) {
      console.log(`${req.files.thumbnail[0].name} : ${req.files.thumbnail[0].originalname}`)
      files.push(req.files.thumbnail)
    }
    var connpool = app.mysqlpool
    connpool.getConnection((err, connection) => {
      if (err) {
        common.sendResult(res, resultcode.failed)
        connection.release()
        throw err
      }
      async.waterfall([
        (cb) => {// 토큰으로 userid를 뽑아둔다 (mysql 변수에 담기기 때문에 별도로 전달할 필요 없음)
          connection.query(`SET @userid = UseridFromToken('${req.headers.authorization}')`, (err) => {
            if (err) {
              common.sendResult(res, resultcode.failed)
              connection.release()
              throw err
            }
            cb()
          })
        },
        (cb) => {
          connection.beginTransaction(() => {
            cb()
          })
        },
        (cb) => {
          files.forEach((items) => {
            if (items[0].fieldname === 'video') {
              sql = `SET @videoid = 0;CALL fileadd(@userid, '${process.env.FORDLERPATH}','${path.normalize(items[0].destination).replace(/\\/g, '/')}',
                '${items[0].filename}','${items[0].originalname}',${req.body.registlocation},60201,@videoid);`
            }
            else if (items[0].fieldname === 'thumbnail') {
              sql = `SET @thumbnailid = 0;CALL fileadd(@userid, '${process.env.FORDLERPATH}','${path.normalize(items[0].destination).replace(/\\/g, '/')}',
                '${items[0].filename}','${items[0].originalname}',${req.body.registlocation},60202,@thumbnailid);`
            }
            connection.query(sql, (err)=>{
              if (err) {
                connection.rollback(() => {
                  console.log('rollback fileadd')
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
            })
          })
          cb()
        },
        (cb) => {
          var addr = '';
          geocoder.reverse({"lat":req.body.lat, "lon": req.body.lon})
          .then((ress) => {
            addr = ress
            //console.log(addr)
            cb(null, addr[0].formattedAddress)
          })
          .catch((err) => {
            connection.rollback(() => {
              console.log('rollback geocoder')
              common.sendResult(res, resultcode.failed)
              connection.release()
            })
            throw err
          })
        },
        (formattedAddress, cb) => {
          files.forEach((items) => {
            if (items[0].fieldname === 'video') {
              sql = `CALL videoadd(@userid,@videoid,@thumbnailid,${req.body.lat},${req.body.lon},'${formattedAddress}',${req.body.width},${req.body.height},'${req.body.comment}','${req.body.capturedate}')`
            }
            else {
              sql = `SET @removefile = '';CALL profileadd(@userid,@videoid,@removefile);SELECT @removefile`
            }
            connection.query(sql, (err, rows)=>{
              if (err) {
                connection.rollback(() => {
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
              console.log(rows)
              if ((rows['affectedRows'] === undefined ? rows[1]['affectedRows'] : rows['affectedRows']) > 0) {
                connection.commit(() => {
                  common.sendResult(res, resultcode.Success)
                  connection.release()
                  cb()
                })
              } else {
                connection.rollback(() => {
                  console.log('rollback upload')
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                fs.unlink(path.join(path.normalize(items[0].destination).replace(/\\/g, '/'), items[0].filename), (err) => { // 삭제처리가 성공하든 말든 진행
                  if (err)
                    throw err
                  console.log('successfully deleted : ' + path.join(path.normalize(items[0].destination).replace(/\\/g, '/'), items[0].filename))
                })
              }
            })
          })
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

  /* 업로드 동작은 프로필 사진, 영상 등록 모두 공통적으로 사용한다. 파일명은 최대 200자까지만 가능.
   * ### array로 받는 경우엔 무조건 buffer로 저장되며 buffer를 다시 파일로 저장해야함 * 해당 post는 별도로 구현해야 함
   * req : post데이터에 file명칭의 파일과 thumbnail 이름으로 썸네일 이미지, 유저token, registlocation(안드,애플,웹)을 담아서 전송
   * res : 업로드후 결과코드 및 업로드 된 객체 정보 (url 주소)
   */
  route.post('/uploadprofile', upload.fields([
        {name:'profile', maxCount:1},
        {name:'profileback', maxCount:1}
      ]), (req, res, next) => {
    var files = []
    if (req.files.profile !== undefined) {
      console.log(`${req.files.profile[0].name} : ${req.files.profile[0].originalname}`)
      files.push(req.files.profile)
    }
    if (req.files.profileback !== undefined) {
      console.log(`${req.files.profileback[0].name} : ${req.files.profileback[0].originalname}`)
      files.push(req.files.profileback)
    }
    var connpool = app.mysqlpool
    connpool.getConnection((err, connection) => {
      if (err) {
        common.sendResult(res, resultcode.failed)
        connection.release()
        throw err
      }
      async.waterfall([
        (cb) => {// 토큰으로 userid를 뽑아둔다 (mysql 변수에 담기기 때문에 별도로 전달할 필요 없음)
          connection.query(`SET @userid = UseridFromToken('${req.headers.authorization}')`, (err) => {
            if (err) {
              common.sendResult(res, resultcode.failed)
              connection.release()
              throw err
            }
            cb()
          })
        },
        (cb) => {
          connection.beginTransaction(() => {
            cb()
          })
        },
        (cb) => {
          files.forEach((items) => {
            if (items[0].fieldname === 'profile') {
              sql = `SET @profileid = 0;CALL fileadd(@userid, '${process.env.FORDLERPATH}','${path.normalize(items[0].destination).replace(/\\/g, '/')}',
                '${items[0].filename}','${items[0].originalname}',${req.body.registlocation},60203,@profileid);`
            }
            else if (items[0].fieldname === 'profileback') {
              sql = `SET @profilebackid = 0;CALL fileadd(@userid, '${process.env.FORDLERPATH}','${path.normalize(items[0].destination).replace(/\\/g, '/')}',
                '${items[0].filename}','${items[0].originalname}',${req.body.registlocation},60204,@profilebackid);`
            }
            connection.query(sql, (err)=>{
              if (err) {
                connection.rollback(() => {
                  console.log('rollback fileadd')
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
            })
          })
          cb()
        },
        (cb) => {
          files.forEach((items) => {
            if (items[0].fieldname === 'profile') {
              sql = `SET @removefile = '';CALL profileadd(@userid,@profileid,@removefile);SELECT @removefile`
            }
            else if (items[0].fieldname === 'profileback') {
              sql = `SET @removefile = '';CALL profilebackadd(@userid,@profilebackid,@removefile);SELECT @removefile`
            }
            connection.query(sql, (err, rows)=>{
              if (err) {
                connection.rollback(() => {
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                throw err
              }
              console.log(rows)
              if ((rows['affectedRows'] === undefined ? rows[1]['affectedRows'] : rows['affectedRows']) > 0) {
                connection.commit(() => {
                  common.sendResult(res, resultcode.Success)
                  connection.release()
                  cb()
                })
              } else {
                connection.rollback(() => {
                  console.log('rollback upload')
                  common.sendResult(res, resultcode.failed)
                  connection.release()
                })
                fs.unlink(path.join(path.normalize(items[0].destination).replace(/\\/g, '/'), items[0].filename), (err) => { // 삭제처리가 성공하든 말든 진행
                  if (err)
                    throw err
                  console.log('successfully deleted : ' + path.join(path.normalize(items[0].destination).replace(/\\/g, '/'), items[0].filename))
                })
              }
            })
          })
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