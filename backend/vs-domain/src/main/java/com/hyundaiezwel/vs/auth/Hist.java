package com.hyundaiezwel.vs.auth;

import java.util.Map;

/**
 * vs_hist_h 한 행. tgt_tbl_nm 은 인증 이력이라 항상 vs_mngr_b, reg_pgm_id 는 AUTH 로 어댑터가 채운다.
 * PASS 결과 개인정보(이름·생년월일·휴대폰)는 dtl 에 넣지 않는다.
 */
public record Hist(String histTypCd, String tgtKey, String befVal, String aftVal,
                   Map<String, Object> dtl, String ipAddr, String regDtm, String regUsrId) {

    public static final String TYP_LGIN = "LGIN";
    public static final String TYP_ST = "ST";
    public static final String TYP_MOD = "MOD";
    public static final String ANONYMOUS = "ANONYMOUS";
}
