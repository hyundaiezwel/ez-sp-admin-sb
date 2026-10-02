-- =====================================================================
-- 노동자 휴가지원사업 — 초기 DB 설계 (누리집 FO · 기업 어드민 · 공사 어드민 공용)
-- 기준일 2026-10-01 · PostgreSQL 16 · 이지웰 명명 표준(약어 snake / _b 기본 · _c 코드 · _h 이력)
-- 원칙: 업무단위 와이드 테이블. 하위 정보는 별도 테이블로 쪼개지 않고 컬럼으로 흡수한다.
-- 일시 = varchar(14) yyyymmddhh24miss, 일자 = varchar(8) yyyymmdd, 금액 = numeric(15)
-- 컬럼명 끝 _enc = 앱 계층 암호문, _hash = 검색·중복확인용 단방향 해시
-- =====================================================================

create sequence vs_key_sq start 1000000001;  -- 모든 _no 키 공용 채번 (10자리 숫자 문자열, 이지웰 채번 형식과 같은 모양)

-- ---------------------------------------------------------------------
-- 1. 사업 — 연도·차수별 지원사업 1행. 발전모델·추가모집 설정을 흡수한다.
--    동반성장 협력사업(기관 단위)도 같은 테이블의 sprt_div_cd='PRTN' 행으로 둔다.
-- ---------------------------------------------------------------------
create table vs_biz_b (
    biz_no                varchar(12)  not null default nextval('vs_key_sq')::varchar,
    biz_yr                varchar(4)   not null,
    biz_ord               numeric(3)   not null default 1,
    sprt_div_cd           varchar(4)   not null,               -- GNRL 일반 / DVLP 발전 / PRTN 동반성장
    biz_nm                varchar(200) not null,
    biz_prgs_st_cd        varchar(4)   not null default 'RDY', -- RDY 준비 / RCRT 모집중 / JDG 심사중 / OPR 운영중 / END 종료
    rcrt_strt_dtm         varchar(14),
    rcrt_end_dtm          varchar(14),
    jdg_strt_dt           varchar(8),
    jdg_end_dt            varchar(8),
    jdg_anc_dt            varchar(8),                          -- 심사발표일
    rcrt_ppl_cnt          numeric(9),                          -- 모집정원(명)
    gov_shr_amt           numeric(15),                         -- 1인 분담금: 정부(공사)
    comp_shr_amt          numeric(15),                         --            기업
    indv_shr_amt          numeric(15),                         --            개인
    dvlp_obj_co_fg_list   varchar(50),                         -- 발전모델 대상 기업구분 (예 '4' 중견)
    dvlp_accum_yr_cnt     numeric(2),                          -- 발전모델 대상 누적참여년수 기준 (예 5년차 이상 중기업)
    dvlp_gov_shr_amt      numeric(15),
    dvlp_comp_shr_amt     numeric(15),
    dvlp_indv_shr_amt     numeric(15),
    add_rcpt_stup_json    jsonb,                               -- 추가모집 설정 [{co_fg_cd, open_yn, rcpt_strt_dtm, rcpt_end_dtm, dpst_strt_dtm, dpst_end_dtm}]
    use_poss_strt_dt      varchar(8),                          -- 포인트 사용기간 기본값 (배정 API 로 보내는 값. 배정 뒤 근로자별 기한은 이지웰이 정본 — 조회로 본다)
    use_poss_end_dt       varchar(8),
    prtn_org_nm           varchar(200),                        -- PRTN: 동반성장 참여기관(대기업·공공기관)명
    prtn_org_bizr_no      varchar(10),
    prtn_mngr_nm          varchar(100),
    prtn_mngr_eml_enc     varchar(512),
    prtn_mngr_telno_enc   varchar(256),
    use_yn                varchar(1)   not null default 'Y',
    version               numeric(9)   not null default 0,      -- 동시 처리 잠금: 갱신은 where version = :읽은값 으로만
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_biz_b_pk primary key (biz_no)
);
create index vs_biz_b_ix1 on vs_biz_b (biz_yr, sprt_div_cd);

-- ---------------------------------------------------------------------
-- 2. 기업 — 사업자번호 1행. 해마다 바뀌지 않는 기업정보와 환불계좌. 해마다 바뀌는 값(기업구분·인원·신청 담당자)은 참여건에 둔다.
-- ---------------------------------------------------------------------
create table vs_co_b (
    bizr_no               varchar(10)  not null,               -- 사업자등록번호 / 고유번호
    co_nm                 varchar(200) not null,
    co_zip                varchar(6),
    co_addr               varchar(300),
    co_dtl_addr           varchar(300),
    rprs_nm               varchar(200),                        -- 공동대표는 쉼표 구분
    corp_yn               varchar(1),
    ind_div_cd            varchar(4),                          -- 업종구분 (KSIC 대분류 A~U, 특수값)
    rfnd_mthd_cd          varchar(4),                          -- RFND_MTHD C 기업 / P 개인 / A 기업+개인
    rfnd_bank_cd          varchar(3),
    rfnd_acnt_no_enc      varchar(256),
    rfnd_dpstr_nm         varchar(100),
    rfnd_acnt_crtf_yn     varchar(1)   not null default 'N',   -- 계좌 실명검증
    version               numeric(9)   not null default 0,      -- 동시 처리 잠금: 갱신은 where version = :읽은값 으로만
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_co_b_pk primary key (bizr_no)
);
create index vs_co_b_ix1 on vs_co_b (co_nm);

-- ---------------------------------------------------------------------
-- 3. 참여건 — 1행 = 기업 × 사업 × 신청차수. 그해 기업구분·인원·신청 담당자·가상계좌·입금·이지웰 소속코드를 흡수한다.
--    최초 신청은 join_add_rn = 0, 참여개시 뒤 추가인원 신청은 join_add_rn = 1,2,… 인 새 행 (up_join_no = 최초 행).
--    join_no 가 누리집 결과조회의 '접수번호'다.
-- ---------------------------------------------------------------------
create table vs_join_b (
    join_no               varchar(12)  not null default nextval('vs_key_sq')::varchar,
    biz_no                varchar(12)  not null,
    join_add_rn           numeric(3)   not null default 0,
    up_join_no            varchar(12),
    -- 그해 기업 값 (기업 고정 정보는 vs_co_b)
    bizr_no               varchar(10)  not null,
    co_fg_cd              varchar(4)   not null,               -- CO_FG 1 소상공인 ~ 7 의료법인 (해마다 바뀔 수 있다)
    exec_nm_list          varchar(1000),                       -- 임원명 (소·중·중견만)
    ofc_wrkr_cnt          numeric(9),                          -- 상시근로자수
    dsbl_hire_yn          varchar(1)   not null default 'N',
    dsbl_hire_cnt         numeric(9),
    join_chnl_cd          varchar(12),                         -- 참여경로 JOIN_CHNL
    -- 신청 담당자 (계정은 vs_mngr_b)
    apl_mngr_nm           varchar(100),
    apl_mngr_eml_enc      varchar(512),
    apl_mngr_telno_enc    varchar(256),
    apl_mngr_mbl_telno_enc varchar(256),
    -- 인원·분담금 (분담금은 신청 시점 적용 모델의 스냅숏)
    apl_wrkr_cnt          numeric(9),
    apl_dsbl_wrkr_cnt     numeric(9),
    fnl_wrkr_cnt          numeric(9),                          -- 최종참여인원 (입금액 산정 기준)
    dvlp_mdl_yn           varchar(1)   not null default 'N',
    gov_shr_amt           numeric(15),                         -- 이 참여건 근로자 전원에게 같은 금액으로 배정된다 (근로자별로 다르지 않다)
    comp_shr_amt          numeric(15),
    indv_shr_amt          numeric(15),
    prtn_biz_no           varchar(12),                         -- 연계 동반성장 협력사업 (vs_biz_b PRTN 행)
    -- 상태 (AS-IS 코드 유지: JOIN_ST 00 심사중 ~ 96 환불실패, 추가차수 행은 7600대)
    join_st_cd            varchar(4)   not null default '00',
    join_st_chg_dtm       varchar(14),
    st_rsn_cntn           varchar(1000),                       -- 최근 사유 (기업에 보이는 보완·반려 사유). 누적은 vs_hist_h
    apl_dtm               varchar(14),
    fnl_sbmt_dtm          varchar(14),                         -- 70 최종제출
    slct_dtm              varchar(14),                         -- 50 선정완료
    reg_apv_dtm           varchar(14),                         -- 72 등록승인
    reg_apv_usr_id        varchar(42),
    pcpt_strt_dtm         varchar(14),                         -- 76 참여개시
    cnfm_reg_dtm          varchar(14),                         -- 참여확인서 등록일 (파일은 vs_file_b)
    bulk_cncl_excp_yn     varchar(1)   not null default 'N',   -- 일괄 참여취소 예외 기업
    -- 약관동의 (누리집 신청 시)
    prv_agr_yn            varchar(1),
    acnt_rsp_agr_yn       varchar(1),
    shop_rsp_agr_yn       varchar(1),
    agr_dtm               varchar(14),
    -- 가상계좌 · 입금 (에스크로: 국민은행 DB 조회 결과를 반영. 입금 원천 이력은 vs_hist_h DPST)
    vacct_bank_cd         varchar(3),
    vacct_no              varchar(20),
    vacct_dpstr_nm        varchar(100),
    vacct_iss_dtm         varchar(14),
    dpst_exp_amt          numeric(15),
    dpst_lmt_dt           varchar(8),
    dpst_amt              numeric(15),
    dpst_cmpl_dtm         varchar(14),
    dpst_cnfm_usr_id      varchar(42),
    -- 이지웰 매핑 (복지몰 소속1 = 사업연도, 소속2 = 참여기업)
    ezwel_clnt_cd         varchar(20),
    ezwel_br_cd           varchar(4),                          -- 소속1 연도 코드: ct_usr_b.cc_br_cd
    ezwel_dept_cd         varchar(4),                          -- 소속2 기업 코드: ct_usr_b.cc_dept_cd (ct_cc_dtl_c.high_cc_dtl_cd = 소속1). 연도 안에서 0000~9999 소진 뒤 aaaa, aaab… (정렬은 sort_ordg)
    -- 이지웰 '기업 코드 생성' 요청이 어떻게 됐는지. 빈값 = 아직 요청할 때 아님(최종승인 전)
    --   W = 요청 대기 (최종승인돼 보낼 차례, 아직 성공 못함) / C = 완료 (ezwel_dept_cd 받음) / F = 실패 (재시도 대상, 오류는 vs_hist_h LNK)
    br_lnk_st_cd          varchar(1),
    br_lnk_dtm            varchar(14),                         -- 위 요청을 마지막으로 보낸 일시 (성공·실패 모두)
    version               numeric(9)   not null default 0,      -- 동시 처리 잠금: 갱신은 where version = :읽은값 으로만
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_join_b_pk primary key (join_no),
    constraint vs_join_b_fk1 foreign key (biz_no) references vs_biz_b (biz_no),
    constraint vs_join_b_fk3 foreign key (bizr_no) references vs_co_b (bizr_no),
    constraint vs_join_b_fk2 foreign key (up_join_no) references vs_join_b (join_no),
    constraint vs_join_b_ck1 check ((join_add_rn = 0) = (up_join_no is null))
);
create index vs_join_b_ix1 on vs_join_b (bizr_no, biz_no);
create index vs_join_b_ix2 on vs_join_b (biz_no, join_st_cd);
create index vs_join_b_ix3 on vs_join_b (up_join_no);
create index vs_join_b_ix4 on vs_join_b (ezwel_br_cd, ezwel_dept_cd);

-- ---------------------------------------------------------------------
-- 4. 참여근로자 — 1행 = 참여건 × 근로자. 회원상태·심사·이용정지·환불·이지웰 회원생성+배정 결과를 흡수한다.
--    추가인원 근로자는 추가차수 참여건(join_add_rn > 0)에 매달린다.
--    포인트 잔액·사용내역·사용기한은 저장하지 않는다. 이지웰이 wrkr_no 를 자기 회원 테이블에 저장하고, 우리는 wrkr_no 로 조회한다.
-- ---------------------------------------------------------------------
create table vs_join_wrkr_b (
    wrkr_no               varchar(12)  not null default nextval('vs_key_sq')::varchar,
    join_no               varchar(12)  not null,
    wrkr_nm               varchar(100) not null,
    brdt                  varchar(8)   not null,
    person_key            varchar(64)  not null,               -- 동일인 키 = 이름+생년월일 해시 (중복신청·참여불가 매칭·재참여)
    mbl_telno_enc         varchar(256),
    mbl_telno_hash        varchar(64),
    eml_enc               varchar(512),
    sclins_join_yn        varchar(1),                          -- 4대보험 가입
    prtn_pcpt_yn          varchar(1)   not null default 'N',   -- 동반성장 연계 참가자
    rmk                   varchar(500),
    -- 근로자 심사 (재직증빙 OCR·RPA 결과 포함)
    wrkr_jdg_st_cd        varchar(4)   not null default 'WAIT',-- WRKR_JDG WAIT 대기 / APV 승인 / SPLM 보완필요 / RJCT 반려
    wrkr_jdg_rsn_cntn     varchar(1000),
    -- 회원상태 (AS-IS 코드 유지: MBR_ST L 미가입 / N 이용중 / S 이용정지 / R 환불요청 / T 환불대상 / D 환불완료 / F 환불실패)
    mbr_st_cd             varchar(1)   not null default 'L',
    mbr_st_chg_dtm        varchar(14),
    shop_join_dtm         varchar(14),                         -- 휴가샵 가입 (L → N)
    -- 이용정지
    use_stop_dtm          varchar(14),
    use_stop_rsn_cd       varchar(4),                          -- USE_STOP_RSN 7종
    use_stop_rsn_cntn     varchar(100),                        -- 기타 사유
    use_stop_usr_id       varchar(42),
    -- 환불 (이용정지된 근로자만)
    rfnd_comp_amt         numeric(15),
    rfnd_indv_amt         numeric(15),
    rfnd_gov_rtrv_amt     numeric(15),                         -- 미사용 정부지원금 공사 회수
    rfnd_stl_ym           varchar(6),
    rfnd_cmpl_dtm         varchar(14),
    rfnd_fail_rsn_cntn    varchar(500),
    -- 이지웰 '회원생성 + 포인트 배정' API(1회)를 이 근로자에 대해 보냈는지·성공했는지. 빈값 = 아직 보낼 때 아님(최종승인 전)
    --   W = 보낼 차례 (최종승인됨, 아직 성공 못함) / C = 완료 (이지웰에 회원 생기고 포인트 들어감) / F = 실패 (재시도 대상, 오류는 vs_hist_h LNK)
    --   예) 최종승인 → W → 배치가 API 호출 → 성공 C / 실패 F → 재시도 → C
    mbr_lnk_st_cd         varchar(1),
    mbr_lnk_dtm           varchar(14),                         -- 위 API를 마지막으로 호출한 일시 (성공·실패 모두)
    version               numeric(9)   not null default 0,      -- 동시 처리 잠금: 갱신은 where version = :읽은값 으로만
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_join_wrkr_b_pk primary key (wrkr_no),
    constraint vs_join_wrkr_b_fk1 foreign key (join_no) references vs_join_b (join_no)
);
create index vs_join_wrkr_b_ix1 on vs_join_wrkr_b (join_no);
create index vs_join_wrkr_b_ix2 on vs_join_wrkr_b (person_key);   -- 동일인 중복신청 강조 · 재참여
create index vs_join_wrkr_b_ix3 on vs_join_wrkr_b (mbl_telno_hash);
create index vs_join_wrkr_b_ix4 on vs_join_wrkr_b (mbr_lnk_st_cd) where mbr_lnk_st_cd <> 'C';   -- 연동 재시도 대상

-- ---------------------------------------------------------------------
-- 5. 계정 — 공사 · 이지웰 · 기업담당자 통합. 기업담당자는 기존 담당자가 등록(acnt_st_cd=UNRG) → 본인 가입.
--    세션 · 중복 로그인 · 2차 인증번호는 DB가 아니라 Redis(운영 ElastiCache)가 맡는다 — docs/dev/login.md 설계서.
-- ---------------------------------------------------------------------
create table vs_mngr_b (
    mngr_id               varchar(42)  not null,               -- 로그인 ID (생성 후 변경 불가)
    mngr_div_cd           varchar(4)   not null,               -- MNGR_DIV KTO 공사 / EZW 이지웰 / COMP 기업
    auth_cd               varchar(4)   not null,               -- AUTH (SB 역할) KTO: AM·AL·AS·AV / EZW: OM·OO / COMP: CM
    bizr_no               varchar(10),                         -- COMP 만
    biz_yr                varchar(4),                          -- COMP 만 (AS-IS: 매년 새로 가입)
    mngr_nm               varchar(100) not null,
    brdt                  varchar(8),
    mbl_telno_enc         varchar(256),
    eml_enc               varchar(512),
    dept_nm               varchar(100),
    jbps_nm               varchar(100),                        -- 직책
    dup_crtf_key          varchar(100),                        -- 중복인증키 (복수 사업장 담당자)
    pwd_hash              varchar(256),                        -- BCrypt
    prev_pwd_hash         varchar(256),                        -- 직전 비밀번호 (재사용 금지 확인)
    tmp_pwd_yn            varchar(1)   not null default 'Y',
    pwd_chg_dtm           varchar(14),
    acnt_st_cd            varchar(4)   not null default 'UNRG',-- ACNT_ST UNRG 미가입 / USE 사용 / DRMT 휴면 / LOCK 잠금 / STOP 사용중지
    lgin_fail_cnt         numeric(2)   not null default 0,
    last_lgin_dtm         varchar(14),
    apv_st_cd             varchar(1),                          -- ACNT_APV 0 승인대기 / 3 승인 / 2 거부 (공사 계정신청)
    apv_usr_id            varchar(42),
    apv_dtm               varchar(14),
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_mngr_b_pk primary key (mngr_id),
    constraint vs_mngr_b_fk1 foreign key (bizr_no) references vs_co_b (bizr_no),
    constraint vs_mngr_b_ck1 check ((mngr_div_cd = 'COMP') = (bizr_no is not null))
);
create index vs_mngr_b_ix1 on vs_mngr_b (bizr_no, biz_yr);

-- ---------------------------------------------------------------------
-- 6. 이력 — 상태변경 · 관리자 메모 · 정보수정 · 알림발송 · 입금 · 이지웰 연동 · 엑셀 다운로드 · 접속 · 개인정보 접근.
--    INSERT 만 허용 (트리거로 UPDATE/DELETE 차단). 보관 3년 이상.
-- ---------------------------------------------------------------------
create table vs_hist_h (
    hist_no               bigint       generated always as identity,
    hist_typ_cd           varchar(4)   not null,               -- HIST_TYP ST / MEMO / MOD / SEND / DPST / LNK / DOWN / LGIN / PRIV
    tgt_tbl_nm            varchar(30),                         -- vs_join_b / vs_join_wrkr_b / vs_mngr_b / vs_bbs_b …
    tgt_key               varchar(12),
    bef_val               varchar(100),                        -- ST: 변경 전 코드
    aft_val               varchar(100),                        -- ST: 변경 후 코드
    bulk_job_no           varchar(12),                         -- 일괄 처리 1회 묶음 (vs_key_sq). 건별 성공·실패는 aft_val·dtl_json
    rsn_cntn              varchar(2000),                       -- 사유 · 메모 본문 · 다운로드 사유
    dtl_json              jsonb,                               -- 유형별 상세 (SEND: chnl·tmpl_id·rcvr·rslt / DOWN: menu·cnt / MOD: 변경 컬럼 전후값 / LNK: 요청·응답)
    ip_addr               varchar(45),
    reg_dtm               varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    reg_usr_id            varchar(42)  not null,
    reg_pgm_id            varchar(50)  not null,
    constraint vs_hist_h_pk primary key (hist_no)
);
create index vs_hist_h_ix1 on vs_hist_h (tgt_tbl_nm, tgt_key, hist_no);
create index vs_hist_h_ix2 on vs_hist_h (hist_typ_cd, reg_dtm);
create index vs_hist_h_ix3 on vs_hist_h (reg_usr_id, reg_dtm);
create index vs_hist_h_ix4 on vs_hist_h (bulk_job_no) where bulk_job_no is not null;

create function vs_hist_h_no_change() returns trigger language plpgsql as $$
begin
    raise exception 'vs_hist_h 는 수정·삭제할 수 없습니다';
end $$;
create trigger vs_hist_h_tg1 before update or delete on vs_hist_h
    for each row execute function vs_hist_h_no_change();

-- ---------------------------------------------------------------------
-- 7. 첨부파일 — 모든 첨부. 보완 재제출은 새 행 + 이전 행 del_yn='Y' (원본 보관).
-- ---------------------------------------------------------------------
create table vs_file_b (
    file_no               varchar(12)  not null default nextval('vs_key_sq')::varchar,
    tgt_tbl_nm            varchar(30)  not null,
    tgt_key               varchar(12)  not null,
    file_div_cd           varchar(4)   not null,               -- FILE_DIV
    orgn_file_nm          varchar(300) not null,
    strg_path             varchar(500) not null,               -- S3 키
    file_size             numeric(12),
    file_ext              varchar(10),
    del_yn                varchar(1)   not null default 'N',
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_file_b_pk primary key (file_no)
);
create index vs_file_b_ix1 on vs_file_b (tgt_tbl_nm, tgt_key, file_div_cd);

-- ---------------------------------------------------------------------
-- 8. 게시물 — 공지 · FAQ · 누리집 문의 · 부정행위 신고 · 기업 업무요청 · 자료실 · 매뉴얼 · 팝업 · 배너.
--    업무요청의 요청/답변 사이클(최대 5)은 1사이클 = 1행, 2번째 사이클부터 up_bbs_no 로 매단다.
-- ---------------------------------------------------------------------
create table vs_bbs_b (
    bbs_no                varchar(12)  not null default nextval('vs_key_sq')::varchar,
    bbs_div_cd            varchar(4)   not null,               -- BBS_DIV NOTI / FAQ / INQ / RPT / REQ / DATA / MNUL / POP / BNR
    up_bbs_no             varchar(12),
    ctgr_cd               varchar(4),                          -- 구분별 분류 (공지분류 · FAQ 분류 · 문의유형 · 요청유형)
    tgt_cd                varchar(4),                          -- 공지대상 ALL 공통 / FO 누리집 / COMP 기업
    ttl                   varchar(300),
    cntn                  text,
    wrtr_nm               varchar(100),
    wrtr_co_nm            varchar(200),                        -- 누리집 문의 기업명
    wrtr_eml_enc          varchar(512),                        -- 누리집 문의·신고 회신 메일
    wrtr_mngr_id          varchar(42),                         -- 업무요청 작성 기업담당자
    prv_agr_yn            varchar(1),
    prcs_st_cd            varchar(4),                          -- 처리상태 (업무요청·문의·신고)
    ans_cntn              text,
    ans_usr_id            varchar(42),
    ans_dtm               varchar(14),
    disp_yn               varchar(1)   not null default 'N',
    disp_strt_dtm         varchar(14),
    disp_end_dtm          varchar(14),
    sort_ordg             numeric(5)   not null default 0,
    inq_cnt               numeric(9)   not null default 0,
    link_url              varchar(500),
    disp_opt_json         jsonb,                               -- 팝업 유형·크기, 자료실 버튼색 등 화면 옵션
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_bbs_b_pk primary key (bbs_no),
    constraint vs_bbs_b_fk1 foreign key (up_bbs_no) references vs_bbs_b (bbs_no)
);
create index vs_bbs_b_ix1 on vs_bbs_b (bbs_div_cd, disp_yn, frst_reg_dtm);
create index vs_bbs_b_ix2 on vs_bbs_b (up_bbs_no);
create index vs_bbs_b_ix3 on vs_bbs_b (wrtr_mngr_id);

-- ---------------------------------------------------------------------
-- 9. 참여불가 — 기업(ban_div_cd=COMP) · 회원(MBR). ban_end_dt 가 비어 있으면 영구.
-- ---------------------------------------------------------------------
create table vs_ban_b (
    ban_no                varchar(12)  not null default nextval('vs_key_sq')::varchar,
    ban_div_cd            varchar(4)   not null,               -- BAN_DIV COMP / MBR
    bizr_no               varchar(10),
    co_nm                 varchar(200),
    co_fg_cd              varchar(4),
    ban_ctgr_cd           varchar(4),                          -- 참여불가 분류
    wrkr_nm               varchar(100),                        -- MBR 표시용
    brdt                  varchar(8),
    person_key            varchar(64),                         -- MBR 매칭 키 = 이름+생년월일 해시 (vs_join_wrkr_b.person_key 와 같은 규칙)
    dtct_rout_cd          varchar(1),                          -- DTCT_ROUT S 스크래핑 / E 기타
    dtct_dt               varchar(8),
    aply_yn               varchar(1)   not null default 'Y',
    ban_strt_dt           varchar(8),
    ban_end_dt            varchar(8),
    rmk                   varchar(1000),
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_ban_b_pk primary key (ban_no),
    constraint vs_ban_b_ck1 check ((ban_div_cd = 'COMP' and bizr_no is not null) or (ban_div_cd = 'MBR' and person_key is not null))
);
create index vs_ban_b_ix1 on vs_ban_b (bizr_no) where ban_div_cd = 'COMP';
create index vs_ban_b_ix2 on vs_ban_b (person_key) where ban_div_cd = 'MBR';

-- ---------------------------------------------------------------------
-- 10. 코드 — 이지웰 ct_cc_dtl_c 와 같은 모양 (고객사코드만 뺐다).
-- ---------------------------------------------------------------------
create table vs_cd_c (
    cd_grp                varchar(20)  not null,
    cd                    varchar(20)  not null,
    cd_nm                 varchar(100) not null,
    sort_ordg             numeric(5)   not null default 0,
    up_cd                 varchar(20),
    cd_add_val1           varchar(100),
    cd_add_val2           varchar(100),
    use_yn                varchar(1)   not null default 'Y',
    frst_reg_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    frst_reg_usr_id       varchar(42)  not null,
    frst_reg_pgm_id       varchar(50)  not null,
    last_mod_dtm          varchar(14)  not null default to_char(now(), 'YYYYMMDDHH24MISS'),
    last_mod_usr_id       varchar(42)  not null,
    last_mod_pgm_id       varchar(50)  not null,
    constraint vs_cd_c_pk primary key (cd_grp, cd)
);
