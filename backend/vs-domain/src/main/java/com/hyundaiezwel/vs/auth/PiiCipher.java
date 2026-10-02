package com.hyundaiezwel.vs.auth;

/** 개인정보 암호화 포트 — 복지몰 암호화 표준(A26)이 정해지면 구현체 교체. 로컬은 PlainPiiCipher({plain} 통과). */
public interface PiiCipher {
    String encrypt(String plain);

    String decrypt(String cipher);
}
