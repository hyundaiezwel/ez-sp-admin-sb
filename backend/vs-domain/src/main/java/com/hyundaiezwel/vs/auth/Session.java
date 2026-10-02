package com.hyundaiezwel.vs.auth;

import java.time.Instant;

/** 계정당 1개 세션(Redis sess:{mngrId}, 무활동 TTL sliding). 새 로그인이 덮어쓴다. */
public record Session(String mngrId, String sid, String chnl, String div, String auth,
                      Instant issuedAt, Instant absExpAt, String ip, String ua, boolean mustChangePassword) {
}
