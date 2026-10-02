package com.hyundaiezwel.vs.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.hyundaiezwel.vs.common.ErrorCode;

import java.util.Map;

/**
 * 응답 봉투 — 성공 {@code {success:true, data}} / 실패 {@code {success:false, error:{code, message, fields}}}.
 * 실패에도 화면이 써야 할 값(채널 불일치의 redirectUrl)은 data 에 함께 싣는다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, T data, ApiError error) {

    public record ApiError(String code, String message, Map<String, Object> fields) {
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Map<String, Object>> fail(ErrorCode code, String message, Map<String, Object> fields,
                                                       Map<String, Object> data) {
        return new ApiResponse<>(false, data, new ApiError(code.name(), message, fields));
    }
}
