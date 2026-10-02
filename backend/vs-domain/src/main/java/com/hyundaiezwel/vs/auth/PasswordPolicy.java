package com.hyundaiezwel.vs.auth;

/**
 * 비밀번호 규칙(SB · 보안요구 SER-001): 영대·영소·숫자·특수 중 2종 10자 이상 또는 3종 8자 이상, 아이디와 같으면 안 된다.
 * 특수문자는 ASCII 인쇄 가능 기호만 인정한다 — 공백·한글 등은 규칙 위반으로 본다(입력기마다 다르게 들어가 로그인이 안 되는 사고 방지).
 * 64자 상한은 BCrypt 72바이트 한계 안쪽에 둔 것이다.
 */
public final class PasswordPolicy {

    public static final int MAX_LENGTH = 64;

    private PasswordPolicy() {
    }

    public static boolean isValid(String password, String loginId) {
        if (password == null || password.length() > MAX_LENGTH) {
            return false;
        }
        if (loginId != null && password.equalsIgnoreCase(loginId)) {
            return false;
        }
        boolean upper = false, lower = false, digit = false, special = false;
        for (char ch : password.toCharArray()) {
            if (ch >= 'A' && ch <= 'Z') {
                upper = true;
            } else if (ch >= 'a' && ch <= 'z') {
                lower = true;
            } else if (ch >= '0' && ch <= '9') {
                digit = true;
            } else if (ch > ' ' && ch < 127) {
                special = true;
            } else {
                return false;
            }
        }
        int kinds = (upper ? 1 : 0) + (lower ? 1 : 0) + (digit ? 1 : 0) + (special ? 1 : 0);
        int len = password.length();
        return (kinds >= 2 && len >= 10) || (kinds >= 3 && len >= 8);
    }
}
