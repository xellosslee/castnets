INSERT INTO `code` VALUES (10000, NULL, '유저정보', '유저정보');

INSERT INTO `code` VALUES (10100, 10000, '성별', '미설정');
INSERT INTO `code` VALUES (10101, 10100, '남성', '남성');
INSERT INTO `code` VALUES (10102, 10100, '여성', '여성');

INSERT INTO `code` VALUES (10200, 10000, '유저상태', '미설정');
INSERT INTO `code` VALUES (10201, 10200, '가입유저', '가입유저');
INSERT INTO `code` VALUES (10202, 10200, '인증유저', '인증유저');
INSERT INTO `code` VALUES (10203, 10200, '휴면유저', '휴면유저');
INSERT INTO `code` VALUES (10204, 10200, '관리자', '관리자');

INSERT INTO `code` VALUES (30000, NULL, '영상정보', '영상정보');
INSERT INTO `code` VALUES (30100, NULL, '영상종류', '미설정');
INSERT INTO `code` VALUES (30101, NULL, '영상종류', '동물');
INSERT INTO `code` VALUES (30102, NULL, '영상종류', '음식');
INSERT INTO `code` VALUES (30103, NULL, '영상종류', '여행');

INSERT INTO `code` VALUES (60000, NULL, '파일정보', '파일정보');
INSERT INTO `code` VALUES (60100, 60000, '등록위치', '미설정');
INSERT INTO `code` VALUES (60101, 60100, '등록위치', '안드로이드');
INSERT INTO `code` VALUES (60102, 60100, '등록위치', '애플');

INSERT INTO `code` VALUES (60200, 60000, '파일종류', '미설정');
INSERT INTO `code` VALUES (60201, 60200, '파일종류', '영상');
INSERT INTO `code` VALUES (60202, 60200, '파일종류', '프로필');
INSERT INTO `code` VALUES (60203, 60200, '파일종류', '프로필배경');

INSERT INTO `code` VALUES (90000, NULL, '접속정보', '접속정보');
INSERT INTO `code` VALUES (90100, 90000, '접속경로', '미설정');
INSERT INTO `code` VALUES (90101, 90100, '접속경로', '안드로이드');
INSERT INTO `code` VALUES (90102, 90100, '접속경로', '애플');

-- 관리자(이근석) 계정 생성
INSERT INTO userinfo VALUES (NULL, 'xelloss@gmail.com', 'xelloss', NULL, 10101, 10204, NULL, NULL, CURRENT_TIMESTAMP, NULL);

-- 로그인테스트
SET @a = '';
CALL userlogin('xelloss@gmail.com', 'k4NLEHm2R+abZ28HJICgt/IEsIB5rrkXb7NfCebY9+pUachbFxC0cNfc0TVNA1q/KLkN6BwByAN7FwB5Wwh/nA==', 90101, @a);
SELECT @a;

CALL usersessioncheck('E0315699136C0BCFC6A3DB786E0D77AF');

CALL usergetsalt('01011112227');

SELECT HEX(AES_ENCRYPT(connectid,logindate)) FROM connectlog

SET @userid = UseridFromToken('E0315699136C0BCFC6A3DB786E0D77AF');
SELECT @userid;

SHOW VARIABLES LIKE 'c%';

DELETE FROM filemap;
ALTER TABLE filemap AUTO_INCREMENT=1;
DELETE FROM video;
ALTER TABLE video AUTO_INCREMENT=1;
DELETE FROM smslog;
ALTER TABLE smslog AUTO_INCREMENT=1;