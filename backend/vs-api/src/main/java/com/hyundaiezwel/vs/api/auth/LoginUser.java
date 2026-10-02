package com.hyundaiezwel.vs.api.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 현재 사용자({@link com.hyundaiezwel.vs.auth.AuthenticatedUser})를 넣는다.
 * 세션 대조는 AuthInterceptor 가 이미 끝냈다 — 리졸버는 그 결과를 꺼내기만 한다.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginUser {
}
