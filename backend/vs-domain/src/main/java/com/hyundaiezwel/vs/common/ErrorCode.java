package com.hyundaiezwel.vs.common;

/**
 * 에러코드 단일 원천. HTTP 상태를 코드에 함께 둔다 — 같은 코드는 언제나 같은 상태로 나간다.
 * 도메인은 프레임워크 무의존이라 HttpStatus 대신 int 를 쓴다(변환은 vs-api GlobalExceptionHandler).
 * 문구는 SB 010P·020P·030P 기준(docs/dev/login.md 5·6·9절).
 */
public enum ErrorCode {
    VALIDATION_FAILED(400, "요청 값이 올바르지 않습니다."),
    ENDPOINT_NOT_FOUND(404, "요청한 경로를 찾을 수 없습니다."),
    CONFLICT(409, "다른 요청이 먼저 처리되었습니다. 다시 시도하세요."),
    INTERNAL_ERROR(500, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도하세요."),

    // 토큰이 없거나 서명이 틀린 요청. 세션 만료(AUTH_SESSION_EXPIRED)와 구분한다.
    AUTH_UNAUTHENTICATED(401, "로그인이 필요합니다."),

    // 1차 인증 — 판정 순서는 AuthService#login
    AUTH_INVALID_CREDENTIALS(401, "아이디 또는 비밀번호가 일치하지 않습니다."),
    AUTH_LOCKED(401, "계정이 잠겼습니다. 소속 마스터 담당자에게 잠금 해제를 요청하세요."),
    AUTH_STOPPED(401, "사용이 중지된 계정입니다."),
    AUTH_DORMANT(401, "6개월 이상 접속하지 않아 휴면 처리된 계정입니다. 소속 마스터 담당자에게 해제를 요청하세요."),
    AUTH_NOT_REGISTERED(401, "가입이 완료되지 않은 계정입니다."),
    AUTH_CHANNEL_DENIED(403, "기업 담당자는 기업 전용 화면에서 로그인하세요."),
    AUTH_IDENTITY_UNAVAILABLE(401, "본인인증에 필요한 휴대폰 번호가 등록되지 않았습니다. 소속 마스터 담당자에게 문의하세요."),

    // 2차 인증(본인인증)
    AUTH_CHALLENGE_EXPIRED(401, "본인인증 시간이 지났습니다. 처음부터 다시 로그인하세요."),
    AUTH_IDENTITY_PROVIDER_ERROR(503, "본인인증 서비스에 연결할 수 없습니다. 잠시 후 다시 시도하세요."),
    AUTH_IDENTITY_MISMATCH(401, "본인인증 정보가 계정 정보와 일치하지 않습니다."),
    AUTH_IDENTITY_TOO_MANY_ATTEMPTS(401, "본인인증을 5회 실패했습니다. 처음부터 다시 로그인하세요."),
    AUTH_IDENTITY_NOT_VERIFIED(401, "본인인증을 먼저 완료하세요."),

    // 세션
    AUTH_SESSION_EXPIRED(401, "로그인 세션이 만료되었습니다. 다시 로그인하세요."),
    AUTH_SESSION_REPLACED(401, "다른 곳에서 로그인되어 종료되었습니다."),
    AUTH_SESSION_STORE_UNAVAILABLE(503, "로그인 세션을 확인할 수 없습니다. 잠시 후 다시 시도하세요."),

    // 비밀번호
    AUTH_PASSWORD_CHANGE_REQUIRED(403, "비밀번호를 변경해야 이용할 수 있습니다."),
    AUTH_PASSWORD_POLICY(400, "비밀번호는 영문 대·소문자, 숫자, 특수문자 중 2종 10자 이상 또는 3종 8자 이상이어야 하며 아이디와 같을 수 없습니다."),
    AUTH_PASSWORD_REUSED(400, "현재 또는 직전에 사용한 비밀번호는 다시 쓸 수 없습니다.");

    private final int httpStatus;
    private final String defaultMessage;

    ErrorCode(int httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
