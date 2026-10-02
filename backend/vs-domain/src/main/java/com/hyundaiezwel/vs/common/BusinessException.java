package com.hyundaiezwel.vs.common;

import java.util.Map;

/**
 * 업무 예외. 응답 봉투의 error.code·message·fields 와 (필요하면) data 로 그대로 나간다.
 * fields — 화면이 쓸 부가값(예: 본인인증 남은 횟수 {@code remaining}). data — 실패에도 화면이 써야 할 값
 * (예: 채널 불일치 {@code redirectUrl}).
 */
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Map<String, Object> fields;
    private final Map<String, Object> data;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, errorCode.getDefaultMessage(), null, null);
    }

    public BusinessException(ErrorCode errorCode, String message) {
        this(errorCode, message, null, null);
    }

    public BusinessException(ErrorCode errorCode, String message, Map<String, Object> fields, Map<String, Object> data) {
        super(message);
        this.errorCode = errorCode;
        this.fields = fields;
        this.data = data;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public Map<String, Object> getFields() {
        return fields;
    }

    public Map<String, Object> getData() {
        return data;
    }
}
