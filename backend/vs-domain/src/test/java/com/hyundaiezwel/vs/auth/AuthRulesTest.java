package com.hyundaiezwel.vs.auth;

import com.hyundaiezwel.vs.auth.IdentityVerifier.IdentityResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/** 비밀번호 규칙(8절)과 본인인증 대조(7절) — 순수 함수라 경계값을 표로 본다. */
class AuthRulesTest {

    @ParameterizedTest(name = "[{index}] {0} → {1}")
    @CsvSource({
            // 2종 10자 이상
            "abcdefghi1, true",
            "abcdefgh1, false",       // 2종 9자
            "abcdefghij, false",      // 1종
            // 3종 8자 이상
            "Abcdefg1, true",
            "Abcdef1, false",         // 3종 7자
            "abc!ef12, true",
            // 4종
            "Vs!Local2027, true",
            // 공백·한글은 허용하지 않는다
            "'Abcdef 12', false",
            "Abcdef가12, false",
    })
    void 비밀번호_규칙(String password, boolean expected) {
        assertThat(PasswordPolicy.isValid(password, "kto.am")).isEqualTo(expected);
    }

    @Test
    void 아이디와_같은_비밀번호는_안된다() {
        assertThat(PasswordPolicy.isValid("Kto.Am12345", "kto.am12345")).isFalse();
        assertThat(PasswordPolicy.isValid(null, "kto.am")).isFalse();
        assertThat(PasswordPolicy.isValid("A1!" + "a".repeat(62), "kto.am")).isFalse(); // 65자
    }

    private static final Mngr KTO_AM = new Mngr("kto.am", "KTO", "AM", "공사마스터", "19900101", "{plain}01000000001",
            null, null, null, null, "N", "USE", 0, null);

    @ParameterizedTest(name = "[{index}] {0}/{1}/{2} → {3}")
    @CsvSource({
            "공사마스터, 19900101, 01000000001, true",
            "' 공사마스터 ', 19900101, 010-0000-0001, true",
            "공사마스터, 1990-01-01, 010 0000 0001, true",
            "공사 마스터, 19900101, 01000000001, false",
            "공사마스터, 19900102, 01000000001, false",
            "공사마스터, 19900101, 01000000002, false",
            "'', 19900101, 01000000001, false",
    })
    void 본인인증_대조(String name, String birth, String mobile, boolean expected) {
        assertThat(IdentityMatcher.matches(KTO_AM, "01000000001", new IdentityResult(name, birth, mobile, "tx"))).isEqualTo(expected);
    }

    @Test
    void 계정쪽_값이_비어있으면_무엇을_넣어도_통과하지_않는다() {
        Mngr noBirth = new Mngr("x", "KTO", "AS", "이름", null, null, null, null, null, null, "N", "USE", 0, null);
        assertThat(IdentityMatcher.matches(noBirth, "01000000001", new IdentityResult("이름", "", "01000000001", "tx"))).isFalse();
        assertThat(IdentityMatcher.matches(KTO_AM, null, new IdentityResult("공사마스터", "19900101", "", "tx"))).isFalse();
    }

    @Test
    void 휴대폰_마스킹() {
        assertThat(AuthService.maskMobile("01000000001")).isEqualTo("010-****-0001");
        assertThat(AuthService.maskMobile("0101234567")).isEqualTo("010-***-4567");
    }
}
