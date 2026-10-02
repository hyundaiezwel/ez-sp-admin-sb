-- 테이블 · 컬럼 설명 (DBeaver 등 툴의 Comment 칸에 보인다). 01_ddl.sql 다음에 적용.
comment on table vs_biz_b       is '사업기본 — 연도·차수별 지원사업 1행 (발전모델·추가모집·동반성장 협력사업 포함)';
comment on table vs_co_b        is '기업기본 — 사업자번호 1행 (해마다 바뀌지 않는 기업정보·환불계좌)';
comment on table vs_join_b      is '참여건기본 — 기업×사업×신청차수 1행 (그해 기업구분·인원·신청 담당자·가상계좌·입금·이지웰 소속코드 포함)';
comment on table vs_join_wrkr_b is '참여근로자기본 — 참여건×근로자 1행 (심사·회원상태·이용정지·환불·이지웰 회원생성+배정 결과 포함)';
comment on table vs_mngr_b      is '계정기본 — 공사·이지웰·기업담당자 로그인 계정';
comment on table vs_hist_h      is '이력 — 상태변경·메모·정보수정·발송·입금·연동·다운로드·접속·개인정보접근 (INSERT 전용)';
comment on table vs_file_b      is '첨부파일기본 — 모든 첨부 (재제출 시 이전 행 del_yn=Y)';
comment on table vs_bbs_b       is '게시물기본 — 공지·FAQ·누리집문의·부정행위신고·업무요청·자료실·매뉴얼·팝업·배너';
comment on table vs_ban_b       is '참여불가기본 — 참여불가 기업·회원';
comment on table vs_cd_c        is '공통코드';

-- 감사컬럼 6종 (전 테이블 공통)
do $$
declare t text;
begin
    foreach t in array array['vs_biz_b','vs_co_b','vs_join_b','vs_join_wrkr_b','vs_mngr_b','vs_file_b','vs_bbs_b','vs_ban_b','vs_cd_c'] loop
        execute format('comment on column %I.frst_reg_dtm    is %L', t, '최초등록일시');
        execute format('comment on column %I.frst_reg_usr_id is %L', t, '최초등록사용자ID');
        execute format('comment on column %I.frst_reg_pgm_id is %L', t, '최초등록프로그램ID');
        execute format('comment on column %I.last_mod_dtm    is %L', t, '최종수정일시');
        execute format('comment on column %I.last_mod_usr_id is %L', t, '최종수정사용자ID');
        execute format('comment on column %I.last_mod_pgm_id is %L', t, '최종수정프로그램ID');
    end loop;
end $$;

-- vs_biz_b
comment on column vs_biz_b.biz_no              is '사업번호';
comment on column vs_biz_b.biz_yr              is '사업연도';
comment on column vs_biz_b.biz_ord             is '사업차수';
comment on column vs_biz_b.sprt_div_cd         is '지원구분코드 (SPRT_DIV: GNRL 일반 / DVLP 발전 / PRTN 동반성장)';
comment on column vs_biz_b.biz_nm              is '사업명';
comment on column vs_biz_b.biz_prgs_st_cd      is '사업진행상태코드 (BIZ_PRGS_ST)';
comment on column vs_biz_b.rcrt_strt_dtm       is '모집시작일시';
comment on column vs_biz_b.rcrt_end_dtm        is '모집종료일시';
comment on column vs_biz_b.jdg_strt_dt         is '심사시작일자';
comment on column vs_biz_b.jdg_end_dt          is '심사종료일자';
comment on column vs_biz_b.jdg_anc_dt          is '심사발표일자';
comment on column vs_biz_b.rcrt_ppl_cnt        is '모집정원수';
comment on column vs_biz_b.gov_shr_amt         is '1인정부분담금액 (일반)';
comment on column vs_biz_b.comp_shr_amt        is '1인기업분담금액 (일반)';
comment on column vs_biz_b.indv_shr_amt        is '1인개인분담금액 (일반)';
comment on column vs_biz_b.dvlp_obj_co_fg_list is '발전모델대상기업구분목록 (CO_FG 쉼표구분)';
comment on column vs_biz_b.dvlp_accum_yr_cnt   is '발전모델대상누적참여년수';
comment on column vs_biz_b.dvlp_gov_shr_amt    is '발전모델1인정부분담금액';
comment on column vs_biz_b.dvlp_comp_shr_amt   is '발전모델1인기업분담금액';
comment on column vs_biz_b.dvlp_indv_shr_amt   is '발전모델1인개인분담금액';
comment on column vs_biz_b.add_rcpt_stup_json  is '추가모집설정JSON [{co_fg_cd, open_yn, rcpt_strt_dtm, rcpt_end_dtm, dpst_strt_dtm, dpst_end_dtm}]';
comment on column vs_biz_b.use_poss_strt_dt    is '포인트사용가능시작일자 — 배정 API로 보내는 기본값. 배정 뒤 근로자별 기한은 이지웰 조회';
comment on column vs_biz_b.use_poss_end_dt     is '포인트사용가능종료일자 — 배정 API로 보내는 기본값. 근로자별 변경은 이지웰 API로 바로 보내고 vs_hist_h(MOD)에 남긴다';
comment on column vs_biz_b.prtn_org_nm         is '동반성장참여기관명 (PRTN)';
comment on column vs_biz_b.prtn_org_bizr_no    is '동반성장참여기관사업자번호 (PRTN)';
comment on column vs_biz_b.prtn_mngr_nm        is '동반성장기관담당자명 (PRTN)';
comment on column vs_biz_b.prtn_mngr_eml_enc   is '동반성장기관담당자이메일 (암호화)';
comment on column vs_biz_b.prtn_mngr_telno_enc is '동반성장기관담당자전화번호 (암호화)';
comment on column vs_biz_b.use_yn              is '사용여부';
comment on column vs_biz_b.version             is '버전 (동시 처리 잠금)';

-- vs_co_b
comment on column vs_co_b.bizr_no           is '사업자등록번호/고유번호';
comment on column vs_co_b.co_nm             is '기업명';
comment on column vs_co_b.co_zip            is '기업우편번호';
comment on column vs_co_b.co_addr           is '기업주소';
comment on column vs_co_b.co_dtl_addr       is '기업상세주소';
comment on column vs_co_b.rprs_nm           is '대표자명 (공동대표 쉼표구분)';
comment on column vs_co_b.corp_yn           is '법인여부';
comment on column vs_co_b.ind_div_cd        is '업종구분코드 (KSIC 대분류)';
comment on column vs_co_b.rfnd_mthd_cd      is '환불수단코드 (RFND_MTHD)';
comment on column vs_co_b.rfnd_bank_cd      is '환불은행코드 (BANK)';
comment on column vs_co_b.rfnd_acnt_no_enc  is '환불계좌번호 (암호화)';
comment on column vs_co_b.rfnd_dpstr_nm     is '환불예금주명';
comment on column vs_co_b.rfnd_acnt_crtf_yn is '환불계좌인증여부';
comment on column vs_co_b.version           is '버전 (동시 처리 잠금)';

-- vs_join_b
comment on column vs_join_b.join_no                is '참여번호 (누리집 접수번호)';
comment on column vs_join_b.biz_no                 is '사업번호';
comment on column vs_join_b.join_add_rn            is '신청차수 (0 최초, 1~ 추가인원)';
comment on column vs_join_b.up_join_no             is '상위참여번호 (추가차수 행 → 최초 행)';
comment on column vs_join_b.bizr_no                is '사업자등록번호 (vs_co_b)';
comment on column vs_join_b.co_fg_cd               is '기업구분코드 (CO_FG, 그해 값)';
comment on column vs_join_b.exec_nm_list           is '임원명목록';
comment on column vs_join_b.ofc_wrkr_cnt           is '상시근로자수';
comment on column vs_join_b.dsbl_hire_yn           is '장애인근로자채용여부';
comment on column vs_join_b.dsbl_hire_cnt          is '장애인근로자채용수';
comment on column vs_join_b.join_chnl_cd           is '참여경로코드 (JOIN_CHNL)';
comment on column vs_join_b.apl_mngr_nm            is '신청담당자명';
comment on column vs_join_b.apl_mngr_eml_enc       is '신청담당자이메일 (암호화)';
comment on column vs_join_b.apl_mngr_telno_enc     is '신청담당자전화번호 (암호화)';
comment on column vs_join_b.apl_mngr_mbl_telno_enc is '신청담당자휴대전화번호 (암호화)';
comment on column vs_join_b.apl_wrkr_cnt           is '신청근로자수';
comment on column vs_join_b.apl_dsbl_wrkr_cnt      is '신청장애인근로자수';
comment on column vs_join_b.fnl_wrkr_cnt           is '최종참여근로자수 (입금액 산정 기준)';
comment on column vs_join_b.dvlp_mdl_yn            is '발전모델적용여부';
comment on column vs_join_b.gov_shr_amt            is '1인정부분담금액 (신청시점 스냅숏) — 근로자 전원 동일하게 배정, 이지웰 3분할 기준';
comment on column vs_join_b.comp_shr_amt           is '1인기업분담금액 (신청시점 스냅숏) — 근로자 전원 동일하게 배정, 이지웰 3분할 기준';
comment on column vs_join_b.indv_shr_amt           is '1인개인분담금액 (신청시점 스냅숏) — 근로자 전원 동일하게 배정, 이지웰 3분할 기준';
comment on column vs_join_b.prtn_biz_no            is '동반성장사업번호 (vs_biz_b PRTN 행)';
comment on column vs_join_b.join_st_cd             is '참여상태코드 (JOIN_ST, AS-IS 27종)';
comment on column vs_join_b.join_st_chg_dtm        is '참여상태변경일시';
comment on column vs_join_b.st_rsn_cntn            is '최근상태사유내용 (보완·반려 사유, 누적은 vs_hist_h)';
comment on column vs_join_b.apl_dtm                is '신청일시';
comment on column vs_join_b.fnl_sbmt_dtm           is '최종제출일시 (70)';
comment on column vs_join_b.slct_dtm               is '선정완료일시 (50)';
comment on column vs_join_b.reg_apv_dtm            is '등록승인일시 (72)';
comment on column vs_join_b.reg_apv_usr_id         is '등록승인사용자ID';
comment on column vs_join_b.pcpt_strt_dtm          is '참여개시일시 (76)';
comment on column vs_join_b.cnfm_reg_dtm           is '참여확인서등록일시';
comment on column vs_join_b.bulk_cncl_excp_yn      is '일괄참여취소예외여부';
comment on column vs_join_b.prv_agr_yn             is '개인정보수집이용동의여부';
comment on column vs_join_b.acnt_rsp_agr_yn        is '기업계좌오기입책임동의여부';
comment on column vs_join_b.shop_rsp_agr_yn        is '휴가샵미가입·적립금관리책임동의여부';
comment on column vs_join_b.agr_dtm                is '약관동의일시';
comment on column vs_join_b.vacct_bank_cd          is '가상계좌은행코드';
comment on column vs_join_b.vacct_no               is '가상계좌번호';
comment on column vs_join_b.vacct_dpstr_nm         is '가상계좌예금주명';
comment on column vs_join_b.vacct_iss_dtm          is '가상계좌발급일시';
comment on column vs_join_b.dpst_exp_amt           is '입금예정금액';
comment on column vs_join_b.dpst_lmt_dt            is '입금기한일자';
comment on column vs_join_b.dpst_amt               is '입금금액';
comment on column vs_join_b.dpst_cmpl_dtm          is '입금완료일시';
comment on column vs_join_b.dpst_cnfm_usr_id       is '입금확인사용자ID';
comment on column vs_join_b.ezwel_clnt_cd          is '이지웰고객사코드';
comment on column vs_join_b.ezwel_br_cd            is '이지웰소속1코드 = 사업연도 (ct_usr_b.cc_br_cd)';
comment on column vs_join_b.ezwel_dept_cd          is '이지웰소속2코드 = 참여기업 (ct_usr_b.cc_dept_cd, 연도 내 0000~9999 → aaaa~)';
comment on column vs_join_b.br_lnk_st_cd           is '이지웰 기업코드 생성 요청 상태 (LNK_ST) — 빈값: 아직 요청할 때 아님(최종승인 전) / W: 요청 대기(보낼 차례) / C: 완료(ezwel_dept_cd 받음) / F: 실패(재시도 대상, 오류는 vs_hist_h LNK)';
comment on column vs_join_b.br_lnk_dtm             is '이지웰 기업코드 생성 요청을 마지막으로 보낸 일시 (성공·실패 모두)';
comment on column vs_join_b.version                is '버전 (동시 처리 잠금)';

-- vs_join_wrkr_b
comment on column vs_join_wrkr_b.wrkr_no            is '근로자번호 — 이지웰 휴가샵 회원 테이블에 저장되는 우리 키(조회 조건). 이지웰 회원은 연도마다 새로 생기므로 회원 1명 = 이 행 1개';
comment on column vs_join_wrkr_b.join_no            is '참여번호';
comment on column vs_join_wrkr_b.wrkr_nm            is '근로자명';
comment on column vs_join_wrkr_b.brdt               is '생년월일';
comment on column vs_join_wrkr_b.person_key         is '동일인키 (이름+생년월일 해시) — 우리 쪽 전용: 연도 내 중복신청·참여불가 매칭·재참여 통계. 이지웰에 보내지 않는다';
comment on column vs_join_wrkr_b.mbl_telno_enc      is '휴대전화번호 (암호화)';
comment on column vs_join_wrkr_b.mbl_telno_hash     is '휴대전화번호해시 (검색·중복확인)';
comment on column vs_join_wrkr_b.eml_enc            is '이메일 (암호화)';
comment on column vs_join_wrkr_b.sclins_join_yn     is '4대보험가입여부';
comment on column vs_join_wrkr_b.prtn_pcpt_yn       is '동반성장연계참가자여부';
comment on column vs_join_wrkr_b.rmk                is '비고';
comment on column vs_join_wrkr_b.wrkr_jdg_st_cd     is '근로자심사상태코드 (WRKR_JDG)';
comment on column vs_join_wrkr_b.wrkr_jdg_rsn_cntn  is '근로자심사사유내용';
comment on column vs_join_wrkr_b.mbr_st_cd          is '회원상태코드 (MBR_ST: L 미가입 ~ F 환불실패)';
comment on column vs_join_wrkr_b.mbr_st_chg_dtm     is '회원상태변경일시';
comment on column vs_join_wrkr_b.shop_join_dtm      is '휴가샵가입일시';
comment on column vs_join_wrkr_b.use_stop_dtm       is '이용정지일시';
comment on column vs_join_wrkr_b.use_stop_rsn_cd    is '이용정지사유코드 (USE_STOP_RSN)';
comment on column vs_join_wrkr_b.use_stop_rsn_cntn  is '이용정지사유내용 (기타)';
comment on column vs_join_wrkr_b.use_stop_usr_id    is '이용정지처리사용자ID';
comment on column vs_join_wrkr_b.rfnd_comp_amt      is '환불기업금액';
comment on column vs_join_wrkr_b.rfnd_indv_amt      is '환불개인금액';
comment on column vs_join_wrkr_b.rfnd_gov_rtrv_amt  is '정부지원금회수금액';
comment on column vs_join_wrkr_b.rfnd_stl_ym        is '환불정산년월';
comment on column vs_join_wrkr_b.rfnd_cmpl_dtm      is '환불완료일시';
comment on column vs_join_wrkr_b.rfnd_fail_rsn_cntn is '환불실패사유내용';
comment on column vs_join_wrkr_b.mbr_lnk_st_cd      is '이지웰 회원생성+포인트배정 API 처리 상태 (LNK_ST) — 빈값: 아직 보낼 때 아님(최종승인 전) / W: 보낼 차례(최종승인됨, 아직 성공 못함) / C: 완료(이지웰에 회원 생기고 포인트 들어감) / F: 실패(재시도 대상, 오류는 vs_hist_h LNK). 예) 최종승인→W→API 성공→C';
comment on column vs_join_wrkr_b.mbr_lnk_dtm        is '이지웰 회원생성+포인트배정 API를 마지막으로 호출한 일시 (성공·실패 모두)';
comment on column vs_join_wrkr_b.version            is '버전 (동시 처리 잠금)';

-- vs_mngr_b
comment on column vs_mngr_b.mngr_id       is '계정ID (로그인 ID, 변경 불가)';
comment on column vs_mngr_b.mngr_div_cd   is '계정구분코드 (MNGR_DIV: KTO 공사 / EZW 이지웰 / COMP 기업)';
comment on column vs_mngr_b.auth_cd       is '역할코드 (AUTH, SB 역할) — KTO: AM 마스터·AL 총괄·AS 담당·AV 조회전용 / EZW: OM 마스터·OO 운영자 / COMP: CM 기업담당자';
comment on column vs_mngr_b.bizr_no       is '사업자등록번호 (기업담당자만)';
comment on column vs_mngr_b.biz_yr        is '사업연도 (기업담당자만)';
comment on column vs_mngr_b.mngr_nm       is '담당자명';
comment on column vs_mngr_b.brdt          is '생년월일';
comment on column vs_mngr_b.mbl_telno_enc is '휴대전화번호 (암호화)';
comment on column vs_mngr_b.eml_enc       is '이메일 (암호화)';
comment on column vs_mngr_b.dept_nm       is '부서명';
comment on column vs_mngr_b.jbps_nm       is '직책명';
comment on column vs_mngr_b.dup_crtf_key  is '중복인증키 (복수 사업장 담당자)';
comment on column vs_mngr_b.pwd_hash      is '비밀번호해시 (BCrypt)';
comment on column vs_mngr_b.prev_pwd_hash is '직전비밀번호해시 (재사용 금지 확인)';
comment on column vs_mngr_b.tmp_pwd_yn    is '임시비밀번호여부';
comment on column vs_mngr_b.pwd_chg_dtm   is '비밀번호변경일시';
comment on column vs_mngr_b.acnt_st_cd    is '계정상태코드 (ACNT_ST)';
comment on column vs_mngr_b.lgin_fail_cnt is '로그인실패수';
comment on column vs_mngr_b.last_lgin_dtm is '최종로그인일시';

comment on column vs_mngr_b.apv_st_cd     is '계정승인상태코드 (ACNT_APV)';
comment on column vs_mngr_b.apv_usr_id    is '승인사용자ID';
comment on column vs_mngr_b.apv_dtm       is '승인일시';

-- vs_hist_h
comment on column vs_hist_h.hist_no     is '이력번호';
comment on column vs_hist_h.hist_typ_cd is '이력유형코드 (HIST_TYP)';
comment on column vs_hist_h.tgt_tbl_nm  is '대상테이블명';
comment on column vs_hist_h.tgt_key     is '대상키';
comment on column vs_hist_h.bef_val     is '변경전값';
comment on column vs_hist_h.aft_val     is '변경후값';
comment on column vs_hist_h.bulk_job_no is '일괄처리작업번호';
comment on column vs_hist_h.rsn_cntn    is '사유내용 (메모 본문·다운로드 사유 포함)';
comment on column vs_hist_h.dtl_json    is '상세JSON (유형별 상세)';
comment on column vs_hist_h.ip_addr     is '접속IP주소';
comment on column vs_hist_h.reg_dtm     is '등록일시';
comment on column vs_hist_h.reg_usr_id  is '등록사용자ID';
comment on column vs_hist_h.reg_pgm_id  is '등록프로그램ID';

-- vs_file_b
comment on column vs_file_b.file_no      is '파일번호';
comment on column vs_file_b.tgt_tbl_nm   is '대상테이블명';
comment on column vs_file_b.tgt_key      is '대상키';
comment on column vs_file_b.file_div_cd  is '파일구분코드 (FILE_DIV)';
comment on column vs_file_b.orgn_file_nm is '원본파일명';
comment on column vs_file_b.strg_path    is '저장경로 (S3 키)';
comment on column vs_file_b.file_size    is '파일크기 (byte)';
comment on column vs_file_b.file_ext     is '파일확장자';
comment on column vs_file_b.del_yn       is '삭제여부';

-- vs_bbs_b
comment on column vs_bbs_b.bbs_no        is '게시물번호';
comment on column vs_bbs_b.bbs_div_cd    is '게시물구분코드 (BBS_DIV)';
comment on column vs_bbs_b.up_bbs_no     is '상위게시물번호 (업무요청 2번째 사이클부터)';
comment on column vs_bbs_b.ctgr_cd       is '분류코드 (구분별 분류·유형)';
comment on column vs_bbs_b.tgt_cd        is '대상코드 (NOTI_TGT)';
comment on column vs_bbs_b.ttl           is '제목';
comment on column vs_bbs_b.cntn          is '내용';
comment on column vs_bbs_b.wrtr_nm       is '작성자명';
comment on column vs_bbs_b.wrtr_co_nm    is '작성자기업명';
comment on column vs_bbs_b.wrtr_eml_enc  is '작성자회신이메일 (암호화)';
comment on column vs_bbs_b.wrtr_mngr_id  is '작성계정ID (업무요청)';
comment on column vs_bbs_b.prv_agr_yn    is '개인정보수집동의여부';
comment on column vs_bbs_b.prcs_st_cd    is '처리상태코드';
comment on column vs_bbs_b.ans_cntn      is '답변내용';
comment on column vs_bbs_b.ans_usr_id    is '답변사용자ID';
comment on column vs_bbs_b.ans_dtm       is '답변일시';
comment on column vs_bbs_b.disp_yn       is '전시여부';
comment on column vs_bbs_b.disp_strt_dtm is '전시시작일시';
comment on column vs_bbs_b.disp_end_dtm  is '전시종료일시';
comment on column vs_bbs_b.sort_ordg     is '정렬순서';
comment on column vs_bbs_b.inq_cnt       is '조회수';
comment on column vs_bbs_b.link_url      is '링크URL';
comment on column vs_bbs_b.disp_opt_json is '전시옵션JSON (팝업 유형·크기, 버튼색 등)';

-- vs_ban_b
comment on column vs_ban_b.ban_no         is '참여불가번호';
comment on column vs_ban_b.ban_div_cd     is '참여불가구분코드 (BAN_DIV: COMP 기업 / MBR 회원)';
comment on column vs_ban_b.bizr_no        is '사업자등록번호';
comment on column vs_ban_b.co_nm          is '기업명';
comment on column vs_ban_b.co_fg_cd       is '기업구분코드 (CO_FG)';
comment on column vs_ban_b.ban_ctgr_cd    is '참여불가분류코드';
comment on column vs_ban_b.wrkr_nm        is '근로자명 (MBR)';
comment on column vs_ban_b.brdt           is '생년월일 (MBR)';
comment on column vs_ban_b.person_key     is '동일인키 (MBR 매칭, 이름+생년월일 해시)';
comment on column vs_ban_b.dtct_rout_cd   is '적발경로코드 (DTCT_ROUT)';
comment on column vs_ban_b.dtct_dt        is '적발일자';
comment on column vs_ban_b.aply_yn        is '적용여부';
comment on column vs_ban_b.ban_strt_dt    is '참여불가시작일자';
comment on column vs_ban_b.ban_end_dt     is '참여불가종료일자 (빈 값 = 영구)';
comment on column vs_ban_b.rmk            is '비고';

-- vs_cd_c
comment on column vs_cd_c.cd_grp      is '코드그룹';
comment on column vs_cd_c.cd          is '코드';
comment on column vs_cd_c.cd_nm       is '코드명';
comment on column vs_cd_c.sort_ordg   is '정렬순서';
comment on column vs_cd_c.up_cd       is '상위코드';
comment on column vs_cd_c.cd_add_val1 is '코드추가값1';
comment on column vs_cd_c.cd_add_val2 is '코드추가값2';
comment on column vs_cd_c.use_yn      is '사용여부';
