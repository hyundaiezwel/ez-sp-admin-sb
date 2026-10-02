package com.hyundaiezwel.vs.auth;

/** 요청자 IP·User-Agent — 세션·이력에 남긴다. */
public record ClientInfo(String ip, String ua) {
}
