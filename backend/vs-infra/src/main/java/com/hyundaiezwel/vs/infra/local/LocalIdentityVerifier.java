package com.hyundaiezwel.vs.infra.local;

import com.hyundaiezwel.vs.auth.IdentityMatcher;
import com.hyundaiezwel.vs.auth.IdentityVerifier;
import com.hyundaiezwel.vs.common.LocalOnly;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * 로컬 가짜 본인인증 — 화면에서 받은 이름·생년월일·휴대폰을 그대로 결과로 쓴다(PASS 팝업 없음).
 * local 프로필 + VS_IDENTITY_VERIFIER=local 일 때만 등록. 다른 프로필에서 잡히면 LocalOnlyGuard 가 기동을 막는다.
 */
@Component
@LocalOnly
@Profile("local")
@ConditionalOnProperty(name = "vs.identity.verifier", havingValue = "local")
public class LocalIdentityVerifier implements IdentityVerifier {

    @Override
    public IdentityStart start(String challengeId, String returnUrl) {
        return new IdentityStart("LOCAL", null, null, "LOCAL-" + UUID.randomUUID());
    }

    /** 거래 식별값은 서버가 넣어 준 challenge 의 txId 를 그대로 돌려준다 — 가짜 구현체라서만 허용되는 일이다. */
    @Override
    public IdentityResult complete(Map<String, String> params) {
        return new IdentityResult(params.get("name"), params.get("birth"), IdentityMatcher.digits(params.get("mobile")),
                params.get(CHALLENGE_TX_ID));
    }
}
