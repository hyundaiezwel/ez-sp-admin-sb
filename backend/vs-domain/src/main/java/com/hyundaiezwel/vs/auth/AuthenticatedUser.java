package com.hyundaiezwel.vs.auth;

import java.time.Instant;

/** 매 요청 세션 대조를 통과한 사용자. 컨트롤러는 @LoginUser 로 받는다. */
public record AuthenticatedUser(String mngrId, String div, String auth, String chnl, String sid,
                                Instant absExpAt, boolean mustChangePassword) {
}
