package com.hyundaiezwel.vs.infra.redis;

import com.hyundaiezwel.vs.auth.Challenge;
import com.hyundaiezwel.vs.auth.Session;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 실제 Redis 7 위에서 키 모양·TTL·만료 뒤 갱신 금지·장애 시 503 을 본다. Docker 가 없으면 건너뛴다.
 */
@Testcontainers(disabledWithoutDocker = true)
class RedisAuthStoreIT {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7").withExposedPorts(6379);

    private static LettuceConnectionFactory factory;
    private static StringRedisTemplate redis;
    private static RedisAuthStore store;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379)));
        factory.afterPropertiesSet();
        redis = new StringRedisTemplate(factory);
        store = new RedisAuthStore(redis, "vs:");
    }

    @AfterAll
    static void close() {
        factory.destroy();
    }

    @Test
    void 세션을_쓰고_읽고_TTL을_되돌린다() {
        Instant issued = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        Session s = new Session("kto.am", "sid-1", "ADMIN", "KTO", "AM", issued, issued.plus(Duration.ofHours(12)),
                "127.0.0.1", null, true);
        store.save(s, Duration.ofSeconds(100));

        assertThat(redis.type("vs:sess:kto.am").code()).isEqualTo("hash");
        assertThat(store.find("kto.am")).isEqualTo(new Session("kto.am", "sid-1", "ADMIN", "KTO", "AM", issued,
                issued.plus(Duration.ofHours(12)), "127.0.0.1", "", true));
        assertThat(store.ttl("kto.am")).isBetween(Duration.ofSeconds(90), Duration.ofSeconds(100));

        redis.expire("vs:sess:kto.am", Duration.ofSeconds(10));
        store.touch("kto.am", Duration.ofSeconds(100));
        assertThat(store.ttl("kto.am")).isGreaterThan(Duration.ofSeconds(90));

        store.updateMustChangePassword("kto.am", false);
        assertThat(store.find("kto.am").mustChangePassword()).isFalse();
        assertThat(store.ttl("kto.am")).isGreaterThan(Duration.ofSeconds(90)); // 플래그 변경이 TTL 을 지우지 않는다

        // 새 로그인은 덮어쓴다(필드 잔재 없음)
        store.save(new Session("kto.am", "sid-2", "ADMIN", "KTO", "AM", issued, issued, "10.0.0.1", "UA", false), Duration.ofSeconds(100));
        assertThat(store.find("kto.am").sid()).isEqualTo("sid-2");

        store.delete("kto.am");
        assertThat(store.find("kto.am")).isNull();
        assertThat(store.ttl("kto.am")).isNull();
    }

    @Test
    void 만료된_challenge는_갱신으로_되살아나지_않는다() throws InterruptedException {
        Challenge c = new Challenge("c-1", "kto.am", "ADMIN", Challenge.PENDING, 0, null);
        store.createChallenge(c, Duration.ofMillis(300));
        assertThat(store.findChallenge("c-1")).isEqualTo(c);
        assertThat(store.updateChallenge(c.withTxId("TX-1"))).isTrue();
        assertThat(store.findChallenge("c-1").txId()).isEqualTo("TX-1");

        Thread.sleep(600);
        assertThat(store.updateChallenge(c.verified())).isFalse();
        assertThat(redis.hasKey("vs:chal:c-1")).isFalse();
        assertThat(store.findChallenge("c-1")).isNull();
    }

    @Test
    void 끊긴_sid_표식() {
        store.markKicked("sid-old", "DUPLICATE", Duration.ofHours(12));
        assertThat(store.kickedReason("sid-old")).isEqualTo("DUPLICATE");
        assertThat(redis.getExpire("vs:kick:sid-old")).isGreaterThan(Duration.ofHours(11).toSeconds());
        assertThat(store.kickedReason("sid-none")).isNull();
    }

    @Test
    void Redis에_닿지_않으면_503() {
        LettuceConnectionFactory dead = new LettuceConnectionFactory(new RedisStandaloneConfiguration("127.0.0.1", 1),
                LettuceClientConfiguration.builder().commandTimeout(Duration.ofMillis(500)).build());
        dead.afterPropertiesSet();
        try {
            RedisAuthStore down = new RedisAuthStore(new StringRedisTemplate(dead), "vs:");
            assertThatThrownBy(() -> down.find("kto.am"))
                    .isInstanceOf(BusinessException.class)
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.AUTH_SESSION_STORE_UNAVAILABLE);
        } finally {
            dead.destroy();
        }
    }
}
