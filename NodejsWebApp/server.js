'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const uuid = require('uuid');
require('./modules/common.js');
var app = express();
var uuidtemp = uuid.v4();

var userRouter = require('./routes/user.js')(app);
var videoRouter = require('./routes/video.js')(app, path);

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

// Allows you to set port in the project properties.
app.set('port', 3000);

app.get('/', function (req, res) {
    res.render('index', { "uuid": uuidtemp });
});

var server = app.listen(app.get('port'), function () {
    console.log('[' + uuidtemp + ']');
    console.log('listening : ' + app.get('port'));
});