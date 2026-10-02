package com.hyundaiezwel.vs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * 노동자 휴가지원사업 관리자 API.
 * 루트 패키지(com.hyundaiezwel.vs)에 두어 vs-domain·vs-infra 의 빈과 @Mapper 를 한 번에 스캔한다.
 * UserDetailsService 자동 구성은 끈다 — 로그인은 AuthService 가 하고, 기본 사용자·생성 비밀번호 로그를 만들지 않는다.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class VsApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(VsApiApplication.class, args);
    }
}
