package com.hyundaiezwel.vs.infra.redis;

import com.hyundaiezwel.vs.auth.Challenge;
import com.hyundaiezwel.vs.auth.ChallengeStore;
import com.hyundaiezwel.vs.auth.Session;
import com.hyundaiezwel.vs.auth.SessionStore;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * 세션·challenge·끊김 표식 Redis 저장소(docs/dev/login.md 6.1).
 * <ul>
 *   <li>{prefix}sess:{mngrId} — hash, 무활동 TTL sliding</li>
 *   <li>{prefix}kick:{sid} — 끊긴 사유, 12시간</li>
 *   <li>{prefix}chal:{challengeId} — hash, 5분</li>
 * </ul>
 * Redis 장애(연결 실패·타임아웃)는 전부 AUTH_SESSION_STORE_UNAVAILABLE(503)로 바꾼다 — 통과시키지 않는다(fail-closed).
 */
@Component
public class RedisAuthStore implements SessionStore, ChallengeStore {

    /** 지우고 → 쓰고 → TTL. 셋을 원자적으로 해야 TTL 없는 키가 남지 않는다. ARGV[1]=TTL(ms), 나머지=필드·값. */
    private static final DefaultRedisScript<Long> REPLACE_HASH = new DefaultRedisScript<>("""
            redis.call('del', KEYS[1])
            redis.call('hset', KEYS[1], unpack(ARGV, 2))
            redis.call('pexpire', KEYS[1], ARGV[1])
            return 1
            """, Long.class);

    /** 키가 있을 때만 필드 갱신(TTL 유지). 만료 직후 갱신이 TTL 없는 키를 되살리는 것을 막는다. */
    private static final DefaultRedisScript<Long> HSET_IF_EXISTS = new DefaultRedisScript<>("""
            if redis.call('exists', KEYS[1]) == 1 then
                redis.call('hset', KEYS[1], unpack(ARGV))
                return 1
            end
            return 0
            """, Long.class);

    private final StringRedisTemplate redis;
    private final String prefix;

    public RedisAuthStore(StringRedisTemplate redis, @Value("${vs.redis.key-prefix:vs:}") String prefix) {
        this.redis = redis;
        this.prefix = prefix;
    }

    // ------------------------------------------------------------------ 세션

    @Override
    public Session find(String mngrId) {
        Map<Object, Object> h = call(() -> redis.opsForHash().entries(sessKey(mngrId)));
        if (h == null || h.isEmpty()) {
            return null;
        }
        return new Session(mngrId, str(h, "sid"), str(h, "chnl"), str(h, "div"), str(h, "auth"),
                Instant.ofEpochMilli(Long.parseLong(str(h, "issuedAt"))),
                Instant.ofEpochMilli(Long.parseLong(str(h, "absExpAt"))),
                str(h, "ip"), str(h, "ua"), "Y".equals(str(h, "mustChg")));
    }

    @Override
    public void save(Session s, Duration idle) {
        replaceHash(sessKey(s.mngrId()), idle,
                "sid", s.sid(), "chnl", s.chnl(), "div", s.div(), "auth", s.auth(),
                "issuedAt", String.valueOf(s.issuedAt().toEpochMilli()),
                "absExpAt", String.valueOf(s.absExpAt().toEpochMilli()),
                "ip", s.ip(), "ua", s.ua(), "mustChg", s.mustChangePassword() ? "Y" : "N");
    }

    @Override
    public void touch(String mngrId, Duration idle) {
        call(() -> redis.expire(sessKey(mngrId), idle));
    }

    @Override
    public Duration ttl(String mngrId) {
        Long ms = call(() -> redis.getExpire(sessKey(mngrId), TimeUnit.MILLISECONDS));
        return ms == null || ms < 0 ? null : Duration.ofMillis(ms);
    }

    @Override
    public void delete(String mngrId) {
        call(() -> redis.delete(sessKey(mngrId)));
    }

    @Override
    public void updateMustChangePassword(String mngrId, boolean mustChange) {
        call(() -> redis.execute(HSET_IF_EXISTS, List.of(sessKey(mngrId)), "mustChg", mustChange ? "Y" : "N"));
    }

    @Override
    public void markKicked(String sid, String reason, Duration ttl) {
        call(() -> {
            redis.opsForValue().set(prefix + "kick:" + sid, reason, ttl);
            return null;
        });
    }

    @Override
    public String kickedReason(String sid) {
        return call(() -> redis.opsForValue().get(prefix + "kick:" + sid));
    }

    // ------------------------------------------------------------------ challenge

    @Override
    public void createChallenge(Challenge c, Duration ttl) {
        replaceHash(chalKey(c.challengeId()), ttl, challengeFields(c));
    }

    @Override
    public Challenge findChallenge(String challengeId) {
        Map<Object, Object> h = call(() -> redis.opsForHash().entries(chalKey(challengeId)));
        if (h == null || h.isEmpty()) {
            return null;
        }
        String txId = str(h, "txId");
        return new Challenge(challengeId, str(h, "mngrId"), str(h, "chnl"), str(h, "state"),
                Integer.parseInt(str(h, "failCnt")), txId.isEmpty() ? null : txId);
    }

    @Override
    public boolean updateChallenge(Challenge c) {
        Long r = call(() -> redis.execute(HSET_IF_EXISTS, List.of(chalKey(c.challengeId())), (Object[]) challengeFields(c)));
        return r != null && r == 1L;
    }

    @Override
    public void deleteChallenge(String challengeId) {
        call(() -> redis.delete(chalKey(challengeId)));
    }

    // ------------------------------------------------------------------ 내부

    private static String[] challengeFields(Challenge c) {
        return new String[]{"mngrId", c.mngrId(), "chnl", c.chnl(), "state", c.state(),
                "failCnt", String.valueOf(c.failCnt()), "txId", c.txId() == null ? "" : c.txId()};
    }

    private void replaceHash(String key, Duration ttl, String... fieldValues) {
        List<String> args = new ArrayList<>();
        args.add(String.valueOf(ttl.toMillis()));
        for (String v : fieldValues) {
            args.add(v == null ? "" : v);
        }
        call(() -> redis.execute(REPLACE_HASH, List.of(key), args.toArray()));
    }

    private String sessKey(String mngrId) {
        return prefix + "sess:" + mngrId;
    }

    private String chalKey(String challengeId) {
        return prefix + "chal:" + challengeId;
    }

    private static String str(Map<Object, Object> h, String field) {
        Object v = h.get(field);
        return v == null ? "" : v.toString();
    }

    private static <T> T call(Supplier<T> op) {
        try {
            return op.get();
        } catch (DataAccessException e) {
            throw new BusinessException(ErrorCode.AUTH_SESSION_STORE_UNAVAILABLE);
        }
    }
}
