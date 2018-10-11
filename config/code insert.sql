DELETE FROM `code`;
INSERT INTO `code` VALUES (10000, NULL, '유저정보', '유저정보');
INSERT INTO `code` VALUES (10100, 10000, '성별', '미설정');
INSERT INTO `code` VALUES (10101, 10100, '남성', '남성');
INSERT INTO `code` VALUES (10102, 10100, '여성', '여성');

INSERT INTO `code` VALUES (10200, 10000, '유저상태', '미설정');
INSERT INTO `code` VALUES (10201, 10200, '가입유저', '가입유저');
INSERT INTO `code` VALUES (10202, 10200, '인증유저', '인증유저');
INSERT INTO `code` VALUES (10203, 10200, '휴면유저', '휴면유저');
INSERT INTO `code` VALUES (10204, 10200, '관리자', '관리자');
INSERT INTO `code` VALUES (10205, 10200, '차단유저', '차단유저');

INSERT INTO `code` VALUES (30000, NULL, '영상정보', '영상정보');
INSERT INTO `code` VALUES (30100, 30000, '영상종류', '미설정');
INSERT INTO `code` VALUES (30101, 30100, '영상종류', '음식');
INSERT INTO `code` VALUES (30102, 30100, '영상종류', '여행');
INSERT INTO `code` VALUES (30103, 30100, '영상종류', '인물');
INSERT INTO `code` VALUES (30104, 30100, '영상종류', '동물');

INSERT INTO `code` VALUES (60000, NULL, '파일정보', '파일정보');
INSERT INTO `code` VALUES (60100, 60000, '등록위치', '미설정');
INSERT INTO `code` VALUES (60101, 60100, '등록위치', '안드로이드');
INSERT INTO `code` VALUES (60102, 60100, '등록위치', '애플');
INSERT INTO `code` VALUES (60103, 60100, '등록위치', '웹');

INSERT INTO `code` VALUES (60200, 60000, '파일종류', '미설정');
INSERT INTO `code` VALUES (60201, 60200, '파일종류', '영상');
INSERT INTO `code` VALUES (60202, 60200, '파일종류', '썸네일');
INSERT INTO `code` VALUES (60203, 60200, '파일종류', '프로필');
INSERT INTO `code` VALUES (60204, 60200, '파일종류', '프로필배경');

INSERT INTO `code` VALUES (70000, NULL, '영상기록', '영상기록');
INSERT INTO `code` VALUES (70100, 70000, '영상기록종류', '미설정');
INSERT INTO `code` VALUES (70101, 70100, '영상기록종류', '시작');
INSERT INTO `code` VALUES (70102, 70100, '영상기록종류', '종료');
INSERT INTO `code` VALUES (70103, 70100, '영상기록종류', '퇴장');

INSERT INTO `code` VALUES (90000, NULL, '접속정보', '접속정보');
INSERT INTO `code` VALUES (90100, 90000, '접속경로', '미설정');
INSERT INTO `code` VALUES (90101, 90100, '접속경로', '안드로이드');
INSERT INTO `code` VALUES (90102, 90100, '접속경로', '애플');
INSERT INTO `code` VALUES (90103, 90100, '접속경로', '웹');

INSERT INTO `code` VALUES (100000, NULL, '서버정보', '서버정보');
INSERT INTO `code` VALUES (100100, 100000, '서버종류', '미설정');
INSERT INTO `code` VALUES (100101, 100100, '서버종류', 'WAS서버');
INSERT INTO `code` VALUES (100102, 100100, '서버종류', 'Resource서버');

INSERT INTO `castnets`.`terms` 
	(`title`, 	`contents`, 	`registdate`, 	`order`	)
	VALUES('캐스트네츠 이용약관','이 약관은 일군연구소가 제공하는 캐스트네츠 및 캐스트네츠 관련 제반 서비스의 이용과 관련하여 회사와 회원과의 권리,의무 및 책임사항. 기타 필요한 사항을 규정함을 목적으로 합니다.',NOW(),101);
INSERT INTO `castnets`.`terms` 
	(`title`, 	`contents`, 	`registdate`, 	`order`	)
	VALUES('개인정보 수집 및 이용','정보통신망법 규정에 따라 일군연구소에 회원가입 신청 하시는 분께 수집하는 개인정보의 항목, 개인정보의 수집 및 이용목적, 개인정보의 보유 및 이용기간을 안내 드리오니 자세히 읽은 후 동의하여 주시기 바랍니다. "캐스트네츠"에 등록한 동영상의 저작권은 캐스트네츠에 있습니다.',NOW(),102);
INSERT INTO `castnets`.`terms` 
	(`title`, 	`contents`, 	`registdate`, 	`order`	)
	VALUES('위치정보 이용약관','위치정보 이용약관에 동의하시면, 위치를 활용한 광고 정보수신등을 포함하는 일군연구소 위치기반 서비스를 이용할 수 있습니다.',NOW(),103);

-- 관리자(이근석) 계정 생성
INSERT INTO userinfo VALUES (NULL, 'xelloss@gmail.com', 'xelloss', NULL, 10101, 10204, NULL, NULL, CURRENT_TIMESTAMP, NULL);

-- 로그인테스트
SET @a = '';
CALL userlogin('xelloss@gmail.com', 'k4NLEHm2R+abZ28HJICgt/IEsIB5rrkXb7NfCebY9+pUachbFxC0cNfc0TVNA1q/KLkN6BwByAN7FwB5Wwh/nA==', 90101, @a);
SELECT @a;

-- 로그인된 토큰들 찾기
SELECT *, HEX(AES_ENCRYPT(connectid, logindate)) FROM connectlog WHERE logoutdate IS NULL;

START TRANSACTION;
CALL emailcert('8FD605178FE13813FC3A5A375982D173');
ROLLBACK;

CALL usersessioncheck('E0315699136C0BCFC6A3DB786E0D77AF');

CALL usersaltget('01011112227');

SET @userid = UseridFromToken('E0315699136C0BCFC6A3DB786E0D77AF');
SELECT @userid;

SHOW VARIABLES LIKE 'c%';

CALL usernamecheck('7FB478E1579B5400D876CA678C48CCF4', '346522541');
CALL usernamechange('7FB478E1579B5400D876CA678C48CCF4', 'test5555');
CALL usernamecheck('36156EA9DA199D71ADE75DA7776943F5', '34652254');

DELETE FROM filemap;
ALTER TABLE filemap AUTO_INCREMENT=1;
DELETE FROM video;
ALTER TABLE video AUTO_INCREMENT=1;
DELETE FROM smslog;
ALTER TABLE smslog AUTO_INCREMENT=1;

-- 비디오 삭제
SELECT * FROM video;
SELECT * FROM filemap WHERE filetype IN(60201,60202);
DELETE FROM filemap WHERE filetype IN(60201,60202);
DELETE FROM video;

-- 프로필 삭제
DELETE FROM filemap WHERE fileid IN(SELECT profileid FROM userinfo);
DELETE FROM filemap WHERE fileid IN(SELECT profilebackid FROM userinfo);
SELECT * FROM filemap;
UPDATE userinfo SET profileid = NULL, profilebackid = NULL;

GRANT ALL ON Castnets.* TO 'castnetsmysqler'@'%' IDENTIFIED BY 'c@stnet&mysql1@#';
FLUSH PRIVILEGES;