﻿module.exports = function () {
    const mysql = require('mysql');
    var conn = mysql.createConnection({
        host: process.env.CASTNETS_DBHOST,
        user: process.env.CASTNETS_DBUSER,
        password: process.env.CASTNETS_DBPASS,
        database: 'castnets',
        charset: 'utf8',
        multipleStatements: true
    });
    /** 종료시 반드시 close해야함
     */
    conn.close = function () {
        console.log('db closed');
        conn.end();
    };
    /** 최초 생성시 연결
     */
    try {
        conn.connect();
        console.log('db connected');
        return conn;
    }
    catch (ex) {
        console.log(ex);
        return null;
    }
};