package com.hyundaiezwel.vs.api.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 는 기본 동작을 끄는 데만 쓴다(H-PMS 와 같은 방식) — STATELESS, CSRF·formLogin·httpBasic·logout 끔.
 * 필터체인은 전 경로 permitAll 이고 <b>인증 강제는 AuthInterceptor 가 한다</b>: @PublicApi 가 없는 핸들러는 세션이 없으면 막힌다.
 * CSRF 를 끄는 근거: 상태 변경 API 는 Authorization 헤더(Bearer)를 요구하고 쿠키 인증을 쓰지 않는다.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .logout(l -> l.disable())
                .authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .build();
    }
}
