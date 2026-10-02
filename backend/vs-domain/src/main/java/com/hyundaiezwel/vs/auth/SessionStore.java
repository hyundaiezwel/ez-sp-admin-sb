package com.hyundaiezwel.vs.auth;

import java.time.Duration;

/**
 * 세션 저장소 포트(Redis). 저장소 장애는 구현체가 AUTH_SESSION_STORE_UNAVAILABLE(503)로 바꿔 던진다 — fail-closed.
 */
public interface SessionStore {

    Session find(String mngrId);

    /** 기존 세션을 지우고 새로 쓴다(TTL = idle). */
    void save(Session session, Duration idle);

    /** 무활동 TTL 을 되돌린다. */
    void touch(String mngrId, Duration idle);

    /** 남은 TTL. 키가 없으면 null. */
    Duration ttl(String mngrId);

    void delete(String mngrId);

    /** 세션이 있을 때만 비밀번호 변경 강제 플래그를 바꾼다(TTL 유지). */
    void updateMustChangePassword(String mngrId, boolean mustChange);

    /** 끊긴 sid 에 사유를 남긴다 — 끊긴 쪽 다음 요청에 "다른 곳에서 로그인" 을 주려고. */
    void markKicked(String sid, String reason, Duration ttl);

    String kickedReason(String sid);
}
