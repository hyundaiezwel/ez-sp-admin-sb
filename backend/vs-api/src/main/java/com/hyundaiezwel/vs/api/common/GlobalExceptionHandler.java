package com.hyundaiezwel.vs.api.common;

import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/** 모든 예외를 응답 봉투로 바꾼다. 인터셉터(AuthInterceptor)에서 던진 업무 예외도 여기로 온다. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleBusiness(BusinessException ex) {
        log.info("errorCode={} message={}", ex.getErrorCode().name(), ex.getMessage());
        return respond(ex.getErrorCode(), ex.getMessage(), ex.getFields(), ex.getData());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> fields.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        return respond(ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getDefaultMessage(), fields, null);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            HttpRequestMethodNotSupportedException.class})
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleBadRequest(Exception ex) {
        log.info("errorCode={} message={}", ErrorCode.VALIDATION_FAILED.name(), ex.getMessage());
        return respond(ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getDefaultMessage(), null, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleNotFound(NoResourceFoundException ex) {
        return respond(ErrorCode.ENDPOINT_NOT_FOUND, ErrorCode.ENDPOINT_NOT_FOUND.getDefaultMessage(), null, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleUnexpected(Exception ex) {
        log.error("처리하지 못한 예외", ex);
        return respond(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.getDefaultMessage(), null, null);
    }

    private static ResponseEntity<ApiResponse<Map<String, Object>>> respond(ErrorCode code, String message,
                                                                         Map<String, Object> fields, Map<String, Object> data) {
        return ResponseEntity.status(code.getHttpStatus()).body(ApiResponse.fail(code, message, fields, data));
    }
}
