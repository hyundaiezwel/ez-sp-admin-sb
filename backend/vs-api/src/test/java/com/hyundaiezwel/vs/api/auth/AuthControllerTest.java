package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.api.code.CodeController;
import com.hyundaiezwel.vs.auth.AuthPolicy;
import com.hyundaiezwel.vs.auth.AuthService;
import com.hyundaiezwel.vs.auth.AuthenticatedUser;
import com.hyundaiezwel.vs.code.CodeReader;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;
import java.time.Period;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** /api/auth 슬라이스 — 응답 봉투·HTTP 상태·인증 강제(인터셉터)·비밀번호 변경 강제·세션 조회 무연장. */
@WebMvcTest(controllers = {AuthController.class, CodeController.class})
@Import({SecurityConfig.class, AuthControllerTest.PolicyConfig.class})
class AuthControllerTest {

    @TestConfiguration
    static class PolicyConfig {
        @Bean
        AuthPolicy authPolicy() {
            return new AuthPolicy(Duration.ofMinutes(30), Duration.ofHours(12), Duration.ofMinutes(5), Period.ofMonths(6),
                    "http://localhost:5320", "http://comp.test:5321");
        }
    }

    private static final Instant ABS = Instant.parse("2026-10-02T13:00:00Z");
    private static final AuthenticatedUser USER = new AuthenticatedUser("kto.am", "KTO", "AM", "ADMIN", "sid-1", ABS, false);
    private static final AuthenticatedUser TMP_USER = new AuthenticatedUser("test.tmp", "KTO", "AS", "ADMIN", "sid-2", ABS, true);

    @Autowired
    MockMvc mvc;

    @MockitoBean
    AuthService authService;

    @MockitoBean
    CodeReader codeReader;

    @Test
    void 로그인_성공은_봉투에_challenge를_싣는다() throws Exception {
        when(authService.login(eq("kto.am"), eq("pw"), eq("ADMIN"), any()))
                .thenReturn(new AuthService.LoginStart("c-1", "010-****-0001", Instant.parse("2026-10-02T01:05:00Z")));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"kto.am\",\"password\":\"pw\",\"channel\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.challengeId").value("c-1"))
                .andExpect(jsonPath("$.data.maskedMobile").value("010-****-0001"))
                .andExpect(jsonPath("$.data.expiresAt").value("2026-10-02T01:05:00Z"))
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void 입력오류는_400과_필드() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"kto.am\",\"password\":\"pw\",\"channel\":\"ROOT\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.error.fields.channel").exists());
    }

    @Test
    void 잠금은_401과_코드() throws Exception {
        when(authService.login(anyString(), anyString(), anyString(), any())).thenThrow(new BusinessException(ErrorCode.AUTH_LOCKED));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"test.lock\",\"password\":\"pw\",\"channel\":\"ADMIN\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTH_LOCKED"))
                .andExpect(jsonPath("$.error.message").value(ErrorCode.AUTH_LOCKED.getDefaultMessage()));
    }

    @Test
    void 채널불일치는_403과_data_redirectUrl() throws Exception {
        when(authService.login(anyString(), anyString(), anyString(), any())).thenThrow(new BusinessException(
                ErrorCode.AUTH_CHANNEL_DENIED, "m", null, Map.of("redirectUrl", "http://comp.test:5321")));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"comp.cm\",\"password\":\"pw\",\"channel\":\"ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("AUTH_CHANNEL_DENIED"))
                .andExpect(jsonPath("$.data.redirectUrl").value("http://comp.test:5321"));
    }

    @Test
    void 토큰없이_보호API를_부르면_401() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTH_UNAUTHENTICATED"));
        verify(authService, never()).me(any());
    }

    @Test
    void 다른곳에서_로그인되면_401_REPLACED() throws Exception {
        when(authService.authenticate("tok", true)).thenThrow(new BusinessException(ErrorCode.AUTH_SESSION_REPLACED));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer tok"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTH_SESSION_REPLACED"))
                .andExpect(jsonPath("$.error.message").value("다른 곳에서 로그인되어 종료되었습니다."));
    }

    @Test
    void 세션저장소_장애는_503() throws Exception {
        when(authService.authenticate("tok", true)).thenThrow(new BusinessException(ErrorCode.AUTH_SESSION_STORE_UNAVAILABLE));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer tok"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("AUTH_SESSION_STORE_UNAVAILABLE"));
    }

    @Test
    void 내정보() throws Exception {
        when(authService.authenticate("tok", true)).thenReturn(USER);
        when(authService.me(USER)).thenReturn(new AuthService.Me("kto.am", "공사마스터", "KTO", "AM", "팀", "팀장", null, false));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer tok"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("공사마스터"));
    }

    @Test
    void 세션조회는_TTL을_되돌리지_않는다() throws Exception {
        when(authService.authenticate("tok", false)).thenReturn(USER);
        when(authService.session(USER)).thenReturn(new AuthService.SessionInfo(Instant.parse("2026-10-02T01:30:00Z"), ABS, 300));
        mvc.perform(get("/api/auth/session").header("Authorization", "Bearer tok"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.warnBeforeSec").value(300));
        verify(authService).authenticate("tok", false);
        verify(authService, never()).authenticate("tok", true);
    }

    @Test
    void 임시비밀번호_상태는_허용경로_외_403() throws Exception {
        when(authService.authenticate("tok", true)).thenReturn(TMP_USER);
        when(codeReader.findByGroups(List.of("AUTH"))).thenReturn(List.of());
        mvc.perform(get("/api/codes").param("groups", "AUTH").header("Authorization", "Bearer tok"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("AUTH_PASSWORD_CHANGE_REQUIRED"));
        when(authService.me(TMP_USER)).thenReturn(new AuthService.Me("test.tmp", "임시비번", "KTO", "AS", null, null, null, true));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer tok"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mustChangePassword").value(true));
    }

    @Test
    void 공통코드는_요청한_그룹순으로_묶는다() throws Exception {
        when(authService.authenticate("tok", true)).thenReturn(USER);
        when(codeReader.findByGroups(List.of("MNGR_DIV", "AUTH"))).thenReturn(List.of(
                new com.hyundaiezwel.vs.code.Code("AUTH", "AM", "지원기관 마스터", 1, "KTO", null, null),
                new com.hyundaiezwel.vs.code.Code("MNGR_DIV", "KTO", "한국관광공사", 1, null, null, null)));
        mvc.perform(get("/api/codes").param("groups", "MNGR_DIV,AUTH").header("Authorization", "Bearer tok"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.MNGR_DIV[0].cd").value("KTO"))
                .andExpect(jsonPath("$.data.AUTH[0].cdNm").value("지원기관 마스터"));
    }

    @Test
    void 로그아웃은_토큰을_서비스에_넘기고_빈객체() throws Exception {
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer tok")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"IDLE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        verify(authService).logout(eq("tok"), eq("IDLE"), any());
    }

    @Test
    void 본인인증_콜백은_설정된_origin에만_postMessage한다() throws Exception {
        String cid = "0f8fad5b-d9cb-469f-a165-70867728950e";
        mvc.perform(post("/api/auth/identity/callback").param("challengeId", cid).param("enc", "x"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("\"vs-identity\"")))
                .andExpect(content().string(containsString(cid)))
                .andExpect(content().string(containsString("\"http://localhost:5320\"")))
                .andExpect(content().string(containsString("\"http://comp.test:5321\"")));
    }
}
