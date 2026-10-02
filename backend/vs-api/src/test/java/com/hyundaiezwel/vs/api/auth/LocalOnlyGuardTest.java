package com.hyundaiezwel.vs.api.auth;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalOnlyGuardTest {

    @Test
    void local_프로필이면_로컬빈을_허용한다() {
        assertThatCode(() -> LocalOnlyGuard.check(true, List.of("localIdentityVerifier"), "local", "plain")).doesNotThrowAnyException();
    }

    @Test
    void local이_아닌데_로컬빈이_잡히면_기동실패() {
        assertThatThrownBy(() -> LocalOnlyGuard.check(false, List.of("plainPiiCipher"), "pass", "standard"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void local이_아닌데_env가_local_plain이면_기동실패() {
        assertThatThrownBy(() -> LocalOnlyGuard.check(false, List.of(), "local", "standard")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> LocalOnlyGuard.check(false, List.of(), "pass", "plain")).isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> LocalOnlyGuard.check(false, List.of(), "pass", "standard")).doesNotThrowAnyException();
    }
}
