package com.hyundaiezwel.vs.auth;

import java.util.Map;

/**
 * 본인인증(PASS) 포트 — 본인인증 솔루션 담당(B23)이 vs-infra 에 구현체를 붙인다. 로컬은 LocalIdentityVerifier.
 */
public interface IdentityVerifier {

    /**
     * 콜백 파라미터에 서버가 덧붙이는 키 — 이 challenge 의 txId. <b>로컬 가짜 구현체만</b> 이 값을 결과 txId 로 돌려준다.
     * 실제 구현체는 결과의 txId 를 반드시 PASS 응답(복호화 결과)에서 꺼내야 한다 — 이 값을 되돌려 주면 짝 확인이 무력해진다.
     */
    String CHALLENGE_TX_ID = "challengeTxId";

    /** 인증 시작 — 팝업 URL · 요청값(암호화) · 거래 식별값을 돌려준다. 로컬은 mode=LOCAL 만 */
    IdentityStart start(String challengeId, String returnUrl);

    /** 콜백 결과 복호화 — 이름 · 생년월일(yyyymmdd) · 휴대폰(숫자) · 거래 식별값 */
    IdentityResult complete(Map<String, String> callbackParams);

    record IdentityStart(String mode, String popupUrl, Map<String, String> form, String txId) {
    }

    record IdentityResult(String name, String birth, String mobile, String txId) {
    }
}
