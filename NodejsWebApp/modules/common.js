module.exports = ()=>{
  var common = {}
  const fs = require('fs')
  const path = require('path')
  const extend = require('util-extend')
  /** 디렉토리 생성
   * @param {any} dirPath 전체경로를 전달하여 해당 디렉토리까지 모두 생성
   */
  common.mkdirpath = (dirPath)=>{
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath)
      }
      catch (e) {
        common.mkdirpath(path.dirname(dirPath))
        common.mkdirpath(dirPath)
      }
    }
  };
  /** resultCode를 Json형태로 전달하고 db Close동작을 한다
   */
  common.sendResult = (res, conn, code, ...extraArgs)=>{
    let result = {}
    result.resultCode = code
    // extend(result, extraArgs);
    extraArgs.forEach((item)=>{
      extend(result, item)
    })
    res.json(result)
    if(conn !== undefined) {
      conn.close()
    }
  }
  /** 이메일 템플릿
   */
  common.htmlTempleate01 = '\
    <div style="width:680pt; border-top:2pt solid #EE4359" align="center">\
      <img src="http://demo.castnets.co.kr/resources/image/castnetslogo.png" width="102pt" height="73pt" style="margin:32pt 0 25pt 0;" />\
      <div style="padding: 30pt 0 30pt 0; border-top:solid 1px #eee; border-bottom:solid 1px #eee; width:537pt; margin-bottom:30pt;" >\
        <span style="margin: 40pt 0; font-family: "Nanum Gothic", sans-serif; font-size: 14pt; color: #454545; line-height: 20px;" >\
          <p><span style="font-weight: bold;">CASTNETS 가입</sapn>을 환영합니다.</p>\
          <p>캐스터네츠 회원가입을 신청해 주셔서 감사합니다.</p>\
          <p>본 메일은 회원가입을 위한 본인 확인을 위해 발송되는 메일 입니다.</p>\
          <p>아래 [이메일 인증] 버튼을 누르시면 가입절차가 완료됩니다.</p>\
        </span>\
      </div>\
      <a href="https://demo.castnets.co.kr/user/emailcert/|emailkey|">\
        <button style="width: 180pt; height: 48pt; background-color: #EE4359; color: white; font-size: 14pt; border: none; border-radius:5px;">이메일 인증</button>\
      </a>\
    </div>\
  '
  common.htmlTempleate02 = '\
    <div style="width:680pt; border-top:2pt solid #EE4359" align="center">\
      <img src="https://demo.castnets.co.kr/resources/image/castnetslogo.png" width="102pt" height="73pt" style="margin:32pt 0 25pt 0;" />\
      <div style="padding: 30pt 0 30pt 0; border-top:solid 1px #eee; border-bottom:solid 1px #eee; width:537pt; margin-bottom:30pt;" >\
        <span style="margin: 40pt 0; font-family: "Nanum Gothic", sans-serif; font-size: 14pt; color: #454545; line-height: 20px;" >\
          <p>이메일 인증이 완료되었습니다.</p>\
        </span>\
      </div>\
    </div>\
  '
  common.htmlTempleate03 = '\
    <div style="width:680pt; border-top:2pt solid #EE4359" align="center">\
      <img src="https://demo.castnets.co.kr/resources/image/castnetslogo.png" width="102pt" height="73pt" style="margin:32pt 0 25pt 0;" />\
      <div style="padding: 30pt 0 30pt 0; border-top:solid 1px #eee; border-bottom:solid 1px #eee; width:537pt; margin-bottom:30pt;" >\
        <span style="margin: 40pt 0; font-family: "Nanum Gothic", sans-serif; font-size: 14pt; color: #454545; line-height: 20px;" >\
          <p>이메일 인증이 실패하였습니다.</p>\
        </span>\
      </div>\
    </div>\
  '
  return common
};