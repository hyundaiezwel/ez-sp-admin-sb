package com.hyundaiezwel.vs.auth;

/** access token(JWT) 포트. refresh token 은 두지 않는다 — 세션 유효성은 매 요청 Redis 로 본다. */
public interface TokenIssuer {

    String issue(TokenClaims claims);

    /** 서명·만료 확인. 만료면 AUTH_SESSION_EXPIRED, 그 밖의 불량은 AUTH_UNAUTHENTICATED. */
    TokenClaims parse(String token);
}
