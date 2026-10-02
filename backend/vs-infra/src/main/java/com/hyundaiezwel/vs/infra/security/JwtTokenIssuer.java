package com.hyundaiezwel.vs.infra.security;

import com.hyundaiezwel.vs.auth.TokenClaims;
import com.hyundaiezwel.vs.auth.TokenIssuer;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Date;

/**
 * JWT(HMAC-SHA256). 서명키는 env VS_JWT_SIGNING_KEY 로만 받고, 32바이트 미만이면 기동을 막는다(H-PMS 와 같다).
 * exp 는 로그인 후 절대 상한(12시간) — 무활동 만료는 Redis TTL 이 맡는다.
 */
@Component
public class JwtTokenIssuer implements TokenIssuer {

    private static final int MIN_KEY_BYTES = 32;

    private final SecretKey key;
    private final Clock clock;

    public JwtTokenIssuer(@Value("${vs.jwt.signing-key}") String signingKey, Clock clock) {
        byte[] bytes = signingKey.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_KEY_BYTES) {
            throw new IllegalStateException("VS_JWT_SIGNING_KEY 는 %d바이트 이상이어야 합니다(현재 %d).".formatted(MIN_KEY_BYTES, bytes.length));
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.clock = clock;
    }

    @Override
    public String issue(TokenClaims c) {
        return Jwts.builder()
                .subject(c.sub())
                .claim("div", c.div())
                .claim("auth", c.auth())
                .claim("chnl", c.chnl())
                .claim("sid", c.sid())
                .issuedAt(Date.from(clock.instant()))
                .expiration(Date.from(c.exp()))
                .signWith(key)
                .compact();
    }

    @Override
    public TokenClaims parse(String token) {
        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(key).clock(() -> Date.from(clock.instant())).build()
                    .parseSignedClaims(token).getPayload();
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        String sid = claims.get("sid", String.class);
        if (claims.getSubject() == null || sid == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        return new TokenClaims(claims.getSubject(), claims.get("div", String.class), claims.get("auth", String.class),
                claims.get("chnl", String.class), sid, claims.getExpiration().toInstant());
    }
}
