package com.hyundaiezwel.vs.auth;

import com.hyundaiezwel.vs.auth.IdentityVerifier.IdentityResult;

/**
 * 본인인증 결과와 계정 대조(docs/dev/login.md 7절). 이름 + 생년월일 + 휴대폰 세 가지가 모두 같아야 통과.
 * 어느 항목이 틀렸는지는 돌려주지 않는다 — boolean 하나뿐인 것이 그 규칙이다.
 */
public final class IdentityMatcher {

    private IdentityMatcher() {
    }

    /**
     * @param plainMobile 계정 휴대폰(PiiCipher.decrypt 결과)
     */
    public static boolean matches(Mngr mngr, String plainMobile, IdentityResult result) {
        if (mngr == null || result == null) {
            return false;
        }
        String name = trim(mngr.mngrNm());
        String birth = digits(mngr.brdt());
        String mobile = digits(plainMobile);
        if (name.isEmpty() || birth.isEmpty() || mobile.isEmpty()) {
            return false;
        }
        return name.equals(trim(result.name()))
                && birth.equals(digits(result.birth()))
                && mobile.equals(digits(result.mobile()));
    }

    /** 숫자만 남긴다(null 은 빈 문자열). */
    public static String digits(String value) {
        return value == null ? "" : value.replaceAll("[^0-9]", "");
    }

    private static String trim(String value) {
        return value == null ? "" : value.strip();
    }
}
