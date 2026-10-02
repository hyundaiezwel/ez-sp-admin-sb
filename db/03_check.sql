-- 01_ddl.sql · 02_code_seed.sql 적용 뒤 돌리는 확인 스크립트. 빈 DB에서만 돌릴 것 (행을 넣는다).
--   psql -v ON_ERROR_STOP=1 -d <빈DB> -f 01_ddl.sql -f 02_code_seed.sql -f 03_check.sql
-- 끝까지 'OK' 가 나오면 통과. 제약이 빠지면 해당 do 블록이 예외를 던진다.
insert into vs_biz_b (biz_yr, sprt_div_cd, biz_nm, gov_shr_amt, comp_shr_amt, indv_shr_amt, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
values ('2027', 'GNRL', '27년 휴가지원비', 100000, 100000, 200000, 't', 't', 't', 't');
insert into vs_co_b (bizr_no, co_nm, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
values ('1234567890', '테스트기업', 't', 't', 't', 't');
insert into vs_join_b (biz_no, bizr_no, co_fg_cd, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
select biz_no, '1234567890', '2', 't', 't', 't', 't' from vs_biz_b;
insert into vs_join_b (biz_no, join_add_rn, up_join_no, bizr_no, co_fg_cd, join_st_cd, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
select biz_no, 1, join_no, bizr_no, co_fg_cd, '7600', 't', 't', 't', 't' from vs_join_b where join_add_rn = 0;
insert into vs_hist_h (hist_typ_cd, tgt_tbl_nm, tgt_key, bef_val, aft_val, reg_usr_id, reg_pgm_id)
select 'ST', 'vs_join_b', join_no, '00', '20', 't', 't' from vs_join_b where join_add_rn = 0;

do $$ begin  -- 추가차수 행은 최초 행을 가리켜야 한다
    insert into vs_join_b (biz_no, join_add_rn, bizr_no, co_fg_cd, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
    select biz_no, 2, '1234567890', '1', 't', 't', 't', 't' from vs_biz_b;
    raise exception 'FAIL: vs_join_b_ck1';
exception when check_violation then null; end $$;

do $$ begin  -- 이력은 수정 불가
    update vs_hist_h set rsn_cntn = 'x';
    raise exception 'FAIL: vs_hist_h update';
exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
end $$;

do $$ begin  -- 이력은 삭제 불가
    delete from vs_hist_h;
    raise exception 'FAIL: vs_hist_h delete';
exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
end $$;

do $$ begin  -- 기업담당자 계정은 사업자번호 필수
    insert into vs_mngr_b (mngr_id, mngr_div_cd, auth_cd, mngr_nm, frst_reg_usr_id, frst_reg_pgm_id, last_mod_usr_id, last_mod_pgm_id)
    values ('a', 'COMP', 'CM', 'n', 't', 't', 't', 't');
    raise exception 'FAIL: vs_mngr_b_ck1';
exception when check_violation then null; end $$;

select case when (select count(*) from vs_cd_c where cd_grp = 'JOIN_ST') = 27 then 'OK' else 'FAIL: JOIN_ST 27종' end as result;
