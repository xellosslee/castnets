'use strict';
process.on('uncaughtException', function (err) {
    console.log(err.stack);
    console.log('uncaughtException : ' + err);
});

const path = require('path');
const express = require('express');
const session = require('express-session');
const uuid = require('uuid');
const commonObj = require('./modules/common.js')();
var bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const https = require('https');

var app = express();
var uuidtemp = uuid.v4();

var fileRouter = require('./routes/file.js')(app);
var userRouter = require('./routes/user.js')(app);
var videoRouter = require('./routes/video.js')(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/file', fileRouter);
app.use('/user', userRouter);
app.use('/video', videoRouter);
app.use('/resources',express.static(__dirname + '/resources'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'keyboard cat nari',
    resave: false,
    saveUninitialized: true
}));

app.use(logErrors);
function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
}

var options = {
    key: fs.readFileSync(path.resolve(__dirname, './ssl/private.key')),
    cert: fs.readFileSync(path.resolve(__dirname, './ssl/certificate.crt')),
    ca: fs.readFileSync(path.resolve(__dirname, './ssl/ca_bundle.crt'))
};
var PORT = 8443;
var https_server = https.createServer(options, app);
https_server.listen(PORT, function () {
    console.log(`server at port ${PORT}`);
});
app.get('*', function (req, res, next) {
    if (req.protocol !== 'https') {
        if (req.host === "localhost") {
            res.redirect('https://' + req.hostname + ':8443' + req.originalUrl);
        }
        else {
            res.redirect('https://' + req.hostname + req.originalUrl);
        }
    }
    else
        next();
});
// Allows you to set port in the project properties.
app.set('port', 3000);

app.post('/', function (req, res) {
    console.log(req.body);
    res.send('');
});

app.get('/', function (req, res) {
    var conn = require('./modules/mysql.js')();
    var videoid = '';
    try {
        var sql = "SELECT videoid FROM video ORDER BY videoid DESC LIMIT 1";
        conn.query(sql, function (err, rows) {
            if (err) {
                conn.close();
                throw err;
            }
            else {
                if (rows.length > 0) {
                    videoid = rows[0].videoid;
                }
                res.render('index', { "uuid": uuidtemp, "videoid": videoid });
            }
        });
    }
    catch (err) {
        console.log(err);
        throw err;
    }
});
app.get('/etemp01', function (req, res) {
    res.send(commonObj.emailTempleate01);
});
// ssl인증을 위한 페이지 다운로드 설정
app.get('/.well-known/acme-challenge/Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ', function (req, res) {
    res.download('./Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ'); // demo.castnets.co.kr
});
app.get('/.well-known/acme-challenge/fmEtwsuCxjzJKcq2eppVMiIJqalSEiGTCwDPYluJcJM', function (req, res) {
    res.download('./fmEtwsuCxjzJKcq2eppVMiIJqalSEiGTCwDPYluJcJM'); // www.castnets.co.kr
});
app.get('/.well-known/acme-challenge/7ea3YTwkuKn1ZG9QsngmjIA3DnOmAwX1u140mKptFvQ', function (req, res) {
    res.download('./7ea3YTwkuKn1ZG9QsngmjIA3DnOmAwX1u140mKptFvQ'); // castnets.co.kr
});
var server = app.listen(app.get('port'), function () {
    //console.log(process.env);
    console.log('[' + uuidtemp + ']');
    console.log('listening : ' + app.get('port'));
});