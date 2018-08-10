module.exports = function () {
    var common = {};
    const fs = require('fs');
    /** 디렉토리 생성
     * @param {any} dirPath 전체경로를 전달하여 해당 디렉토리까지 모두 생성
     */
    common.mkdirpath = function(dirPath) {
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath);
            }
            catch (e) {
                mkdirpath(path.dirname(dirPath));
                mkdirpath(dirPath);
            }
        }
    };
    return common;
};