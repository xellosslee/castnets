'use strict'
require('dotenv').config()

const path = require('path')
const express = require('express')
const session = require('express-session')
const uuid = require('uuid')
const common = require('./modules/common.js')()
var bodyParser = require('body-parser')
const fs = require('fs')
const http = require('http')
const https = require('https')
const cors = require('cors')
var resultcode = JSON.parse(fs.readFileSync("resultcode.json", "utf8").trim())

var app = express()
var uuidtemp = uuid.v4()

app.mysqlpool = require('./modules/mysql.js')()
var fileRouter = require('./routes/file.js')(app)
var userRouter = require('./routes/user.js')(app)
var videoRouter = require('./routes/video.js')(app)
var adminRouter = require('./routes/admin.js')(app)

app.use(cors({origin:'www.castnets.co.kr,was.castnets.co.kr,res.castnets.co.kr'}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use('/file', fileRouter)
app.use('/user', userRouter)
app.use('/video', videoRouter)
app.use('/admin', adminRouter)
app.use('/resources',express.static(__dirname + '/resources'))
app.use(session({
    secret: 'keyboard cat nari',
    resave: false,
    saveUninitialized: true
}))

app.use(logErrors)
app.use(errorHandler)
function logErrors(err, req, res, next) {
    console.error(err.stack)
    next(err)
}
function errorHandler(err, req, res, next) {
  res.status(500)
  //res.render('error', { error: err })
  common.sendResult(res, resultcode.Failed)
}
// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404)
  res.send(common.htmlTempleate04)
})
process.on('uncaughtException', (err) => {
  console.log('get uncaughtException : ' + err.stack)
})
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// app.get('*', function (req, res, next) {
//     if (req.protocol !== 'https') {
//         if (req.host === "localhost") {
//             res.redirect('https://' + req.hostname + ':8443' + req.originalUrl)
//         }
//         else {
//             res.redirect('https://demo.castnets.co.kr')
//         }
//     }
//     else
//         next()
// })

app.get('/', function (req, res, next) {
    res.render('index')
})

app.get('/test', function (req, res, next) {
    var connpool = app.mysqlpool
    var videoid = ''
    try {
        var sql = "SELECT videoid FROM video ORDER BY videoid DESC LIMIT 1"
        connpool.query(sql, function (err, rows) {
            if (err) {
                throw err
            }
            else {
                if (rows.length > 0) {
                    videoid = rows[0].videoid
                }
                res.render('demo', { "uuid": uuidtemp, "videoid": videoid })
            }
        })
    }
    catch (err) {
        console.log(err)
        throw err
    }
})
app.get('/serverconnect', function(req, res) {
  const connpool = app.mysqlpool
  try {
    var sql = "CALL serverconnect();"
    connpool.query(sql, (err, rows) => {
      if (err) {
        common.sendResult(res, resultcode.Failed)
        throw err
      } else {
        if (rows.length > 1) {
          common.sendResult(res, resultcode.Success, {"server": rows[0][0]})
        } else {
          common.sendResult(res, resultcode.Failed)
        }
      }
    });
  } catch (err) {
    common.sendResult(res, resultcode.Failed)
    throw err
  }
})
app.get('/etemp01', function (req, res, next) {
    res.send(common.htmlTempleate01)
})
app.get('/etemp02', function (req, res, next) {
    res.send(common.htmlTempleate02)
})
app.get('/etemp03', function (req, res, next) {
    res.send(common.htmlTempleate03)
})
// ssl인증을 위한 페이지 다운로드 설정
app.get('/.well-known/acme-challenge/7ea3YTwkuKn1ZG9QsngmjIA3DnOmAwX1u140mKptFvQ', function (req, res, next) {
    res.download('./7ea3YTwkuKn1ZG9QsngmjIA3DnOmAwX1u140mKptFvQ') // castnets.co.kr
})

// Allows you to set port in the project properties.
app.set('port', process.env.PORT || 3000)
app.set('sport', process.env.SPORT || 8443)

var options = {
  key: fs.readFileSync(path.resolve(__dirname, './ssl/private.key')),
  cert: fs.readFileSync(path.resolve(__dirname, './ssl/certificate.crt')),
  ca: fs.readFileSync(path.resolve(__dirname, './ssl/ca_bundle.crt'))
}
var https_server = https.createServer(options, app)
https_server.listen(app.get('sport'), function () {
    console.log(`secure service port ${app.get('sport')}`)
})

var server = http.createServer((req, res) => {
  res.writeHead(301, {Location: `https://${req.headers.host.split(':')[0]}${app.get('sport') !== '443' ? (':' + app.get('sport')) : ':'}${req.url}`})
  res.end()
})
server.listen(app.get('port'), () => {
    console.log(`service port : ${app.get('port')}`)
})