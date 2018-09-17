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
var resultcode = JSON.parse(fs.readFileSync("resultcode.json", "utf8").trim())

var app = express()
var uuidtemp = uuid.v4()

var fileRouter = require('./routes/file.js')(app)
var userRouter = require('./routes/user.js')(app)
var videoRouter = require('./routes/video.js')(app)
var adminRouter = require('./routes/admin.js')(app)

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
  common.sendResult(res, req.conn, resultcode.Failed)
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

var options = {
    key: fs.readFileSync(path.resolve(__dirname, './ssl/private.key')),
    cert: fs.readFileSync(path.resolve(__dirname, './ssl/certificate.crt')),
    ca: fs.readFileSync(path.resolve(__dirname, './ssl/ca_bundle.crt'))
}
var PORT = 8443
var https_server = https.createServer(options, app)
https_server.listen(PORT, function () {
    console.log(`server at port ${PORT}`)
})
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
// Allows you to set port in the project properties.
app.set('port', 3000)

app.get('/', function (req, res, next) {
    res.render('index')
})

app.get('/test', function (req, res, next) {
    var connpool = require('./modules/mysql.js')()
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
app.get('/.well-known/acme-challenge/Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ', function (req, res, next) {
    res.download('./Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ') // demo.castnets.co.kr
})
app.get('/.well-known/acme-challenge/fmEtwsuCxjzJKcq2eppVMiIJqalSEiGTCwDPYluJcJM', function (req, res, next) {
    res.download('./fmEtwsuCxjzJKcq2eppVMiIJqalSEiGTCwDPYluJcJM') // www.castnets.co.kr
})
app.get('/.well-known/acme-challenge/7ea3YTwkuKn1ZG9QsngmjIA3DnOmAwX1u140mKptFvQ', function (req, res, next) {
    res.download('./7ea3YTwkuKn1ZG9QsngmjIA3DnOmAwX1u140mKptFvQ') // castnets.co.kr
})
var server = app.listen(app.get('port'), function () {
    //console.log(process.env)
    console.log(`uuid [${uuidtemp}]`)
    console.log(`listening : ${app.get('port')}`)
})