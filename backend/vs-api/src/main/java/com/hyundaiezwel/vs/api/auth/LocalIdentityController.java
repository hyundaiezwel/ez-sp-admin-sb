package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.api.common.ApiResponse;
import com.hyundaiezwel.vs.auth.AuthService;
import com.hyundaiezwel.vs.auth.ClientInfo;
import com.hyundaiezwel.vs.common.LocalOnly;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 로컬 가짜 본인인증 입력 — PASS 팝업 대신 화면이 이름·생년월일·휴대폰을 보낸다.
 * local 프로필 + VS_IDENTITY_VERIFIER=local 에서만 등록된다(LocalOnlyGuard 가 다른 프로필에서 잡으면 기동 실패).
 */
@RestController
@LocalOnly
@Profile("local")
@ConditionalOnProperty(name = "vs.identity.verifier", havingValue = "local")
public class LocalIdentityController {

    public record LocalVerifyRequest(@NotBlank @Size(max = 64) String challengeId,
                                     @NotBlank @Size(max = 100) String name,
                                     @NotBlank @Size(max = 10) String birth,
                                     @NotBlank @Size(max = 20) String mobile) {
    }

    private final AuthService authService;

    public LocalIdentityController(AuthService authService) {
        this.authService = authService;
    }

    @PublicApi(reason = "로컬 전용 가짜 본인인증 — 세션 발급 전 challenge 로만 동작")
    @PostMapping("/api/auth/identity/local-verify")
    public ApiResponse<Map<String, Boolean>> localVerify(@Valid @RequestBody LocalVerifyRequest req, ClientInfo client) {
        authService.verifyIdentity(req.challengeId(),
                Map.of("name", req.name(), "birth", req.birth(), "mobile", req.mobile()), client);
        return ApiResponse.ok(Map.of("verified", true));
    }
}
