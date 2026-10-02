package com.hyundaiezwel.vs.api.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hyundaiezwel.vs.api.common.ApiResponse;
import com.hyundaiezwel.vs.auth.AuthPolicy;
import com.hyundaiezwel.vs.auth.AuthService;
import com.hyundaiezwel.vs.auth.AuthenticatedUser;
import com.hyundaiezwel.vs.auth.ClientInfo;
import com.hyundaiezwel.vs.auth.IdentityVerifier.IdentityStart;
import com.hyundaiezwel.vs.common.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * /api/auth — docs/dev/login.md 9절. 판정은 전부 AuthService 에 있고 여기서는 요청·응답 모양만 맞춘다.
 * 로그인 전 API(/login, /identity/*)와 /logout 은 @PublicApi, 나머지는 @LoginUser(AuthInterceptor 가 세션 대조).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final java.util.regex.Pattern UUID_PATTERN =
            java.util.regex.Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");

    public record LoginRequest(@NotBlank @Size(max = 42) String loginId,
                               @NotBlank @Size(max = 128) String password,
                               @NotBlank @Pattern(regexp = "ADMIN|COMP") String channel) {
    }

    public record ChallengeRequest(@NotBlank @Size(max = 64) String challengeId) {
    }

    public record LogoutRequest(String reason) {
    }

    public record PasswordRequest(@NotBlank @Size(max = 128) String currentPassword,
                                  @NotBlank @Size(max = 128) String newPassword) {
    }

    /** txId 는 서버 안에서만 쓴다 — 화면에 돌려주지 않는다. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record IdentityStartResponse(String mode, String popupUrl, Map<String, String> form) {
    }

    private final AuthService authService;
    private final AuthPolicy policy;
    private final ObjectMapper objectMapper;

    public AuthController(AuthService authService, AuthPolicy policy, ObjectMapper objectMapper) {
        this.authService = authService;
        this.policy = policy;
        this.objectMapper = objectMapper;
    }

    @PublicApi(reason = "로그인 1차 인증 — 토큰 발급 전")
    @PostMapping("/login")
    public ApiResponse<AuthService.LoginStart> login(@Valid @RequestBody LoginRequest req, ClientInfo client) {
        return ApiResponse.ok(authService.login(req.loginId(), req.password(), req.channel(), client));
    }

    @PublicApi(reason = "본인인증 시작 — 1차 통과 challenge 로만 동작, 세션 발급 전")
    @PostMapping("/identity/start")
    public ApiResponse<IdentityStartResponse> startIdentity(@Valid @RequestBody ChallengeRequest req) {
        String returnUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/auth/identity/callback").queryParam("challengeId", req.challengeId()).toUriString();
        IdentityStart s = authService.startIdentity(req.challengeId(), returnUrl);
        return ApiResponse.ok(new IdentityStartResponse(s.mode(), s.popupUrl(), s.form()));
    }

    /**
     * PASS 가 팝업 안에서 보내는 결과. 결과 페이지가 부모 창에 postMessage 후 닫힌다.
     * 대상 origin 은 설정된 화면 주소(VS_ADMIN_URL·VS_COMP_URL)뿐이다 — '*' 로 보내지 않는다.
     */
    @PublicApi(reason = "본인인증 업체 콜백 — 팝업에서 호출되어 토큰이 없다")
    @PostMapping(value = "/identity/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> identityCallback(@RequestParam Map<String, String> params, ClientInfo client) {
        String challengeId = params.get("challengeId");
        boolean ok;
        try {
            authService.verifyIdentity(challengeId, params, client);
            ok = true;
        } catch (BusinessException e) {
            ok = false;
        }
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(callbackHtml(challengeId, ok));
    }

    @PublicApi(reason = "본인인증 완료 → 세션·토큰 발급. challenge 가 VERIFIED 일 때만 동작")
    @PostMapping("/identity/complete")
    public ApiResponse<AuthService.LoginResult> completeIdentity(@Valid @RequestBody ChallengeRequest req, ClientInfo client) {
        return ApiResponse.ok(authService.completeIdentity(req.challengeId(), client));
    }

    @PublicApi(reason = "세션이 이미 만료된 뒤(IDLE)에도 로그아웃 이력을 받아야 한다. 토큰 서명은 서비스가 확인한다")
    @PostMapping("/logout")
    public ApiResponse<Map<String, Object>> logout(@RequestBody(required = false) LogoutRequest req,
                                                   HttpServletRequest request, ClientInfo client) {
        authService.logout(AuthInterceptor.bearerToken(request), req == null ? null : req.reason(), client);
        return ApiResponse.ok(Map.of());
    }

    @GetMapping("/me")
    public ApiResponse<AuthService.Me> me(@LoginUser AuthenticatedUser user) {
        return ApiResponse.ok(authService.me(user));
    }

    /** 화면 타이머용 — 세션 TTL 을 되돌리지 않는다(AuthInterceptor 가 이 경로만 touch 하지 않는다). */
    @GetMapping("/session")
    public ApiResponse<AuthService.SessionInfo> session(@LoginUser AuthenticatedUser user) {
        return ApiResponse.ok(authService.session(user));
    }

    @PostMapping("/session/extend")
    public ApiResponse<Map<String, Instant>> extend(@LoginUser AuthenticatedUser user, ClientInfo client) {
        return ApiResponse.ok(Map.of("expiresAt", authService.extend(user, client)));
    }

    @PutMapping("/password")
    public ApiResponse<Map<String, Object>> changePassword(@LoginUser AuthenticatedUser user,
                                                           @Valid @RequestBody PasswordRequest req, ClientInfo client) {
        authService.changePassword(user, req.currentPassword(), req.newPassword(), client);
        return ApiResponse.ok(Map.of());
    }

    private String callbackHtml(String challengeId, boolean ok) {
        Set<String> origins = new LinkedHashSet<>();
        for (String url : List.of(policy.adminUrl(), policy.compUrl())) {
            String origin = originOf(url);
            if (origin != null) {
                origins.add(origin);
            }
        }
        String safeId = challengeId != null && UUID_PATTERN.matcher(challengeId).matches() ? challengeId : null;
        String message;
        String targets;
        try {
            message = objectMapper.writeValueAsString(Map.of("type", "vs-identity", "challengeId", safeId == null ? "" : safeId, "ok", ok));
            targets = objectMapper.writeValueAsString(origins);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        return """
                <!doctype html><html lang="ko"><head><meta charset="utf-8"><title>본인인증</title></head><body>
                <p>본인인증 결과를 전달하고 있습니다. 창이 닫히지 않으면 직접 닫아 주세요.</p>
                <script>(function(){var m=%s;var t=%s;if(window.opener){t.forEach(function(o){try{window.opener.postMessage(m,o);}catch(e){}});}window.close();})();</script>
                </body></html>
                """.formatted(message, targets);
    }

    private static String originOf(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        try {
            URI u = URI.create(url.trim());
            if (u.getScheme() == null || u.getHost() == null) {
                return null;
            }
            return u.getScheme() + "://" + u.getHost() + (u.getPort() == -1 ? "" : ":" + u.getPort());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
