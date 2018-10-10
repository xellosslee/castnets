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
require('log-timestamp');

var app = express()
var uuidtemp = uuid.v4()

app.mysqlpool = require('./modules/mysql.js')()
var fileRouter = require('./routes/file.js')(app)
var userRouter = require('./routes/user.js')(app)
var videoRouter = require('./routes/video.js')(app)
var adminRouter = require('./routes/admin.js')(app)

var whitelist = ['http://demo.castnets.co.kr', 'http://www.castnets.co.kr']
//app.use(cors({origin: ['http://demo.castnets.co.kr', 'http://www.castnets.co.kr', 'http://was.castnets.co.kr', 'http://res.castnets.co.kr', 'localhost']}))
app.all('*', function(req, res, next) {
  let origin = req.headers.origin;
  if(whitelist.indexOf(origin) >= 0){
      res.header("Access-Control-Allow-Origin", origin);
  }         
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
if(process.env.NODE_ENV === 'demo' || process.env.NODE_ENV === 'local') {
  app.use(cors());
}
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use('/file', fileRouter)
app.use('/user', userRouter)
app.use('/video', videoRouter)
app.use('/admin', adminRouter)
app.use('/resources',express.static(__dirname + '/resources'))
app.use('/.well-known',express.static(__dirname + '/.well-known'))
app.use('/data',express.static('/data'))
// app.use(session({
//     secret: 'keyboard cat nari',
//     resave: false,
//     saveUninitialized: true
// }))

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
process.on('uncaughtException', (err) => {
  console.log('get uncaughtException : ' + err.stack)
})
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.get('/', (req, res, next) => {
  res.render('index')
})

app.get('/test', (req, res, next) => {
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
app.get('/serverconnect', (req, res) => {
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

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404)
  res.send(common.htmlTempleate04)
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

// var server = http.createServer(
//   (req, res) => {
//   res.writeHead(301, {Location: `https://${req.headers.host.split(':')[0]}${app.get('sport') !== '443' ? (':' + app.get('sport')) : ':'}${req.url}`})
//   res.end()
// }
// )
// server.listen(app.get('port'), () => {
//   console.log(`service port : ${app.get('port')}`)
// })
app.listen(app.get('port'), () => {
  console.log(`service port : ${app.get('port')}`)
})