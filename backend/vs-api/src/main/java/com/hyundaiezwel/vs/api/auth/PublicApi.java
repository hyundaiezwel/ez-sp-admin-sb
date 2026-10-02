package com.hyundaiezwel.vs.api.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 로그인 없이 부를 수 있는 API 라는 선언. 이 표식이 없는 핸들러는 AuthInterceptor 가 세션을 요구한다.
 * 사유를 필수로 둔 것은 무심코 붙이지 못하게 하려는 것이다 — 붙이는 순간 토큰 없는 외부 호출에 열린다.
 * ControllerAuthorizationArchTest 가 모든 핸들러에 이것 또는 @LoginUser 파라미터가 있는지 본다.
 */
@Documented
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PublicApi {

    /** 로그인 없이 공개하는 사유. */
    String reason();
}
