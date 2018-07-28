'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const fs = require('fs');

try {
    var conn = mysql.createConnection({
        host: 'localhost',
        user: 'xelloss',
        password: 'test1234',
        database: 'tasty',
    });
    conn.connect();
    conn.query('SELECT * FROM code', function (err, rows, fields) {
        if (err) {
            console.log(err);
        } else {
            console.log('rows', rows);
            console.log('fileds', fields);
        }
    });
    conn.end();
}
catch (ex) {
    console.log(ex);
}

var app = express();
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

/* req : 현재 표시되는 지도의 위경도와 높이 lat, lon, zoom
 * res : 해당 위치 주변의 영상 목록
 * GET 방식으로 전송하는것을 추천
 */
app.get('/videolist', function (req, res) {
    req.lat = req.query.lat == undefined ? 37.394655 : req.query.lat;
    req.lon = req.query.lon == undefined ? 127.1098378 : req.query.lon;
    req.zoom = req.query.zoom == undefined ? 17.17 : req.query.zoom;

    var list = [];
    var item = {};

    item.thumnail = 'uploads/thumbnail/thumbnail.png';
    item.lat = 37.394655;
    item.lon = 127.1098378;

    list.push(item);

    res.send(JSON.stringify(list));
});

app.get('/video', function (req, res) {
    const path = 'uploads/video/sample01.mp4';
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize - 1
        const chunksize = (end - start) + 1
        const file = fs.createReadStream(path, { start, end })
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }
});