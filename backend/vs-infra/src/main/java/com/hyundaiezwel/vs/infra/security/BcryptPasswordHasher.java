package com.hyundaiezwel.vs.infra.security;

import com.hyundaiezwel.vs.auth.PasswordHasher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * BCrypt(cost 10 — 로컬 시드와 같다). BCrypt 타입은 이 클래스 밖으로 나가지 않는다(vs-api import 금지 ArchTest).
 */
@Component
public class BcryptPasswordHasher implements PasswordHasher {

    /** BCrypt 는 72바이트까지만 본다. 넘는 입력은 대조하지 않고 실패로 본다(뒤를 잘라 맞는 것으로 치지 않게). */
    private static final int BCRYPT_MAX_BYTES = 72;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
    /** 없는 계정에 대조할 더미 해시 — 같은 cost 라 응답 시간이 같다. 기동마다 새로 만든다. */
    private final String dummyHash = encoder.encode("vs-dummy-password-for-timing");

    @Override
    public String hash(String raw) {
        return encoder.encode(raw);
    }

    @Override
    public boolean matches(String raw, String hash) {
        String input = raw == null ? "" : raw;
        boolean usable = hash != null && hash.startsWith("$2") && input.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_BYTES;
        if (!usable) {
            encoder.matches("", dummyHash);
            return false;
        }
        return encoder.matches(input, hash);
    }
}
