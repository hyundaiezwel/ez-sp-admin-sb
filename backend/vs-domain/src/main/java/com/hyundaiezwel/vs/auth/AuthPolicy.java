package com.hyundaiezwel.vs.auth;

import java.time.Duration;
import java.time.Period;

/**
 * env 로 받는 인증 설정(docs/dev/login.md 6·12절).
 *
 * @param idleTimeout     VS_AUTH_IDLE_TIMEOUT (PT30M) — 세션 무활동 만료
 * @param absoluteTimeout VS_AUTH_ABSOLUTE_TIMEOUT (PT12H) — JWT exp 절대 상한
 * @param warnBefore      VS_AUTH_WARN_BEFORE (PT5M) — 화면 예고용. 서버 판정에는 쓰지 않는다
 * @param dormantAfter    VS_AUTH_DORMANT_AFTER (P6M) — 마지막 로그인 후 이 기간이 지나면 휴면
 * @param adminUrl        VS_ADMIN_URL — 관리자 화면 주소(채널 불일치 안내·본인인증 콜백 postMessage 대상)
 * @param compUrl         VS_COMP_URL — 기업 관리자 화면 주소
 */
public record AuthPolicy(Duration idleTimeout, Duration absoluteTimeout, Duration warnBefore, Period dormantAfter,
                         String adminUrl, String compUrl) {

    /** 1차 인증 연속 실패 잠금 기준. 5회째 실패에서 LOCK. */
    public static final int MAX_LOGIN_FAILURES = 5;
    /** 본인인증 불일치 한도. 5회째에 challenge 폐기. */
    public static final int MAX_IDENTITY_FAILURES = 5;
    public static final Duration CHALLENGE_TTL = Duration.ofMinutes(5);
    /** 끊긴 sid 표식 보관 — 절대 상한과 같은 12시간이면 그 토큰이 살아 있는 동안 내내 사유를 줄 수 있다. */
    public static final Duration KICK_TTL = Duration.ofHours(12);
}
