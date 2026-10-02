package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.common.LocalOnly;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 로컬 전용 구현체(가짜 본인인증·평문 암호화·local-verify API)가 local 이 아닌 프로필에서 잡히면 기동을 실패시킨다.
 * 웹 서버가 뜨기 전(싱글톤 생성 직후)에 확인한다. @Profile 이 1차로 막고, 이것은 설정 실수에 대한 2차 방어다.
 */
@Component
public class LocalOnlyGuard implements SmartInitializingSingleton {

    private final ApplicationContext context;
    private final Environment env;

    public LocalOnlyGuard(ApplicationContext context, Environment env) {
        this.context = context;
        this.env = env;
    }

    @Override
    public void afterSingletonsInstantiated() {
        check(env.acceptsProfiles(Profiles.of("local")), List.of(context.getBeanNamesForAnnotation(LocalOnly.class)),
                env.getProperty("vs.identity.verifier"), env.getProperty("vs.pii.cipher"));
    }

    static void check(boolean localProfile, Collection<String> localOnlyBeans, String verifier, String cipher) {
        if (localProfile) {
            return;
        }
        if (!localOnlyBeans.isEmpty()) {
            throw new IllegalStateException("local 프로필이 아닌데 로컬 전용 빈이 등록됐습니다: " + localOnlyBeans);
        }
        if ("local".equals(verifier) || "plain".equals(cipher)) {
            throw new IllegalStateException("local 프로필이 아닌데 VS_IDENTITY_VERIFIER=local 또는 VS_PII_CIPHER=plain 입니다.");
        }
    }
}
