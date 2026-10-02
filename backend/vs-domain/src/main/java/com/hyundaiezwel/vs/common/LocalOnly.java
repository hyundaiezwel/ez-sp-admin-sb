package com.hyundaiezwel.vs.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 로컬 프로필에서만 존재해야 하는 빈(가짜 본인인증·평문 암호화·local-verify API) 표식.
 * vs-api 의 LocalOnlyGuard 가 local 이 아닌 프로필에서 이 표식이 붙은 빈을 찾으면 기동을 실패시킨다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface LocalOnly {
}
