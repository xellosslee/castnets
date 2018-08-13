module.exports = function () {
    var common = {};
    const fs = require('fs');
    const path = require('path');    
    /** 디렉토리 생성
     * @param {any} dirPath 전체경로를 전달하여 해당 디렉토리까지 모두 생성
     */
    common.mkdirpath = function(dirPath) {
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath);
            }
            catch (e) {
                common.mkdirpath(path.dirname(dirPath));
                common.mkdirpath(dirPath);
            }
        }
    };
    common.emailTempleate01 = '\
        <style>\
        .text {font-family: "Nanum Gothic", sans-serif; font-size: 14pt; color: #454545; line-height: 20px;}\
        .btn {width: 180pt; height: 48pt; background-color: #EE4359; color: white; font-size: 14pt; border: none; border-radius:5px;}\
        </style>\
        <div style="width:680pt; border-top:2pt solid #EE4359" align="center">\
            <img src="http://localhost:3000/resources/image/castnetslogo.png" width="102pt" height="73pt" style="margin:32pt 0 25pt 0;" />\
            <div style="padding: 30pt 0 30pt 0; border-top:solid 1px #eee; border-bottom:solid 1px #eee; width:537pt; margin-bottom:30pt;" >\
                <span class="text" style="margin: 40pt 0;" >\
                    <p><span style="font-weight: bold;">CASTNETS 가입</sapn>을 환영합니다.</p>\
                    <p>캐스터네츠 회원가입을 신청해 주셔서 감사합니다.</p>\
                    <p>본 메일은 회원가입을 위한 본인 확인을 위해 발송되는 메일 입니다.</p>\
                    <p>아래 [이메일 인증] 버튼을 누르시면 가입절차가 완료됩니다.</p>\
                </span>\
            </div>\
            <button class="btn" onclick="location.href=\'#\'">이메일 인증</button>\
        </div>\
    ';
    return common;
};