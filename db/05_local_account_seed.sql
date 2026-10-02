-- 로컬 개발용 로그인 계정 시드 — 운영·dev 서버에 넣지 말 것. 01_ddl · 04_comment · 02_code_seed 다음에 적용.
-- 비밀번호(로컬 전용 테스트 값): 일반 계정 = Vs!Local2027 · test.tmp = Temp!2027vs (임시비밀번호). BCrypt cost 10.
-- 휴대폰·이메일은 '{plain}' 접두 평문이다. 로컬 프로필의 암호화 어댑터는 이 접두가 붙은 값을 복호화 없이 그대로 돌려준다(docs/dev/login.md 6.3).

insert into vs_co_b (bizr_no, co_nm, rprs_nm, corp_yn, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
values ('1234567890', '테스트기업(주)', '홍대표', 'Y', 'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED')
on conflict (bizr_no) do nothing;

insert into vs_mngr_b (mngr_id, mngr_div_cd, auth_cd, bizr_no, biz_yr, mngr_nm, brdt, mbl_telno_enc, eml_enc, dept_nm, jbps_nm,
                       pwd_hash, tmp_pwd_yn, pwd_chg_dtm, acnt_st_cd, lgin_fail_cnt, last_lgin_dtm, apv_st_cd,
                       frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
values
-- 공사 마스터 — 계정발급·사업설정
('kto.am','KTO', 'AM', null, null, '공사마스터', '19900101', '{plain}01000000001', '{plain}kto.am@example.test', '노동자휴가지원팀', '팀장',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 공사 총괄 — 승인·금전·일괄
('kto.al','KTO', 'AL', null, null, '공사총괄', '19900101', '{plain}01000000002', '{plain}kto.al@example.test', '노동자휴가지원팀', '차장',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 공사 담당 — 심사 실무
('kto.as','KTO', 'AS', null, null, '공사담당', '19900101', '{plain}01000000003', '{plain}kto.as@example.test', '노동자휴가지원팀', '대리',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 공사 조회전용 — 마스킹
('kto.av','KTO', 'AV', null, null, '공사조회', '19900101', '{plain}01000000004', '{plain}kto.av@example.test', '노동자휴가지원팀', '사원',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 이지웰 운영사 마스터
('ezw.om','EZW', 'OM', null, null, '운영마스터', '19900101', '{plain}01000000005', '{plain}ezw.om@example.test', '고객사운영팀', '책임',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 이지웰 운영자
('ezw.oo','EZW', 'OO', null, null, '운영자', '19900101', '{plain}01000000006', '{plain}ezw.oo@example.test', '고객사운영팀', '선임',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 기업담당자 — 관리자 화면에서는 거부, 기업 어드민 화면용
('comp.cm','COMP', 'CM', '1234567890', '2027', '기업담당', '19900101', '{plain}01000000007', '{plain}comp.cm@example.test', '인사팀', '과장',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'USE', 0, '20261001090000', null,
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 임시비밀번호 → 비밀번호 변경 모달 강제
('test.tmp','KTO', 'AS', null, null, '임시비번', '19900101', '{plain}01000000008', '{plain}test.tmp@example.test', '노동자휴가지원팀', '사원',
  '$2a$10$xGS37GqiKU1oEd0C8fZQhOofikfnOHBRguFni9st9ts1zH7c0sFza', 'Y', '20261001090000', 'USE', 0, null, '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 5회 실패 잠금
('test.lock','KTO', 'AS', null, null, '잠금계정', '19900101', '{plain}01000000009', '{plain}test.lock@example.test', '노동자휴가지원팀', '사원',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'LOCK', 5, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 6개월 미접속 휴면
('test.drmt','KTO', 'AS', null, null, '휴면계정', '19900101', '{plain}01000000010', '{plain}test.drmt@example.test', '노동자휴가지원팀', '사원',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'DRMT', 0, '20260301090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 사용중지
('test.stop','EZW', 'OO', null, null, '중지계정', '19900101', '{plain}01000000011', '{plain}test.stop@example.test', '고객사운영팀', '사원',
  '$2a$10$TNzFLoUdkvM.mF8CL5VPkeGyLOIKBM9jhGtFV7u6NuMXm1wsGRawS', 'N', '20261001090000', 'STOP', 0, '20261001090000', '3',
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED'),
-- 담당자 등록만 됨(비밀번호 없음) — 로그인 불가
('comp.unrg','COMP', 'CM', '1234567890', '2027', '미가입담당', '19900101', '{plain}01000000012', '{plain}comp.unrg@example.test', '인사팀', '대리',
  null, 'Y', null, 'UNRG', 0, null, null,
  'SYSTEM', 'LOCAL_SEED', 'SYSTEM', 'LOCAL_SEED')
on conflict (mngr_id) do nothing;
