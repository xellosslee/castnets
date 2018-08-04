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

// 기본 index.html 전달하는 코드...테스트용도로만 쓰고 실무에선 쓸일 없어보임
//var staticPath = path.join(__dirname, '/');
//app.use(express.static(staticPath));

// 서버에서 페이지로 output을 표현하려면 ejs모듈로 view를 써야함
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