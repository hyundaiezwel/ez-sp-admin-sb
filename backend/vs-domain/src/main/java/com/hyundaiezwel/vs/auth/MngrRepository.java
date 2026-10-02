package com.hyundaiezwel.vs.auth;

/**
 * vs_mngr_b 포트. 상태가 바뀌는 갱신은 모두 "읽은 값" 조건부 UPDATE 이고 갱신 건수를 돌려준다 — 0 이면 호출자가 409.
 * (vs_mngr_b 에는 version 컬럼이 없어 읽은 lgin_fail_cnt·acnt_st_cd·pwd_hash 를 조건으로 쓴다.)
 */
public interface MngrRepository {

    Mngr findById(String mngrId);

    /** 실패 횟수·상태를 바꾼다. 조건: 읽은 시점의 lgin_fail_cnt·acnt_st_cd 가 그대로일 때만. */
    int updateFailCntAndStatus(Mngr before, int newFailCnt, String newStatus, String usrId, String dtm);

    /** 로그인 성공 — lgin_fail_cnt=0, last_lgin_dtm. 조건: acnt_st_cd='USE'. */
    int recordLoginSuccess(String mngrId, String dtm);

    /** prev_pwd_hash ← pwd_hash, pwd_hash ← newHash, tmp_pwd_yn='N'. 조건: 읽은 pwd_hash 그대로. */
    int changePassword(String mngrId, String expectedHash, String newHash, String dtm);
}
