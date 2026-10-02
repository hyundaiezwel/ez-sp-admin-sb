package com.hyundaiezwel.vs.auth;

import java.time.Duration;

/**
 * challenge 저장소 포트(Redis chal:{challengeId}).
 * 메서드 이름에 Challenge 를 붙인 이유: Redis 구현체가 SessionStore 와 함께 구현해 find·delete 시그니처가 겹친다.
 */
public interface ChallengeStore {

    void createChallenge(Challenge challenge, Duration ttl);

    Challenge findChallenge(String challengeId);

    /** 키가 아직 있을 때만 갱신한다(TTL 유지). 이미 만료됐으면 false — 만료된 challenge 를 되살리지 않는다. */
    boolean updateChallenge(Challenge challenge);

    void deleteChallenge(String challengeId);
}
