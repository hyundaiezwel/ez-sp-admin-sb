package com.hyundaiezwel.vs.auth;

/**
 * 1차 통과 ~ 본인인증 완료 사이의 상태(Redis chal:{challengeId}, 5분).
 * 본인인증을 마치기 전에는 세션을 만들지 않는다 — 1차 통과의 흔적은 이것 하나다.
 */
public record Challenge(String challengeId, String mngrId, String chnl, String state, int failCnt, String txId) {

    public static final String PENDING = "PENDING";
    public static final String VERIFIED = "VERIFIED";

    public Challenge withTxId(String newTxId) {
        return new Challenge(challengeId, mngrId, chnl, state, failCnt, newTxId);
    }

    public Challenge withFailCnt(int newFailCnt) {
        return new Challenge(challengeId, mngrId, chnl, state, newFailCnt, txId);
    }

    public Challenge verified() {
        return new Challenge(challengeId, mngrId, chnl, VERIFIED, failCnt, txId);
    }
}
