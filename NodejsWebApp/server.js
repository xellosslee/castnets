'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
var app = express();

var userRouter = require('./routes/user.js')(app);
var videoRouter = require('./routes/video.js')(app, path);

app.use('/user', userRouter);
app.use('/video', videoRouter);

var staticPath = path.join(__dirname, '/');

app.use(express.static(staticPath));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

// Allows you to set port in the project properties.
app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
    console.log('listening');
});