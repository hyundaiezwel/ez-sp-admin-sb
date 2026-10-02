package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.auth.AuthPolicy;
import com.hyundaiezwel.vs.auth.AuthService;
import com.hyundaiezwel.vs.auth.ChallengeStore;
import com.hyundaiezwel.vs.auth.HistWriter;
import com.hyundaiezwel.vs.auth.IdentityVerifier;
import com.hyundaiezwel.vs.auth.MngrRepository;
import com.hyundaiezwel.vs.auth.PasswordHasher;
import com.hyundaiezwel.vs.auth.PiiCipher;
import com.hyundaiezwel.vs.auth.SessionStore;
import com.hyundaiezwel.vs.auth.TokenIssuer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Duration;
import java.time.Period;

/**
 * 도메인 서비스 배선. vs-domain 은 프레임워크 무의존이라 여기서 생성자로 묶는다.
 * IdentityVerifier·PiiCipher 구현체가 없으면(local 이 아닌데 실제 구현체가 아직 없을 때) 기동이 실패한다 — 의도한 동작이다.
 */
@Configuration
public class AuthConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    public AuthPolicy authPolicy(@Value("${vs.auth.idle-timeout}") Duration idle,
                                 @Value("${vs.auth.absolute-timeout}") Duration absolute,
                                 @Value("${vs.auth.warn-before}") Duration warnBefore,
                                 @Value("${vs.auth.dormant-after}") String dormantAfter,
                                 @Value("${vs.auth.admin-url}") String adminUrl,
                                 @Value("${vs.auth.comp-url}") String compUrl) {
        return new AuthPolicy(idle, absolute, warnBefore, Period.parse(dormantAfter), adminUrl, compUrl);
    }

    @Bean
    public AuthService authService(MngrRepository mngrs, HistWriter hists, SessionStore sessions, ChallengeStore challenges,
                                   IdentityVerifier verifier, PiiCipher cipher, PasswordHasher hasher, TokenIssuer tokens,
                                   AuthPolicy policy, Clock clock) {
        return new AuthService(mngrs, hists, sessions, challenges, verifier, cipher, hasher, tokens, policy, clock);
    }
}
