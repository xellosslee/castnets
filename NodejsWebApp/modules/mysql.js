module.exports = function () {
  const mysql = require('mysql')
  const connpoll = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    charset: 'utf8',
    multipleStatements: true,
    connectionLimit: 20
  })
  /** 최초 생성시 연결
   */
  try {
    console.log('db connection pool ready')
    return connpoll
  }
  catch (ex) {
    console.log(ex)
    return null
  }
}