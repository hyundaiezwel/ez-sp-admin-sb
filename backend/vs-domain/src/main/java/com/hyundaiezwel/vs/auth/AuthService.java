package com.hyundaiezwel.vs.auth;

import com.hyundaiezwel.vs.auth.IdentityVerifier.IdentityResult;
import com.hyundaiezwel.vs.auth.IdentityVerifier.IdentityStart;
import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import com.hyundaiezwel.vs.common.Times;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 관리자 로그인 — 1차 인증(ID·비밀번호) → 본인인증(PASS) → 세션 발급, 그리고 세션 유지·로그아웃·비밀번호 변경.
 * 판정·상태 변경은 전부 여기서만 한다(컨트롤러·매퍼에는 업무 분기를 두지 않는다). 기준: docs/dev/login.md.
 */
public class AuthService {

    public static final String CHNL_ADMIN = "ADMIN";
    public static final String CHNL_COMP = "COMP";
    public static final String LOGOUT_MANUAL = "MANUAL";
    public static final String LOGOUT_IDLE = "IDLE";
    public static final String LOGOUT_DUPLICATE = "DUPLICATE";
    public static final String LOGOUT_STOPPED = "STOPPED";
    private static final Set<String> LOGOUT_REASONS = Set.of(LOGOUT_MANUAL, LOGOUT_IDLE, LOGOUT_DUPLICATE, LOGOUT_STOPPED);
    /** vs_hist_h.tgt_key 는 varchar(40) 다(DB v3, mngr_id 는 42). 넘치면 잘라 넣고 전체 ID 는 dtl.loginId 에 둔다. */
    private static final int TGT_KEY_MAX = 40;

    public record LoginStart(String challengeId, String maskedMobile, Instant expiresAt) {
    }

    public record UserSummary(String mngrId, String name, String div, String auth) {
    }

    public record LoginResult(String accessToken, Instant expiresAt, Instant absoluteExpiresAt,
                              boolean mustChangePassword, UserSummary user) {
    }

    public record Me(String mngrId, String name, String div, String auth, String deptNm, String jbpsNm,
                     Instant lastLoginAt, boolean mustChangePassword) {
    }

    public record SessionInfo(Instant expiresAt, Instant absoluteExpiresAt, long warnBeforeSec) {
    }

    private final MngrRepository mngrs;
    private final HistWriter hists;
    private final SessionStore sessions;
    private final ChallengeStore challenges;
    private final IdentityVerifier verifier;
    private final PiiCipher cipher;
    private final PasswordHasher hasher;
    private final TokenIssuer tokens;
    private final AuthPolicy policy;
    private final Clock clock;

    public AuthService(MngrRepository mngrs, HistWriter hists, SessionStore sessions, ChallengeStore challenges,
                       IdentityVerifier verifier, PiiCipher cipher, PasswordHasher hasher, TokenIssuer tokens,
                       AuthPolicy policy, Clock clock) {
        this.mngrs = mngrs;
        this.hists = hists;
        this.sessions = sessions;
        this.challenges = challenges;
        this.verifier = verifier;
        this.cipher = cipher;
        this.hasher = hasher;
        this.tokens = tokens;
        this.policy = policy;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ 1차 인증

    /**
     * 판정 순서(5절) — 위에서부터 처음 걸리는 것으로 끝낸다.
     * 잠금은 비밀번호를 대조하지 않고 막고, 사용중지·휴면·미가입·채널·휴대폰 미등록은 비밀번호가 맞은 뒤에만 알려 준다.
     */
    public LoginStart login(String loginId, String password, String channel, ClientInfo client) {
        Instant now = clock.instant();
        Mngr m = mngrs.findById(loginId);

        // 1. ID 없음 — 더미 해시를 대조해 응답 시간을 맞춘다
        if (m == null) {
            hasher.matches(password, null);
            throw loginFail(loginId, ErrorCode.AUTH_INVALID_CREDENTIALS, channel, client, null, now);
        }
        // 2. 잠금
        if (Mngr.ST_LOCK.equals(m.acntStCd())) {
            throw loginFail(loginId, ErrorCode.AUTH_LOCKED, channel, client, m.failCnt(), now);
        }
        // 3. 비밀번호 불일치(비밀번호 없는 계정 포함) — +1, 5회째에 LOCK 이고 그 응답부터 AUTH_LOCKED
        if (!hasher.matches(password, m.pwdHash())) {
            int failCnt = m.failCnt() + 1;
            boolean lock = failCnt >= AuthPolicy.MAX_LOGIN_FAILURES;
            requireUpdated(mngrs.updateFailCntAndStatus(m, failCnt, lock ? Mngr.ST_LOCK : m.acntStCd(),
                    Hist.ANONYMOUS, Times.toDtm(now)));
            if (lock) {
                writeStatusHist(m.mngrId(), m.acntStCd(), Mngr.ST_LOCK, "LOGIN_FAIL_" + failCnt, client, Hist.ANONYMOUS, now);
            }
            throw loginFail(loginId, lock ? ErrorCode.AUTH_LOCKED : ErrorCode.AUTH_INVALID_CREDENTIALS,
                    channel, client, failCnt, now);
        }
        // 4. 사용중지
        if (Mngr.ST_STOP.equals(m.acntStCd())) {
            throw loginFail(loginId, ErrorCode.AUTH_STOPPED, channel, client, m.failCnt(), now);
        }
        // 5. 휴면 — 이미 DRMT 이거나, 사용 중인데 마지막 로그인이 기준 기간을 넘었으면 이때 DRMT 로 바꾼다
        if (Mngr.ST_DRMT.equals(m.acntStCd())) {
            throw loginFail(loginId, ErrorCode.AUTH_DORMANT, channel, client, m.failCnt(), now);
        }
        if (Mngr.ST_USE.equals(m.acntStCd()) && dormantExpired(m, now)) {
            requireUpdated(mngrs.updateFailCntAndStatus(m, m.failCnt(), Mngr.ST_DRMT, Hist.ANONYMOUS, Times.toDtm(now)));
            writeStatusHist(m.mngrId(), m.acntStCd(), Mngr.ST_DRMT, "DORMANT_" + policy.dormantAfter(), client, Hist.ANONYMOUS, now);
            throw loginFail(loginId, ErrorCode.AUTH_DORMANT, channel, client, m.failCnt(), now);
        }
        // 6. 미가입(UNRG) — 알 수 없는 상태값도 여기서 막는다(사용 상태만 통과)
        if (!Mngr.ST_USE.equals(m.acntStCd())) {
            throw loginFail(loginId, ErrorCode.AUTH_NOT_REGISTERED, channel, client, m.failCnt(), now);
        }
        // 7. 채널 불일치 — ADMIN 은 KTO·EZW, COMP 는 COMP 만
        boolean compAccount = "COMP".equals(m.mngrDivCd());
        if (compAccount != CHNL_COMP.equals(channel)) {
            hists.write(loginFailHist(loginId, ErrorCode.AUTH_CHANNEL_DENIED, channel, client, m.failCnt(), now));
            String message = compAccount ? ErrorCode.AUTH_CHANNEL_DENIED.getDefaultMessage()
                    : "공사·운영사 계정은 업무 화면에서 로그인하세요.";
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("redirectUrl", compAccount ? policy.compUrl() : policy.adminUrl());
            throw new BusinessException(ErrorCode.AUTH_CHANNEL_DENIED, message, null, data);
        }
        // 8. 휴대폰 미등록 — 본인인증을 할 수 없다
        String mobile = m.mblTelnoEnc() == null || m.mblTelnoEnc().isBlank() ? "" : IdentityMatcher.digits(cipher.decrypt(m.mblTelnoEnc()));
        if (mobile.isEmpty()) {
            throw loginFail(loginId, ErrorCode.AUTH_IDENTITY_UNAVAILABLE, channel, client, m.failCnt(), now);
        }
        // 9. 통과 — 세션이 아니라 challenge 하나만 만든다
        Challenge challenge = new Challenge(UUID.randomUUID().toString(), m.mngrId(), channel, Challenge.PENDING, 0, null);
        challenges.createChallenge(challenge, AuthPolicy.CHALLENGE_TTL);
        return new LoginStart(challenge.challengeId(), maskMobile(mobile), now.plus(AuthPolicy.CHALLENGE_TTL));
    }

    // ------------------------------------------------------------------ 본인인증

    public IdentityStart startIdentity(String challengeId, String returnUrl) {
        Challenge ch = requireChallenge(challengeId);
        IdentityStart start = callProvider(() -> verifier.start(challengeId, returnUrl));
        if (!challenges.updateChallenge(ch.withTxId(start.txId()))) {
            throw new BusinessException(ErrorCode.AUTH_CHALLENGE_EXPIRED);
        }
        return start;
    }

    /**
     * PASS 콜백(운영)·로컬 입력(local-verify) 공통. 결과의 txId 가 challenge 의 txId 와 다르면 불일치로 센다
     * (다른 사람 인증 결과 끼워 넣기 방지). PASS 결과는 대조에만 쓰고 저장하지 않는다.
     */
    public void verifyIdentity(String challengeId, Map<String, String> callbackParams, ClientInfo client) {
        Instant now = clock.instant();
        Challenge ch = requireChallenge(challengeId);
        if (Challenge.VERIFIED.equals(ch.state())) {
            return;
        }
        if (ch.txId() == null) {
            throw new BusinessException(ErrorCode.AUTH_IDENTITY_NOT_VERIFIED, "본인인증을 먼저 시작하세요.");
        }
        Map<String, String> params = new HashMap<>(callbackParams);
        params.put(IdentityVerifier.CHALLENGE_TX_ID, ch.txId());
        IdentityResult result = callProvider(() -> verifier.complete(params));

        Mngr m = mngrs.findById(ch.mngrId());
        if (m == null) {
            challenges.deleteChallenge(challengeId);
            throw new BusinessException(ErrorCode.AUTH_CHALLENGE_EXPIRED);
        }
        boolean paired = result != null && ch.txId().equals(result.txId());
        String mobile = m.mblTelnoEnc() == null ? null : cipher.decrypt(m.mblTelnoEnc());
        if (paired && IdentityMatcher.matches(m, mobile, result)) {
            if (!challenges.updateChallenge(ch.verified())) {
                throw new BusinessException(ErrorCode.AUTH_CHALLENGE_EXPIRED);
            }
            return;
        }

        int failCnt = ch.failCnt() + 1;
        if (failCnt >= AuthPolicy.MAX_IDENTITY_FAILURES) {
            challenges.deleteChallenge(challengeId);
            hists.write(identityHist(ch, ErrorCode.AUTH_IDENTITY_TOO_MANY_ATTEMPTS, client, now));
            throw new BusinessException(ErrorCode.AUTH_IDENTITY_TOO_MANY_ATTEMPTS);
        }
        if (!challenges.updateChallenge(ch.withFailCnt(failCnt))) {
            throw new BusinessException(ErrorCode.AUTH_CHALLENGE_EXPIRED);
        }
        hists.write(identityHist(ch, ErrorCode.AUTH_IDENTITY_MISMATCH, client, now));
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("remaining", AuthPolicy.MAX_IDENTITY_FAILURES - failCnt);
        throw new BusinessException(ErrorCode.AUTH_IDENTITY_MISMATCH, ErrorCode.AUTH_IDENTITY_MISMATCH.getDefaultMessage(), fields, null);
    }

    /** 본인인증까지 마친 challenge 로 세션을 발급한다. 같은 계정의 기존 세션은 덮어쓰고 끊긴 쪽에 사유를 남긴다. */
    public LoginResult completeIdentity(String challengeId, ClientInfo client) {
        Instant now = clock.instant();
        Challenge ch = requireChallenge(challengeId);
        if (!Challenge.VERIFIED.equals(ch.state())) {
            throw new BusinessException(ErrorCode.AUTH_IDENTITY_NOT_VERIFIED);
        }
        challenges.deleteChallenge(challengeId);

        // 1차 통과 뒤 5분 사이에 계정 상태가 바뀌었을 수 있다
        Mngr m = mngrs.findById(ch.mngrId());
        if (m == null || !Mngr.ST_USE.equals(m.acntStCd())) {
            throw new BusinessException(statusError(m == null ? null : m.acntStCd()));
        }
        requireUpdated(mngrs.recordLoginSuccess(m.mngrId(), Times.toDtm(now)));

        Session old = sessions.find(m.mngrId());
        if (old != null) {
            sessions.markKicked(old.sid(), LOGOUT_DUPLICATE, AuthPolicy.KICK_TTL);
            hists.write(logoutHist(m.mngrId(), LOGOUT_DUPLICATE, old.sid(), client, now));
        }
        String sid = UUID.randomUUID().toString();
        Instant absExpAt = now.plus(policy.absoluteTimeout());
        sessions.save(new Session(m.mngrId(), sid, ch.chnl(), m.mngrDivCd(), m.authCd(), now, absExpAt,
                client.ip(), client.ua(), m.tmpPassword()), policy.idleTimeout());
        hists.write(new Hist(Hist.TYP_LGIN, m.mngrId(), null, "LOGIN",
                dtl("chnl", ch.chnl(), "txId", ch.txId(), "sid", sid, "ip", client.ip(), "ua", client.ua()),
                client.ip(), Times.toDtm(now), m.mngrId()));

        String token = tokens.issue(new TokenClaims(m.mngrId(), m.mngrDivCd(), m.authCd(), ch.chnl(), sid, absExpAt));
        return new LoginResult(token, now.plus(policy.idleTimeout()), absExpAt, m.tmpPassword(),
                new UserSummary(m.mngrId(), m.mngrNm(), m.mngrDivCd(), m.authCd()));
    }

    // ------------------------------------------------------------------ 세션

    /**
     * 매 인증 요청: JWT 서명·만료 → sess:{sub} 조회 → sid 대조 → (touch 면) TTL 되돌림.
     * 화면 표시용 GET /session 은 touch=false 로 부른다 — 타이머가 스스로 세션을 늘리면 무활동 만료가 영영 안 온다.
     */
    public AuthenticatedUser authenticate(String token, boolean touch) {
        TokenClaims c = tokens.parse(token);
        Session s = sessions.find(c.sub());
        if (s == null) {
            throw new BusinessException(sessions.kickedReason(c.sid()) != null
                    ? ErrorCode.AUTH_SESSION_REPLACED : ErrorCode.AUTH_SESSION_EXPIRED);
        }
        if (!s.sid().equals(c.sid())) {
            throw new BusinessException(ErrorCode.AUTH_SESSION_REPLACED);
        }
        if (touch) {
            sessions.touch(c.sub(), policy.idleTimeout());
        }
        return new AuthenticatedUser(c.sub(), s.div(), s.auth(), s.chnl(), s.sid(), s.absExpAt(), s.mustChangePassword());
    }

    /**
     * 로그아웃. 세션이 이미 만료된 뒤(IDLE)에도 이력을 남겨야 해서 토큰만 보고 처리한다 — 서명이 맞는 토큰이면 된다.
     * 내 sid 의 세션만 지운다(이미 다른 곳에서 새로 로그인했으면 그 세션은 건드리지 않는다).
     */
    public void logout(String token, String reason, ClientInfo client) {
        if (token == null) {
            return;
        }
        String why = reason != null && LOGOUT_REASONS.contains(reason) ? reason : LOGOUT_MANUAL;
        TokenClaims c;
        try {
            c = tokens.parse(token);
        } catch (BusinessException e) {
            return;
        }
        Session s = sessions.find(c.sub());
        if (s != null && s.sid().equals(c.sid())) {
            sessions.delete(c.sub());
            hists.write(logoutHist(c.sub(), why, c.sid(), client, clock.instant()));
        } else if (s == null && LOGOUT_IDLE.equals(why)) {
            hists.write(logoutHist(c.sub(), why, c.sid(), client, clock.instant()));
        }
    }

    public Me me(AuthenticatedUser user) {
        Mngr m = mngrs.findById(user.mngrId());
        if (m == null) {
            throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
        }
        Instant lastLoginAt = m.lastLginDtm() == null ? null : Times.parseDtm(m.lastLginDtm());
        return new Me(m.mngrId(), m.mngrNm(), m.mngrDivCd(), m.authCd(), m.deptNm(), m.jbpsNm(), lastLoginAt,
                user.mustChangePassword());
    }

    /** 화면 타이머용 — TTL 을 되돌리지 않는다. */
    public SessionInfo session(AuthenticatedUser user) {
        Duration ttl = sessions.ttl(user.mngrId());
        if (ttl == null) {
            throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
        }
        return new SessionInfo(clock.instant().plus(ttl), user.absExpAt(), policy.warnBefore().toSeconds());
    }

    /** 연장 — 계정이 사용 상태가 아니면 연장하지 않고 끊는다(SB 030P). */
    public Instant extend(AuthenticatedUser user, ClientInfo client) {
        Instant now = clock.instant();
        Mngr m = mngrs.findById(user.mngrId());
        if (m == null || !Mngr.ST_USE.equals(m.acntStCd())) {
            sessions.delete(user.mngrId());
            hists.write(logoutHist(user.mngrId(), LOGOUT_STOPPED, user.sid(), client, now));
            throw new BusinessException(ErrorCode.AUTH_STOPPED);
        }
        sessions.touch(user.mngrId(), policy.idleTimeout());
        return now.plus(policy.idleTimeout());
    }

    // ------------------------------------------------------------------ 비밀번호

    public void changePassword(AuthenticatedUser user, String currentPassword, String newPassword, ClientInfo client) {
        Instant now = clock.instant();
        Mngr m = mngrs.findById(user.mngrId());
        if (m == null) {
            throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
        }
        if (!hasher.matches(currentPassword, m.pwdHash())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "현재 비밀번호가 일치하지 않습니다.");
        }
        if (!PasswordPolicy.isValid(newPassword, m.mngrId())) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_POLICY);
        }
        if (hasher.matches(newPassword, m.pwdHash()) || hasher.matches(newPassword, m.prevPwdHash())) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_REUSED);
        }
        requireUpdated(mngrs.changePassword(m.mngrId(), m.pwdHash(), hasher.hash(newPassword), Times.toDtm(now)));
        sessions.updateMustChangePassword(m.mngrId(), false);
        hists.write(new Hist(Hist.TYP_MOD, m.mngrId(), null, "PASSWORD", dtl("byTmp", m.tmpPassword()),
                client.ip(), Times.toDtm(now), m.mngrId()));
    }

    // ------------------------------------------------------------------ 내부

    private Challenge requireChallenge(String challengeId) {
        Challenge ch = challengeId == null ? null : challenges.findChallenge(challengeId);
        if (ch == null) {
            throw new BusinessException(ErrorCode.AUTH_CHALLENGE_EXPIRED);
        }
        return ch;
    }

    /** 본인인증 업체 호출 — 업무 예외는 그대로, 그 밖의 장애는 503 으로. */
    private static <T> T callProvider(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (BusinessException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.AUTH_IDENTITY_PROVIDER_ERROR);
        }
    }

    private boolean dormantExpired(Mngr m, Instant now) {
        if (m.lastLginDtm() == null) {
            return false;
        }
        return Times.parseDtm(m.lastLginDtm()).atZone(Times.KST).plus(policy.dormantAfter()).toInstant().isBefore(now);
    }

    private static ErrorCode statusError(String acntStCd) {
        if (Mngr.ST_LOCK.equals(acntStCd)) {
            return ErrorCode.AUTH_LOCKED;
        }
        if (Mngr.ST_STOP.equals(acntStCd)) {
            return ErrorCode.AUTH_STOPPED;
        }
        if (Mngr.ST_DRMT.equals(acntStCd)) {
            return ErrorCode.AUTH_DORMANT;
        }
        return ErrorCode.AUTH_NOT_REGISTERED;
    }

    private static void requireUpdated(int updated) {
        if (updated == 0) {
            throw new BusinessException(ErrorCode.CONFLICT);
        }
    }

    /** '010-****-0001' 모양. 10자리는 가운데 3자리를 가린다. */
    static String maskMobile(String digits) {
        if (digits.length() == 11) {
            return digits.substring(0, 3) + "-****-" + digits.substring(7);
        }
        if (digits.length() == 10) {
            return digits.substring(0, 3) + "-***-" + digits.substring(6);
        }
        return "****";
    }

    private BusinessException loginFail(String loginId, ErrorCode code, String channel, ClientInfo client,
                                        Integer failCnt, Instant now) {
        hists.write(loginFailHist(loginId, code, channel, client, failCnt, now));
        return new BusinessException(code);
    }

    private Hist loginFailHist(String loginId, ErrorCode code, String channel, ClientInfo client, Integer failCnt, Instant now) {
        String key = loginId == null ? null : loginId.length() > TGT_KEY_MAX ? loginId.substring(0, TGT_KEY_MAX) : loginId;
        return new Hist(Hist.TYP_LGIN, key, null, code.name(),
                dtl("loginId", loginId, "chnl", channel, "ip", client.ip(), "ua", client.ua(), "failCnt", failCnt),
                client.ip(), Times.toDtm(now), Hist.ANONYMOUS);
    }

    private Hist identityHist(Challenge ch, ErrorCode code, ClientInfo client, Instant now) {
        return new Hist(Hist.TYP_LGIN, ch.mngrId(), null, code.name(),
                dtl("chnl", ch.chnl(), "txId", ch.txId(), "ip", client.ip()), client.ip(), Times.toDtm(now), Hist.ANONYMOUS);
    }

    private Hist logoutHist(String mngrId, String reason, String sid, ClientInfo client, Instant now) {
        return new Hist(Hist.TYP_LGIN, mngrId, null, "LOGOUT", dtl("reason", reason, "sid", sid),
                client.ip(), Times.toDtm(now), mngrId);
    }

    private void writeStatusHist(String mngrId, String before, String after, String reason, ClientInfo client,
                                 String usrId, Instant now) {
        hists.write(new Hist(Hist.TYP_ST, mngrId, before, after, dtl("reason", reason), client.ip(), Times.toDtm(now), usrId));
    }

    /** null 값은 빼고 담는다(Map.of 는 null 을 못 받는다). */
    private static Map<String, Object> dtl(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            if (keyValues[i + 1] != null) {
                map.put((String) keyValues[i], keyValues[i + 1]);
            }
        }
        return map;
    }
}
