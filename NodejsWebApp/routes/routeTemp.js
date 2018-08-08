﻿/** Route using simple templeate
 * @param {express} app server sent express object
 */
module.exports = function (app) {
    const express = require('express');
    require('../modules/common.js');
    const fs = require('fs');
    var resultcode = JSON.parse(fs.readFileSync('resultcode.json', 'utf8').trim());
    var route = express.Router();
    // catch 404 and forward to error handler
    route.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    return route;
};