module.exports = function () {
    const mysql = require('mysql');
    var conn = mysql.createConnection({
        host: 'localhost',
        user: 'xelloss',
        password: 'test1234',
        database: 'tasty',
    });
    conn.close = function () {
        console.log('db closed');
        conn.end();
    }
    try {
        conn.connect();
        //conn.query('SELECT * FROM code', function (err, rows, fields) {
        //    if (err) {
        //        console.log(err);
        //    } else {
        //        console.log('rows', rows);
        //        console.log('fileds', fields);
        //    }
        //});
        //conn.end();
        console.log('db connected');
        return conn;
    }
    catch (ex) {
        console.log(ex);
        return null;
    }
};