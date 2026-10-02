package com.hyundaiezwel.vs.auth;

/** vs_mngr_b 에서 인증에 쓰는 컬럼만. 이름은 컬럼을 camelCase 로 옮긴 그대로다(MyBatis 생성자 매핑). */
public record Mngr(
        String mngrId,
        String mngrDivCd,
        String authCd,
        String mngrNm,
        String brdt,
        String mblTelnoEnc,
        String deptNm,
        String jbpsNm,
        String pwdHash,
        String prevPwdHash,
        String tmpPwdYn,
        String acntStCd,
        Integer lginFailCnt,
        String lastLginDtm) {

    public static final String ST_USE = "USE";
    public static final String ST_LOCK = "LOCK";
    public static final String ST_STOP = "STOP";
    public static final String ST_DRMT = "DRMT";
    public static final String ST_UNRG = "UNRG";

    public int failCnt() {
        return lginFailCnt == null ? 0 : lginFailCnt;
    }

    public boolean tmpPassword() {
        return "Y".equals(tmpPwdYn);
    }
}
