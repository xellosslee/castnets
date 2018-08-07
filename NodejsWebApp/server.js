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
const https = require('https');

var app = express();
var uuidtemp = uuid.v4();

var userRouter = require('./routes/user.js')(app);
var videoRouter = require('./routes/video.js')(app, path);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/user', userRouter);
app.use('/video', videoRouter);

var options = {
    key: fs.readFileSync(path.resolve(__dirname, 'ssl/private.key')),
    cert: fs.readFileSync(path.resolve(__dirname, 'ssl/certificate.crt')),
    ca: fs.readFileSync(path.resolve(__dirname, 'ssl/ca_bundle.crt'))
};
var PORT = 8443;
var sslserver = https.createServer(options, app);
sslserver.listen(PORT, function () {
    console.log(`server at port ${PORT}`);
});

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

// Allows you to set port in the project properties.
app.set('port', 3000);

app.post('/', function (req, res) {
    console.log(req.body);
    res.send('');
});

app.get('/', function (req, res) {
    res.render('index', { "uuid": uuidtemp });
});

app.get('/.well-known/acme-challenge/Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ', function (req, res) {
    //res.sendFile('./Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ');
    res.download('./Me-EZ2TPbYxAad3lmNAPlYWrW7guL8R96wHqpZiEmnQ');
});

var server = app.listen(app.get('port'), function () {
    console.log('[' + uuidtemp + ']');
    console.log('listening : ' + app.get('port'));
});