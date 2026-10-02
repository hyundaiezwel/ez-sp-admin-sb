package com.hyundaiezwel.vs.api.auth;

import com.hyundaiezwel.vs.auth.AuthenticatedUser;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** {@link LoginUser} 파라미터에 AuthInterceptor 가 담아 둔 사용자를 넣는다. 없으면(배선 실수) 401 로 막는다. */
public class LoginUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(LoginUser.class)
                && AuthenticatedUser.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Object user = webRequest.getAttribute(AuthInterceptor.ATTR_USER, RequestAttributes.SCOPE_REQUEST);
        if (user == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        return user;
    }
}
