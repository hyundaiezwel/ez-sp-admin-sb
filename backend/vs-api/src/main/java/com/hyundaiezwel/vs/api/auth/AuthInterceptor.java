package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.auth.AuthService;
import com.hyundaiezwel.vs.auth.AuthenticatedUser;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/**
 * 인증 강제 — @PublicApi 가 없는 모든 /api 핸들러는 여기서 세션을 대조한다(기본이 막힘, fail-closed).
 * <ol>
 *   <li>Bearer 토큰 → AuthService#authenticate (JWT 서명·만료 → Redis sid 대조 → TTL 되돌림)</li>
 *   <li>GET /api/auth/session 만 TTL 을 되돌리지 않는다(화면 타이머가 세션을 늘리지 않게)</li>
 *   <li>임시비밀번호 상태면 아래 경로 외에는 403 AUTH_PASSWORD_CHANGE_REQUIRED</li>
 * </ol>
 * preHandle 에서 던진 예외는 GlobalExceptionHandler 가 응답 봉투로 바꾼다.
 */
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USER = AuthInterceptor.class.getName() + ".USER";
    private static final String SESSION_PATH = "/api/auth/session";
    /** 비밀번호 변경 강제 상태에서도 열어 두는 경로 — 여기에 업무 API 를 넣으면 그만큼 강제에 구멍이 난다. */
    private static final Set<String> PASSWORD_CHANGE_ALLOWED = Set.of(
            "/api/auth/password", "/api/auth/logout", "/api/auth/me", SESSION_PATH, "/api/auth/session/extend");

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod hm)) {
            return true;
        }
        if (hm.hasMethodAnnotation(PublicApi.class) || hm.getBeanType().isAnnotationPresent(PublicApi.class)) {
            return true;
        }
        String token = bearerToken(request);
        if (token == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        String uri = request.getRequestURI();
        boolean touch = !("GET".equals(request.getMethod()) && SESSION_PATH.equals(uri));
        AuthenticatedUser user = authService.authenticate(token, touch);
        if (user.mustChangePassword() && !PASSWORD_CHANGE_ALLOWED.contains(uri)) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_CHANGE_REQUIRED);
        }
        request.setAttribute(ATTR_USER, user);
        return true;
    }

    /** Authorization: Bearer 값. 없으면 null. */
    public static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        String token = header.substring("Bearer ".length()).trim();
        return token.isEmpty() ? null : token;
    }
}
