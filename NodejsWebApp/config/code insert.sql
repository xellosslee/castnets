INSERT INTO `code` VALUES (10000, NULL, '유저정보', '유저정보');
INSERT INTO `code` VALUES (10100, 10000, '성별', '미설정');
INSERT INTO `code` VALUES (10101, 10000, '남성', '남성');
INSERT INTO `code` VALUES (10102, 10000, '여성', '여성');
INSERT INTO `code` VALUES (10200, 10000, '유저상태', '미설정');
INSERT INTO `code` VALUES (10201, 10200, '가입유저', '가입유저');
INSERT INTO `code` VALUES (10202, 10200, '인증유저', '인증유저');
INSERT INTO `code` VALUES (10203, 10200, '휴면유저', '휴면유저');
INSERT INTO `code` VALUES (10204, 10200, '관리자', '관리자');


-- 관리자(이근석) 계정 생성
INSERT INTO userinfo VALUES (NULL, 'xelloss@gmail.com', 'xelloss', NULL, 10101, 10204, NULL, NULL, CURRENT_TIMESTAMP, NULL);