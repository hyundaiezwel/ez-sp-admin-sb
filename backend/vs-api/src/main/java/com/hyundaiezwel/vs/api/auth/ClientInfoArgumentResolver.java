package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.auth.ClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * {@link ClientInfo} 파라미터에 요청자 IP·User-Agent 를 넣는다(세션·이력용).
 * IP 는 remoteAddr 그대로다 — 운영에서 ALB 뒤에 두면 server.forward-headers-strategy 로 실제 IP 를 받게 바꾼다.
 */
public class ClientInfoArgumentResolver implements HandlerMethodArgumentResolver {

    private static final int UA_MAX = 500;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return ClientInfo.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        String ua = request.getHeader("User-Agent");
        if (ua != null && ua.length() > UA_MAX) {
            ua = ua.substring(0, UA_MAX);
        }
        return new ClientInfo(request.getRemoteAddr(), ua);
    }
}
