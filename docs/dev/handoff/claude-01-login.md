# 1차 개발 인계 — 백엔드 골격 + 관리자 로그인 (2026-10-02)

Cursor 대신 Claude가 [login.md](../login.md) 기준으로 1차를 만들었다. 다음 고도화는 이 문서부터 읽는다.

## 1. 만든 것

| 영역 | 위치 |
|---|---|
| 백엔드 | `backend/` — Gradle 멀티모듈 `vs-domain`(규칙·포트) · `vs-infra`(MyBatis · Redis · BCrypt · JWT · 로컬 가짜) · `vs-api`(컨트롤러 · 보안 · Flyway V1~V3) · 패키지 `com.hyundaiezwel.vs` |
| 로그인 API | `/api/auth/login` · `identity/start` · `identity/callback` · `identity/local-verify`(local만) · `identity/complete` · `logout` · `me` · `session` · `session/extend` · `password`, 공통코드 `/api/codes` |
| 바깥 담당 틀 | `IdentityVerifier`(PASS — 본인인증 솔루션), `PiiCipher`(암호화 — 복지몰 표준). 로컬 구현체는 `@Profile("local")`, 다른 프로필에서는 기동 실패 |
| 프론트 | `src/auth/`(mode · tokenStore · api · store · LoginForm · PasswordChangeModal · SessionGuardReal), `.env.example` |
| 로컬 환경 | `Makefile`, `scripts/local-dev-up.sh` · `local-dev-api.sh` · `local-dev-seed-accounts.sh`, `deploy/local/.env.secret.example` |
| DB | `db/`를 DB 설계 v3(`vacation-support-admin-asis` main, 11테이블)로 맞췄다. Flyway V1~V3는 그 사본 |

## 2. 고친 공통 파일 (리포 주인 성찬민 확인 대상)

| 파일 | 왜 |
|---|---|
| `package.json` · `package-lock.json` | `pinia` · `axios` 추가 |
| `vite.config.ts` | `/api` → `localhost:8090` 프록시 (포트 5320 그대로) |
| `src/main.ts` | Pinia 등록 |
| `src/router.ts` | 실제 모드(`VITE_API_BASE` 있음)에서만 로그인 가드. 로그인 탭 제목에서 "Admin" 제거 |
| `src/layouts/Shell.vue` | 실제 모드면 `SessionGuardReal`, 아니면 기존 `SessionGuard` (한 줄) |
| `src/app/TopBar.vue` | 실제 모드면 이름 · 역할 · 로그아웃. 목업은 그대로 |
| `src/pages/LoginPage.vue` | 실제 모드면 카드 안쪽만 `LoginForm`. 목업 안내 문구의 "관리자에게" → "소속 마스터에게"(MPR-008) |
| `.gitignore` | `backend` 빌드 산출물 · `deploy/local/.env.secret` · `.env.local` |

`VITE_API_BASE`가 없는 빌드(GitHub Pages)는 지금 목업과 같다. 새 로그인 코드는 목업 번들에 들어가지 않는다.

## 3. 실행

```bash
export TEMP='C:\hpms\tmp' TMP='C:\hpms\tmp'   # 이 PC: Gradle/JDK 가 한글 TEMP 경로에서 깨진다
bash scripts/local-dev-up.sh                  # make dev-up — postgres 5442 · redis 6389
bash scripts/local-dev-api.sh                 # make dev-api — 8090, profile local, Flyway 자동
bash scripts/local-dev-seed-accounts.sh       # make dev-seed-accounts — 테스트 계정 12개
echo VITE_API_BASE=/api > .env.local && npm run dev   # 5320
```

로컬 본인인증은 시드 계정의 이름 · 생년월일(19900101) · 휴대폰(`{plain}` 뒤 숫자)을 입력한다. Git Bash에서 `VITE_API_BASE=/api npm run dev`처럼 붙이면 MSYS가 경로로 바꾼다 — `.env.local`을 쓸 것.

## 4. 확인 결과

**백엔드 테스트** `./gradlew test` — 72건 통과 · 실패 0(판정 순서 · 본인인증 대조 · 세션 · 비밀번호 단위 테스트, Redis Testcontainers 통합 테스트, AuthController 슬라이스, ArchTest 4 — 위반을 넣어 깨지는 것까지 확인).

**완료 기준(login.md 13절)**

| # | 결과 | 확인 방법 |
|---|---|---|
| 1 | 통과 | 브라우저: kto.am → 로컬 본인인증 → 메인, 상단바 "공사마스터" |
| 2 | 통과 | curl: ezw.om |
| 3 | 통과 | 브라우저: comp.cm → "기업 담당자는 기업 전용 화면에서 로그인하세요." + 이동 링크, API `channel=COMP` 통과 |
| 4 | 통과 | curl: 없는 ID · 틀린 비밀번호 코드·문구 같음 |
| 5 | 통과 | curl: kto.as 5회 → `AUTH_LOCKED`, DB `LOCK/5` · `lock_dtm`, 이력 `ST` (확인 후 원복) |
| 6 | 통과 | curl: test.lock · test.drmt · test.stop · comp.unrg |
| 7 | 통과 | curl: test.tmp 403 강제 · 변경 · 직전 비밀번호 거부 (확인 후 원복) |
| 8 | 통과 | curl: 불일치 남은 횟수 4→1, 5회째 폐기 |
| 9 | 통과 | curl: 인증 전 complete `AUTH_IDENTITY_NOT_VERIFIED` |
| 10 | 통과 | 브라우저 + 다른 클라이언트 로그인 → 20초 안에 "다른 곳에서 로그인되어 종료되었습니다." (목업 화면은 서버를 안 부르므로 60초 세션 조회에서 감지) |
| 11 | 못 해 봄 | 30분 무활동 · 탭 동기화는 화면에서 끝까지 기다려 보지 않음 — 코드와 단위 수준만 |
| 12 | 통과 | curl: Redis 멈추면 503 `AUTH_SESSION_STORE_UNAVAILABLE` |
| 13 | 통과 | DB: 모든 시도 `LGIN` 기록, PASS 개인정보 행 0 |
| 14 | 통과 | `npm run build`(목업) 결과물에 axios · 새 로그인 코드 없음 |
| 15 | 부분 | 백엔드 테스트 · `npm run build` 통과. `npm run check:sb`는 이 저장소 스크립트가 Windows 경로 버그로 원래부터 실패(`new URL(...).pathname` → `C:\C:\…`) — ROOT만 고친 사본으로 77화면 통과 확인, 원본은 안 고침 |

`lock_dtm` 기록은 DB v3 동기화 뒤 추가했다. 실제 API로 5회 실패 → `LOCK/5` · `lock_dtm` 채워짐 · `ST` 이력 1건을 확인했지만 단위 테스트는 없다 — 고도화 때 한 건 더할 것.

## 5. 설계와 다르게 한 것

- **인증 강제는 인터셉터**(`AuthInterceptor`): `@PublicApi`가 없는 핸들러는 전부 막는다(기본 막힘). Security는 STATELESS · permitAll만. ArchTest는 `@PublicApi` 또는 `@LoginUser` 선언을 검사한다.
- **`/logout`은 `@PublicApi`**: 무활동 만료 뒤에도 IDLE 로그아웃 이력을 받으려고. 토큰 서명만 확인하고 자기 sid 세션만 지운다.
- **`vs_mngr_b`에 `version` 컬럼이 없다** → 읽은 `lgin_fail_cnt` · `acnt_st_cd` · `pwd_hash`를 조건으로 UPDATE, 0건이면 409. DB 쪽에 `version` 추가 여부 확인 필요.
- **`vs_hist_h.tgt_key`**: v3에서 40자. `mngr_id`(42자)가 넘치면 잘라 넣고 전체 ID는 `dtl_json.loginId`.
- **로컬 txId 짝 맞추기**: 서버가 challenge의 txId를 가짜 구현체에 넘기고 그대로 돌려받는다. 실제 PASS 구현체는 **PASS 응답에서** txId를 꺼내야 한다(인터페이스 주석에 경고).
- **콜백 postMessage 대상**은 `*`가 아니라 `VS_ADMIN_URL` · `VS_COMP_URL` origin.
- **HTTP 상태**: 계정 상태 · 본인인증 실패 401, 채널 거부 403, 비밀번호 규칙 · 재사용 400. 프론트는 상태코드가 아니라 `error.code`로 판단한다.
- **문구**: 서버 문구에서 "관리자" 제거("소속 마스터 담당자에게", "기업 전용 화면에서").
- **세션 화면**: 목업 `session.ts` · `SessionGuard.vue`는 그대로 두고 `src/auth/SessionGuardReal.vue`를 따로 만들어 Shell에서 모드로 고른다.
- **역할 라벨**: `/api/codes` 대신 `src/sb/roles.ts`의 ROLES.

## 6. 다음에 할 일

1. 30분 무활동 · 탭 동기화 화면 확인(`VS_AUTH_IDLE_TIMEOUT`을 짧게 해서)
2. 로그인 실패 처리의 DB 갱신 + 이력 INSERT를 한 트랜잭션으로
3. `vs_mngr_b.version` 추가 여부 결정(DB 담당)
4. 운영 배포 전: ALB 뒤 클라이언트 IP(`server.forward-headers-strategy`), ElastiCache TLS · AUTH 토큰, PASS · 암호화 실제 구현체(솔루션 · 복지몰 공통)
5. `/me`의 `lastLoginAt`이 이번 로그인 시각 — 직전 로그인 시각이 필요하면 따로 보관
6. 계정관리(SP-SYS-010L/D) · 접속이력(SP-SYS-020P) — WBS 10/13~16
7. `scripts/check-sb.mjs` Windows 경로 버그는 리포 주인에게 알림
8. PrimeVue Password 기본 영문 문구("Enter a password") 한글화
