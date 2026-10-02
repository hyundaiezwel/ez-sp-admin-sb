package com.hyundaiezwel.vs.infra.local;

import com.hyundaiezwel.vs.auth.PiiCipher;
import com.hyundaiezwel.vs.common.LocalOnly;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 로컬 평문 "암호화" — '{plain}' 접두 값을 그대로 돌려준다(db/05_local_account_seed.sql).
 * local 프로필 + VS_PII_CIPHER=plain 일 때만 등록. 실제 구현체는 복지몰 암호화 표준(A26)이 정해지면 붙인다.
 */
@Component
@LocalOnly
@Profile("local")
@ConditionalOnProperty(name = "vs.pii.cipher", havingValue = "plain")
public class PlainPiiCipher implements PiiCipher {

    private static final String PREFIX = "{plain}";

    @Override
    public String encrypt(String plain) {
        return plain == null ? null : PREFIX + plain;
    }

    @Override
    public String decrypt(String cipher) {
        if (cipher == null) {
            return null;
        }
        if (!cipher.startsWith(PREFIX)) {
            throw new IllegalStateException("로컬 평문 구현체는 '{plain}' 값만 다룹니다 — 실제 암호문이 섞여 있습니다.");
        }
        return cipher.substring(PREFIX.length());
    }
}
