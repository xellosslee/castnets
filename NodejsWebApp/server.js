'use strict';
process.on('uncaughtException', function (err) {
    //����ġ ���� ���� ó��
    console.log('uncaughtException arrival : ' + err);
});

const path = require('path');
const express = require('express');
const session = require('express-session');
const uuid = require('uuid');
require('./modules/common.js');
var bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const https = require('https');

var app = express();
var uuidtemp = uuid.v4();

var fileRouter = require('./routes/file.js')(app, path);
var userRouter = require('./routes/user.js')(app);
var videoRouter = require('./routes/video.js')(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/file', fileRouter);
app.use('/user', userRouter);
app.use('/video', videoRouter);

// �⺻ index.html �����ϴ� �ڵ�...�׽�Ʈ�뵵�θ� ���� �ǹ����� ���� �����
//var staticPath = path.join(__dirname, '/');
//app.use(express.static(staticPath));

// �������� �������� output�� ǥ���Ϸ��� ejs���� view�� �����
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'keyboard cat',
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
    res.render('index', { "uuid": uuidtemp });
});

// ssl������ �ϱ� ���� �ڵ�
app.get('/.well-known/acme-challenge/Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ', function (req, res) {
    res.download('./Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ'); // demo.castnets.co.kr
});
app.get('/.well-known/acme-challenge/fmEtwsuCxjzJKcq2eppVMiIJqalSEiGTCwDPYluJcJM', function (req, res) {
    res.download('./fmEtwsuCxjzJKcq2eppVMiIJqalSEiGTCwDPYluJcJM'); // www.castnets.co.kr
});
app.get('/.well-known/acme-challenge/fC7JsL84ZKDseGx_uPzbci22jKWy4JzQyoJg6Pin5rI', function (req, res) {
    res.download('./fC7JsL84ZKDseGx_uPzbci22jKWy4JzQyoJg6Pin5rI'); // castnets.co.kr
});
var server = app.listen(app.get('port'), function () {
    //console.log(process.env);
    console.log('[' + uuidtemp + ']');
    console.log('listening : ' + app.get('port'));
});