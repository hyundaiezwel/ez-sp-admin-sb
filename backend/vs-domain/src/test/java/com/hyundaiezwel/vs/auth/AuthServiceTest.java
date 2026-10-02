package com.hyundaiezwel.vs.auth;

import com.hyundaiezwel.vs.common.BusinessException;
import com.hyundaiezwel.vs.common.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.Period;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AuthService — 판정 순서(5절) 전 분기, 본인인증 대조·5회 제한·txId 짝(7절), 세션 덮어쓰기·만료(6절), 비밀번호 변경(8절).
 * 포트는 메모리 가짜로 대신한다. 계정 값은 db/05_local_account_seed.sql 과 같은 모양으로 둔다.
 */
class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-02T01:00:00Z"); // KST 10:00
    private static final String PW = "Vs!Local2027";
    private static final ClientInfo CLIENT = new ClientInfo("127.0.0.1", "JUnit");

    private FakeMngrs mngrs;
    private List<Hist> hists;
    private FakeSessions sessions;
    private FakeChallenges challenges;
    private FakeVerifier verifier;
    private FakeHasher hasher;
    private MutableClock clock;
    private AuthService service;

    @BeforeEach
    void setUp() {
        mngrs = new FakeMngrs();
        hists = new ArrayList<>();
        sessions = new FakeSessions();
        challenges = new FakeChallenges();
        verifier = new FakeVerifier();
        hasher = new FakeHasher();
        clock = new MutableClock(NOW);
        AuthPolicy policy = new AuthPolicy(Duration.ofMinutes(30), Duration.ofHours(12), Duration.ofMinutes(5),
                Period.ofMonths(6), "http://admin.test", "http://comp.test");
        service = new AuthService(mngrs, hists::add, sessions, challenges, verifier, new PlainCipher(), hasher,
                new FakeTokens(clock), policy, clock);

        mngrs.put(mngr("kto.am", "KTO", "AM", "USE", 0, "H:" + PW, "20261001090000", "{plain}01000000001", "N"));
        mngrs.put(mngr("comp.cm", "COMP", "CM", "USE", 0, "H:" + PW, "20261001090000", "{plain}01000000007", "N"));
        mngrs.put(mngr("test.tmp", "KTO", "AS", "USE", 0, "H:Temp!2027vs", null, "{plain}01000000008", "Y"));
        mngrs.put(mngr("test.lock", "KTO", "AS", "LOCK", 5, "H:" + PW, "20261001090000", "{plain}01000000009", "N"));
        mngrs.put(mngr("test.drmt", "KTO", "AS", "DRMT", 0, "H:" + PW, "20260301090000", "{plain}01000000010", "N"));
        mngrs.put(mngr("test.stop", "EZW", "OO", "STOP", 0, "H:" + PW, "20261001090000", "{plain}01000000011", "N"));
        mngrs.put(mngr("comp.unrg", "COMP", "CM", "UNRG", 0, null, null, "{plain}01000000012", "Y"));
    }

    @Nested
    class 판정순서 {

        @Test
        void 없는ID는_더미해시를_대조하고_자격증명오류() {
            assertCode(() -> service.login("nobody", PW, "ADMIN", CLIENT), ErrorCode.AUTH_INVALID_CREDENTIALS);
            assertThat(hasher.dummyCalls).isEqualTo(1);
            assertThat(lastHist().regUsrId()).isEqualTo(Hist.ANONYMOUS);
            assertThat(lastHist().aftVal()).isEqualTo("AUTH_INVALID_CREDENTIALS");
        }

        @Test
        void 없는ID와_틀린비밀번호의_코드와_문구가_같다() {
            BusinessException unknown = catchBiz(() -> service.login("nobody", PW, "ADMIN", CLIENT));
            BusinessException wrong = catchBiz(() -> service.login("kto.am", "wrong", "ADMIN", CLIENT));
            assertThat(unknown.getErrorCode()).isEqualTo(wrong.getErrorCode());
            assertThat(unknown.getMessage()).isEqualTo(wrong.getMessage());
        }

        @Test
        void 잠금계정은_비밀번호를_대조하지_않는다() {
            assertCode(() -> service.login("test.lock", PW, "ADMIN", CLIENT), ErrorCode.AUTH_LOCKED);
            assertThat(hasher.calls).isZero();
        }

        @Test
        void 틀린비밀번호는_실패수를_올린다() {
            assertCode(() -> service.login("kto.am", "wrong", "ADMIN", CLIENT), ErrorCode.AUTH_INVALID_CREDENTIALS);
            assertThat(mngrs.get("kto.am").failCnt()).isEqualTo(1);
            assertThat(lastHist().dtl()).containsEntry("failCnt", 1);
        }

        @Test
        void 다섯번째_실패에서_잠기고_그_응답부터_잠금코드() {
            for (int i = 1; i <= 4; i++) {
                assertCode(() -> service.login("kto.am", "wrong", "ADMIN", CLIENT), ErrorCode.AUTH_INVALID_CREDENTIALS);
            }
            assertCode(() -> service.login("kto.am", "wrong", "ADMIN", CLIENT), ErrorCode.AUTH_LOCKED);
            assertThat(mngrs.get("kto.am").acntStCd()).isEqualTo("LOCK");
            assertThat(mngrs.get("kto.am").failCnt()).isEqualTo(5);
            List<Hist> st = hists.stream().filter(h -> h.histTypCd().equals("ST")).toList();
            assertThat(st).hasSize(1);
            assertThat(st.get(0).befVal()).isEqualTo("USE");
            assertThat(st.get(0).aftVal()).isEqualTo("LOCK");
            // 잠긴 뒤에는 맞는 비밀번호도 막힌다
            assertCode(() -> service.login("kto.am", PW, "ADMIN", CLIENT), ErrorCode.AUTH_LOCKED);
        }

        @Test
        void 비밀번호없는계정은_불일치로_세고_실패수를_올린다() {
            assertCode(() -> service.login("comp.unrg", "", "COMP", CLIENT), ErrorCode.AUTH_INVALID_CREDENTIALS);
            assertThat(mngrs.get("comp.unrg").failCnt()).isEqualTo(1);
        }

        @Test
        void 사용중지는_비밀번호가_맞을때만_알려준다() {
            assertCode(() -> service.login("test.stop", "wrong", "ADMIN", CLIENT), ErrorCode.AUTH_INVALID_CREDENTIALS);
            assertCode(() -> service.login("test.stop", PW, "ADMIN", CLIENT), ErrorCode.AUTH_STOPPED);
        }

        @Test
        void 휴면계정() {
            assertCode(() -> service.login("test.drmt", PW, "ADMIN", CLIENT), ErrorCode.AUTH_DORMANT);
        }

        @Test
        void 마지막로그인이_6개월을_넘으면_이때_휴면으로_바꾼다() {
            mngrs.put(mngr("kto.al", "KTO", "AL", "USE", 0, "H:" + PW, "20260401095959", "{plain}01000000002", "N"));
            assertCode(() -> service.login("kto.al", PW, "ADMIN", CLIENT), ErrorCode.AUTH_DORMANT);
            assertThat(mngrs.get("kto.al").acntStCd()).isEqualTo("DRMT");
            assertThat(hists).anyMatch(h -> h.histTypCd().equals("ST") && "DRMT".equals(h.aftVal()) && "USE".equals(h.befVal()));
        }

        @Test
        void 정확히_6개월째는_아직_휴면이_아니다() {
            mngrs.put(mngr("kto.al", "KTO", "AL", "USE", 0, "H:" + PW, "20260402100000", "{plain}01000000002", "N"));
            assertThat(service.login("kto.al", PW, "ADMIN", CLIENT).challengeId()).isNotBlank();
        }

        @Test
        void 미가입() {
            mngrs.put(mngr("comp.unrg", "COMP", "CM", "UNRG", 0, "H:" + PW, null, "{plain}01000000012", "Y"));
            assertCode(() -> service.login("comp.unrg", PW, "COMP", CLIENT), ErrorCode.AUTH_NOT_REGISTERED);
        }

        @Test
        void 기업계정은_ADMIN_채널에서_거부되고_기업화면주소를_준다() {
            BusinessException e = catchBiz(() -> service.login("comp.cm", PW, "ADMIN", CLIENT));
            assertThat(e.getErrorCode()).isEqualTo(ErrorCode.AUTH_CHANNEL_DENIED);
            assertThat(e.getData()).containsEntry("redirectUrl", "http://comp.test");
            assertThat(service.login("comp.cm", PW, "COMP", CLIENT).challengeId()).isNotBlank();
        }

        @Test
        void 공사계정은_COMP_채널에서_거부된다() {
            BusinessException e = catchBiz(() -> service.login("kto.am", PW, "COMP", CLIENT));
            assertThat(e.getErrorCode()).isEqualTo(ErrorCode.AUTH_CHANNEL_DENIED);
            assertThat(e.getData()).containsEntry("redirectUrl", "http://admin.test");
        }

        @Test
        void 휴대폰이_없으면_본인인증불가() {
            mngrs.put(mngr("kto.av", "KTO", "AV", "USE", 0, "H:" + PW, "20261001090000", null, "N"));
            assertCode(() -> service.login("kto.av", PW, "ADMIN", CLIENT), ErrorCode.AUTH_IDENTITY_UNAVAILABLE);
        }

        @Test
        void 통과하면_세션이_아니라_challenge만_만든다() {
            AuthService.LoginStart start = service.login("kto.am", PW, "ADMIN", CLIENT);
            assertThat(start.maskedMobile()).isEqualTo("010-****-0001");
            assertThat(start.expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(5)));
            assertThat(challenges.map.get(start.challengeId()).state()).isEqualTo("PENDING");
            assertThat(sessions.map).isEmpty();
        }

        @Test
        void 동시에_다른요청이_먼저_바꿨으면_409() {
            mngrs.failUpdates = true;
            assertCode(() -> service.login("kto.am", "wrong", "ADMIN", CLIENT), ErrorCode.CONFLICT);
        }
    }

    @Nested
    class 본인인증 {

        @Test
        void 시드값을_넣으면_통과하고_세션이_발급된다() {
            String cid = loginAndStart("kto.am");
            service.verifyIdentity(cid, input("공사마스터", "19900101", "010-0000-0001"), CLIENT);
            AuthService.LoginResult r = service.completeIdentity(cid, CLIENT);

            assertThat(r.accessToken()).isNotBlank();
            assertThat(r.absoluteExpiresAt()).isEqualTo(NOW.plus(Duration.ofHours(12)));
            assertThat(r.expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(30)));
            assertThat(r.user().name()).isEqualTo("공사마스터");
            assertThat(sessions.map).containsKey("kto.am");
            assertThat(challenges.map).doesNotContainKey(cid);
            assertThat(mngrs.get("kto.am").lastLginDtm()).isEqualTo("20261002100000");
            assertThat(hists).anyMatch(h -> "LOGIN".equals(h.aftVal()) && "kto.am".equals(h.regUsrId()));
            // PASS 결과 개인정보는 이력에 남지 않는다
            assertThat(hists.toString()).doesNotContain("19900101").doesNotContain("01000000001");
        }

        @Test
        void 이름앞뒤공백은_무시한다() {
            String cid = loginAndStart("kto.am");
            service.verifyIdentity(cid, input("  공사마스터 ", "19900101", "01000000001"), CLIENT);
            assertThat(challenges.map.get(cid).state()).isEqualTo("VERIFIED");
        }

        @Test
        void 불일치는_어느항목인지_말하지_않고_남은횟수만_준다() {
            String cid = loginAndStart("kto.am");
            BusinessException e = catchBiz(() -> service.verifyIdentity(cid, input("다른이름", "19900101", "01000000001"), CLIENT));
            assertThat(e.getErrorCode()).isEqualTo(ErrorCode.AUTH_IDENTITY_MISMATCH);
            assertThat(e.getFields()).containsOnlyKeys("remaining").containsEntry("remaining", 4);
            BusinessException e2 = catchBiz(() -> service.verifyIdentity(cid, input("공사마스터", "19900102", "01000000001"), CLIENT));
            assertThat(e2.getMessage()).isEqualTo(e.getMessage());
            BusinessException e3 = catchBiz(() -> service.verifyIdentity(cid, input("공사마스터", "19900101", "01000000009"), CLIENT));
            assertThat(e3.getMessage()).isEqualTo(e.getMessage());
            assertThat(e3.getFields()).containsEntry("remaining", 2);
        }

        @Test
        void 다섯번_틀리면_challenge를_폐기한다() {
            String cid = loginAndStart("kto.am");
            for (int i = 0; i < 4; i++) {
                assertCode(() -> service.verifyIdentity(cid, input("x", "19900101", "01000000001"), CLIENT), ErrorCode.AUTH_IDENTITY_MISMATCH);
            }
            assertCode(() -> service.verifyIdentity(cid, input("x", "19900101", "01000000001"), CLIENT), ErrorCode.AUTH_IDENTITY_TOO_MANY_ATTEMPTS);
            assertThat(challenges.map).doesNotContainKey(cid);
            assertCode(() -> service.completeIdentity(cid, CLIENT), ErrorCode.AUTH_CHALLENGE_EXPIRED);
        }

        @Test
        void 다른거래의_결과는_불일치로_센다() {
            String cid = loginAndStart("kto.am");
            verifier.forcedTxId = "OTHER-TX";
            assertCode(() -> service.verifyIdentity(cid, input("공사마스터", "19900101", "01000000001"), CLIENT), ErrorCode.AUTH_IDENTITY_MISMATCH);
        }

        @Test
        void 인증전에는_완료할수없다() {
            String cid = loginAndStart("kto.am");
            assertCode(() -> service.completeIdentity(cid, CLIENT), ErrorCode.AUTH_IDENTITY_NOT_VERIFIED);
            assertCode(() -> service.completeIdentity("no-such-challenge", CLIENT), ErrorCode.AUTH_CHALLENGE_EXPIRED);
        }

        @Test
        void 업체장애는_503() {
            String cid = service.login("kto.am", PW, "ADMIN", CLIENT).challengeId();
            verifier.fail = true;
            assertCode(() -> service.startIdentity(cid, "http://x"), ErrorCode.AUTH_IDENTITY_PROVIDER_ERROR);
        }
    }

    @Nested
    class 세션 {

        @Test
        void 같은계정의_두번째_로그인이_첫토큰을_끊는다() {
            String first = fullLogin("kto.am", "공사마스터", "01000000001").accessToken();
            String second = fullLogin("kto.am", "공사마스터", "01000000001").accessToken();
            assertCode(() -> service.authenticate(first, true), ErrorCode.AUTH_SESSION_REPLACED);
            assertThat(service.authenticate(second, true).mngrId()).isEqualTo("kto.am");
            assertThat(hists).anyMatch(h -> "LOGOUT".equals(h.aftVal()) && "DUPLICATE".equals(h.dtl().get("reason")));
            // 새 세션이 로그아웃으로 사라진 뒤에도 끊긴 쪽은 '다른 곳에서 로그인' 사유를 받는다
            service.logout(second, "MANUAL", CLIENT);
            assertCode(() -> service.authenticate(first, true), ErrorCode.AUTH_SESSION_REPLACED);
            assertCode(() -> service.authenticate(second, true), ErrorCode.AUTH_SESSION_EXPIRED);
        }

        @Test
        void 세션이_없으면_만료() {
            String token = fullLogin("kto.am", "공사마스터", "01000000001").accessToken();
            sessions.map.clear();
            assertCode(() -> service.authenticate(token, true), ErrorCode.AUTH_SESSION_EXPIRED);
        }

        @Test
        void 조회용_인증은_TTL을_되돌리지_않는다() {
            String token = fullLogin("kto.am", "공사마스터", "01000000001").accessToken();
            sessions.touches = 0;
            service.authenticate(token, false);
            assertThat(sessions.touches).isZero();
            service.authenticate(token, true);
            assertThat(sessions.touches).isEqualTo(1);
        }

        @Test
        void 절대상한이_지나면_만료() {
            String token = fullLogin("kto.am", "공사마스터", "01000000001").accessToken();
            clock.now = NOW.plus(Duration.ofHours(12)).plusSeconds(1);
            assertCode(() -> service.authenticate(token, true), ErrorCode.AUTH_SESSION_EXPIRED);
        }

        @Test
        void 사용상태가_아니면_연장하지_않고_끊는다() {
            String token = fullLogin("kto.am", "공사마스터", "01000000001").accessToken();
            AuthenticatedUser user = service.authenticate(token, true);
            Mngr m = mngrs.get("kto.am");
            mngrs.put(mngr("kto.am", "KTO", "AM", "STOP", 0, m.pwdHash(), m.lastLginDtm(), m.mblTelnoEnc(), "N"));
            assertCode(() -> service.extend(user, CLIENT), ErrorCode.AUTH_STOPPED);
            assertThat(sessions.map).doesNotContainKey("kto.am");
            assertThat(hists).anyMatch(h -> "STOPPED".equals(h.dtl().get("reason")));
        }
    }

    @Nested
    class 비밀번호 {

        @Test
        void 임시비밀번호는_변경강제_후_변경하면_풀린다() {
            AuthService.LoginResult r = fullLogin("test.tmp", "임시비번", "01000000008");
            assertThat(r.mustChangePassword()).isTrue();
            AuthenticatedUser user = service.authenticate(r.accessToken(), true);
            assertThat(user.mustChangePassword()).isTrue();

            assertCode(() -> service.changePassword(user, "wrong", "New!Pass2027", CLIENT), ErrorCode.AUTH_INVALID_CREDENTIALS);
            assertCode(() -> service.changePassword(user, "Temp!2027vs", "short1!", CLIENT), ErrorCode.AUTH_PASSWORD_POLICY);
            assertCode(() -> service.changePassword(user, "Temp!2027vs", "Temp!2027vs", CLIENT), ErrorCode.AUTH_PASSWORD_REUSED);

            service.changePassword(user, "Temp!2027vs", "New!Pass2027", CLIENT);
            Mngr after = mngrs.get("test.tmp");
            assertThat(after.pwdHash()).isEqualTo("H:New!Pass2027");
            assertThat(after.prevPwdHash()).isEqualTo("H:Temp!2027vs");
            assertThat(after.tmpPwdYn()).isEqualTo("N");
            assertThat(service.authenticate(r.accessToken(), true).mustChangePassword()).isFalse();
            assertThat(hists).anyMatch(h -> "MOD".equals(h.histTypCd()) && "PASSWORD".equals(h.aftVal()));

            // 직전 비밀번호로 되돌릴 수 없다
            AuthenticatedUser again = service.authenticate(r.accessToken(), true);
            assertCode(() -> service.changePassword(again, "New!Pass2027", "Temp!2027vs", CLIENT), ErrorCode.AUTH_PASSWORD_REUSED);
        }
    }

    // ------------------------------------------------------------------ 도우미

    private String loginAndStart(String id) {
        String cid = service.login(id, id.equals("test.tmp") ? "Temp!2027vs" : PW, id.startsWith("comp") ? "COMP" : "ADMIN", CLIENT).challengeId();
        service.startIdentity(cid, "http://localhost/cb");
        return cid;
    }

    private AuthService.LoginResult fullLogin(String id, String name, String mobile) {
        String cid = loginAndStart(id);
        service.verifyIdentity(cid, input(name, "19900101", mobile), CLIENT);
        return service.completeIdentity(cid, CLIENT);
    }

    private static Map<String, String> input(String name, String birth, String mobile) {
        return Map.of("name", name, "birth", birth, "mobile", mobile);
    }

    private Hist lastHist() {
        return hists.get(hists.size() - 1);
    }

    private static void assertCode(Runnable call, ErrorCode code) {
        assertThat(catchBiz(call).getErrorCode()).isEqualTo(code);
    }

    private static BusinessException catchBiz(Runnable call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return e;
        }
        throw new AssertionError("BusinessException 이 나와야 한다");
    }

    static Mngr mngr(String id, String div, String auth, String st, int failCnt, String pwdHash, String lastLogin,
                     String mobile, String tmp) {
        String name = switch (id) {
            case "kto.am" -> "공사마스터";
            case "test.tmp" -> "임시비번";
            default -> "테스트";
        };
        return new Mngr(id, div, auth, name, "19900101", mobile, "팀", "직책", pwdHash, null, tmp, st, failCnt, lastLogin);
    }

    // ------------------------------------------------------------------ 가짜 포트

    static class FakeMngrs implements MngrRepository {
        final Map<String, Mngr> map = new HashMap<>();
        boolean failUpdates;

        void put(Mngr m) {
            map.put(m.mngrId(), m);
        }

        Mngr get(String id) {
            return map.get(id);
        }

        @Override
        public Mngr findById(String id) {
            return map.get(id);
        }

        @Override
        public int updateFailCntAndStatus(Mngr before, int newFailCnt, String newStatus, String usrId, String dtm) {
            Mngr cur = map.get(before.mngrId());
            if (failUpdates || cur.failCnt() != before.failCnt() || !cur.acntStCd().equals(before.acntStCd())) {
                return 0;
            }
            map.put(cur.mngrId(), new Mngr(cur.mngrId(), cur.mngrDivCd(), cur.authCd(), cur.mngrNm(), cur.brdt(), cur.mblTelnoEnc(),
                    cur.deptNm(), cur.jbpsNm(), cur.pwdHash(), cur.prevPwdHash(), cur.tmpPwdYn(), newStatus, newFailCnt, cur.lastLginDtm()));
            return 1;
        }

        @Override
        public int recordLoginSuccess(String id, String dtm) {
            Mngr cur = map.get(id);
            if (!"USE".equals(cur.acntStCd())) {
                return 0;
            }
            map.put(id, new Mngr(cur.mngrId(), cur.mngrDivCd(), cur.authCd(), cur.mngrNm(), cur.brdt(), cur.mblTelnoEnc(),
                    cur.deptNm(), cur.jbpsNm(), cur.pwdHash(), cur.prevPwdHash(), cur.tmpPwdYn(), cur.acntStCd(), 0, dtm));
            return 1;
        }

        @Override
        public int changePassword(String id, String expectedHash, String newHash, String dtm) {
            Mngr cur = map.get(id);
            if (!cur.pwdHash().equals(expectedHash)) {
                return 0;
            }
            map.put(id, new Mngr(cur.mngrId(), cur.mngrDivCd(), cur.authCd(), cur.mngrNm(), cur.brdt(), cur.mblTelnoEnc(),
                    cur.deptNm(), cur.jbpsNm(), newHash, cur.pwdHash(), "N", cur.acntStCd(), cur.failCnt(), cur.lastLginDtm()));
            return 1;
        }
    }

    static class FakeSessions implements SessionStore {
        final Map<String, Session> map = new HashMap<>();
        final Map<String, String> kicks = new HashMap<>();
        int touches;

        @Override
        public Session find(String mngrId) {
            return map.get(mngrId);
        }

        @Override
        public void save(Session session, Duration idle) {
            map.put(session.mngrId(), session);
        }

        @Override
        public void touch(String mngrId, Duration idle) {
            touches++;
        }

        @Override
        public Duration ttl(String mngrId) {
            return map.containsKey(mngrId) ? Duration.ofMinutes(30) : null;
        }

        @Override
        public void delete(String mngrId) {
            map.remove(mngrId);
        }

        @Override
        public void updateMustChangePassword(String mngrId, boolean mustChange) {
            Session s = map.get(mngrId);
            if (s != null) {
                map.put(mngrId, new Session(s.mngrId(), s.sid(), s.chnl(), s.div(), s.auth(), s.issuedAt(), s.absExpAt(),
                        s.ip(), s.ua(), mustChange));
            }
        }

        @Override
        public void markKicked(String sid, String reason, Duration ttl) {
            kicks.put(sid, reason);
        }

        @Override
        public String kickedReason(String sid) {
            return kicks.get(sid);
        }
    }

    static class FakeChallenges implements ChallengeStore {
        final Map<String, Challenge> map = new HashMap<>();

        @Override
        public void createChallenge(Challenge c, Duration ttl) {
            map.put(c.challengeId(), c);
        }

        @Override
        public Challenge findChallenge(String id) {
            return map.get(id);
        }

        @Override
        public boolean updateChallenge(Challenge c) {
            if (!map.containsKey(c.challengeId())) {
                return false;
            }
            map.put(c.challengeId(), c);
            return true;
        }

        @Override
        public void deleteChallenge(String id) {
            map.remove(id);
        }
    }

    /** 로컬 가짜 구현체와 같은 동작 + 다른 거래 결과·업체 장애 흉내. */
    static class FakeVerifier implements IdentityVerifier {
        String forcedTxId;
        boolean fail;
        int seq;

        @Override
        public IdentityStart start(String challengeId, String returnUrl) {
            if (fail) {
                throw new IllegalStateException("업체 장애");
            }
            return new IdentityStart("LOCAL", null, null, "TX-" + (++seq));
        }

        @Override
        public IdentityResult complete(Map<String, String> p) {
            return new IdentityResult(p.get("name"), p.get("birth"), p.get("mobile"),
                    forcedTxId != null ? forcedTxId : p.get(CHALLENGE_TX_ID));
        }
    }

    static class PlainCipher implements PiiCipher {
        @Override
        public String encrypt(String plain) {
            return "{plain}" + plain;
        }

        @Override
        public String decrypt(String cipher) {
            return cipher.substring("{plain}".length());
        }
    }

    static class FakeHasher implements PasswordHasher {
        int calls;
        int dummyCalls;

        @Override
        public String hash(String raw) {
            return "H:" + raw;
        }

        @Override
        public boolean matches(String raw, String hash) {
            calls++;
            if (hash == null) {
                dummyCalls++;
                return false;
            }
            return hash.equals("H:" + raw);
        }
    }

    /** 토큰 = 필드를 | 로 이은 문자열. 만료는 clock 으로 판정한다. */
    static class FakeTokens implements TokenIssuer {
        private final Clock clock;

        FakeTokens(Clock clock) {
            this.clock = clock;
        }

        @Override
        public String issue(TokenClaims c) {
            return String.join("|", c.sub(), c.div(), c.auth(), c.chnl(), c.sid(), String.valueOf(c.exp().toEpochMilli()));
        }

        @Override
        public TokenClaims parse(String token) {
            String[] p = token.split("\\|");
            if (p.length != 6) {
                throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
            }
            Instant exp = Instant.ofEpochMilli(Long.parseLong(p[5]));
            if (!exp.isAfter(clock.instant())) {
                throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
            }
            return new TokenClaims(p[0], p[1], p[2], p[3], p[4], exp);
        }
    }

    static class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
