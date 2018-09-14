module.exports = function () {
  const mysql = require('mysql')
  dbconn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    charset: 'utf8',
    multipleStatements: true
  })
  /** 종료시 반드시 close해야함
   */
  dbconn.close = function () {
    console.log('db closing')
    dbconn.end()
  }
  /** 최초 생성시 연결
   */
  try {
    dbconn.connect()
    console.log('db connected')
    return dbconn
  }
  catch (ex) {
    console.log(ex)
    return null
  }
}