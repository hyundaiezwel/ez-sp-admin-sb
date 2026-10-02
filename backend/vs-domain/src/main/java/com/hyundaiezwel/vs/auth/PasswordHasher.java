package com.hyundaiezwel.vs.auth;

/** 비밀번호 해시 포트(BCrypt 는 vs-infra 안에만). */
public interface PasswordHasher {

    String hash(String raw);

    /**
     * hash 가 null(없는 계정·비밀번호 미설정)이어도 더미 해시와 대조해 같은 시간을 쓴 뒤 false 를 돌려준다
     * — 응답 시간으로 계정 존재를 알 수 없게.
     */
    boolean matches(String raw, String hash);
}
