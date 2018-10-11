'use strict';
const path = require('path');
const express = require('express');
var app = express();

app.use(express.static(staticPath));

// Allows you to set port in the project properties.
app.set('port', 3001);

var server = app.listen(app.get('port'), function () {
    console.log('listening : ' + app.get('port'));
});


app.get('/', function (req, res, next) {
    var key = req.params.name;

    req.redis.get(key, function (err, data) {
        if (err) {
            console.log(err);
            res.send("error " + err);
            return;
        }

        var value = JSON.parse(data);
        res.json(value);
    });
});