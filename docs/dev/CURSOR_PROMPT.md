# Cursor 시작 프롬프트 — 1차: 백엔드 골격 + 관리자 로그인

이 저장소(`hyundaiezwel/ez-sp-admin-sb`)를 Cursor로 열고, 아래 `---` 사이를 첫 메시지로 붙여 넣는다.
끝나면 Cursor가 남긴 `docs/dev/handoff/cursor-01-login.md`를 들고 Claude로 돌아가 고도화한다.

---

너는 "노동자 휴가지원사업 관리자 시스템"의 1차 개발자다. 지금 열린 저장소는 TO-BE 관리자 화면의 **SB 목업 + 디자인 시스템**(Vue 3 · Vite · PrimeVue 4, 프론트만)이다.
이번 작업은 **이 저장소에 백엔드를 더하고, 로그인을 실제로 동작하게 만드는 것**이다. 개발은 강병헌·류상오가 함께 하고, 흐름은 Claude 설계 → Cursor 1차 개발(너) → Claude 고도화다.
설계와 다르게 해야 할 것 같으면 바꾸지 말고 handoff 문서의 "설계와 다르게 한 것 / 질문"에 적는다.

## 1. 먼저 읽을 것 (이 순서)

1. **`docs/dev/login.md` — 로그인 설계서. 이 문서가 기준이다.** 저장소 구성 · API · 에러코드 · Redis 키 · 판정 순서 · 본인인증 대조 · 완료 기준이 다 여기 있다.
2. `db/` — DB 설계(`01_ddl.sql` · `04_comment.sql` · `02_code_seed.sql` · `05_local_account_seed.sql` · `README.md` · `ERD.md`). 테이블·컬럼명은 DDL 그대로 쓴다(이지웰 명명 표준 — 바꾸지 말 것).
3. 이 저장소의 규칙: `README.md`, `docs/ui-conventions.md`(UI-nn), `docs/sb-guide.md`, `docs/permissions.md`, `docs/state-rules.md`
4. 로그인 목업: `src/specs/SP-CMN-010P.json` · `020P` · `030P`, `src/pages/LoginPage.vue`, `src/app/session.ts`, `src/app/SessionGuard.vue`, `src/layouts/Shell.vue`, `src/app/TopBar.vue`, `src/router.ts`
5. 백엔드 기준(H-PMS) — https://github.com/HyundaiEzwel-AI-Dev-Lab/H-PMS
   - `CLAUDE.md`, `docs/development-entrypoint.md`, `docs/identity-auth-contract.md`
   - `backend/hpms-api/src/main/java/com/hyundaiezwel/hpms/api/auth/`(SecurityConfig · AuthController · JwtAuthenticationFilter · LoginUserArgumentResolver · `@PublicApi`), `backend/hpms-infra/.../infra/security/jwt/JwtTokenProvider.java`, `backend/hpms-domain/.../identity/LoginLockPolicy.java`
   - 로컬 환경: `Makefile`, `scripts/local-dev-db-up.sh`, `scripts/local-dev-api.sh`
   **백엔드는 H-PMS의 모듈 구조와 코드 관례를 그대로 따른다.** H-PMS 업무 로직은 가져오지 않는다.

## 2. 만들 구조

```
backend/        새로 — Gradle 멀티모듈 vs-api / vs-domain / vs-infra, 패키지 com.hyundaiezwel.vs
                Spring Boot 3.5.x · Java 21 · MyBatis · Flyway · PostgreSQL 16 · Spring Data Redis(Lettuce) · JWT
db/             이미 있음 — Flyway 는 01→V1__init, 04→V2__comment, 02→V3__code_seed 로 옮겨 쓴다. 05 는 Flyway 밖
deploy/local/   .env.secret.example (실제 .env.secret 은 커밋 금지)
scripts/        local-dev-up.sh · local-dev-api.sh 추가 (기존 검사 스크립트는 그대로)
Makefile        dev-up · dev-down · dev-reset · dev-api · dev-seed-accounts · test
src/            지금 프론트를 그대로 쓴다. 추가 의존성은 pinia · axios 뿐
```

## 3. 반드시 지킬 규칙

1. 응답은 `{success, data}` / `{success:false, error:{code, message, fields}}`. 에러코드는 `ErrorCode` 한 곳에서만.
2. 컨트롤러·매퍼에 업무 분기를 넣지 않는다. 판정·상태 변경은 `vs-domain` 서비스에서만.
3. 공개 API는 `@PublicApi(reason="…")`, 그 외는 인증 필수 — ArchTest로 강제. `vs-api`는 crypto 타입 import 금지 — ArchTest로 강제.
4. 상태가 바뀌는 테이블은 `version` 조건부 UPDATE, 0건이면 409.
5. 환경값은 env로만. 비밀(서명키·DB 비밀번호·Redis 토큰)은 커밋하지 않는다.
6. **바깥 담당이 붙일 부분은 인터페이스 + 로컬 구현체까지만** 만든다. 실제 업체 연동 코드를 지어내지 않는다.
   - `IdentityVerifier` — PASS 본인인증(본인인증 솔루션 담당). 로컬 구현체는 화면에서 받은 이름·생년월일·휴대폰을 그대로 결과로 쓴다.
   - `PiiCipher` — 개인정보 암호화(복지몰 공통 표준). 로컬 구현체는 `{plain}` 접두 값을 그대로 돌려준다.
   - 로컬 구현체와 `/api/auth/identity/local-verify`는 `local` 프로필에서만 등록하고, 다른 프로필에서 잡히면 기동을 실패시킨다.
   - 앞으로 포인트·회원·정산·가상계좌 등 복지몰·솔루션 연동도 같은 방식(`vs-domain` 포트 인터페이스 + `vs-infra` 구현체 + 로컬 가짜)으로 만든다.
7. 프론트는 **이 저장소의 디자인 시스템**(PrimeVue 4 · `src/ws` · `docs/ui-conventions.md`)을 쓴다. 새 UI 라이브러리를 들이지 않는다.
8. **목업을 깨지 않는다.** `VITE_API_BASE`가 없으면 지금 목업 로그인 그대로(GitHub Pages 빌드). `#/sb/**` · `#/sp/**` 화면은 지우지 않는다. `npm run build` · `npm run check:sb`가 계속 통과해야 한다.
9. 공통 파일(`src/app/*`, `src/ws/*`, `src/sb/*`, `src/router.ts`, `package.json`)은 이 저장소 주인(성찬민)이 관리한다. 고쳐야 하면 고치되 **최소로**, 고친 파일과 이유를 handoff에 목록으로 남긴다.
10. 화면 문구·URL에 "관리자/Admin/root"를 쓰지 않는다(RFP MPR-008). 백엔드 주석은 한국어. 변경마다 테스트를 함께 만든다.

## 4. 이번에 만들 것 — `docs/dev/login.md` 그대로

- 로컬 환경(12절): postgres `vs-local-dev-postgres` 5442, redis `vs-local-dev-redis` 6389, API 8090, 프론트는 지금 5320 + `/api` 프록시. H-PMS(5432·8080)와 동시에 띄울 수 있어야 한다.
- 공통코드 조회 `GET /api/codes?groups=…`(인증 필요).
- 로그인 API 10개(9절): `/login` · `/identity/start` · `/identity/callback` · `/identity/local-verify`(local만) · `/identity/complete` · `/logout` · `/me` · `/session` · `/session/extend` · `/password`
- 1차 판정 순서와 문구(5절), 없는 계정 더미 해시 대조
- 본인인증(7절): PASS 결과의 **이름 + 생년월일 + 휴대폰**이 계정과 모두 같아야 통과, 5회 실패 시 폐기, 어느 항목이 틀렸는지 안 알림, `txId` 짝 확인, PASS 결과 저장 안 함
- 세션(6절): Redis `vs:sess:{mngrId}` 1개, 매 요청 sid 대조 + TTL 30분 sliding, 다른 sid면 `AUTH_SESSION_REPLACED`, JWT 절대 12시간, refresh token 없음, Redis 장애 503, `GET /session`은 TTL 안 늘림
- 채널: 관리자 화면은 `channel=ADMIN`(KTO·EZW), `COMP`는 기업 어드민용(이번엔 API만)
- 임시비밀번호: `mustChangePassword` + 서버 인터셉터로 다른 API 403
- 이력(10절): `vs_hist_h`에 `LGIN`
- 화면(11절): `LoginPage.vue` 실제화(2단계), 비밀번호 변경 모달, `SessionGuard`를 서버 만료시각 기준·5분 전 예고·탭 동기화로, 상단바 사용자 표시·로그아웃, 로그인 후 `#/sb/s/SP-CMN-050P`

**하지 않는 것:** 비밀번호 찾기, 계정관리·접속이력 화면, 역할별 메뉴·버튼 실제 제어, 기업 어드민 화면, 실제 PASS 연동, 실제 암호화.

## 5. 완료 기준

`docs/dev/login.md` **13절 15개 항목**을 모두 확인한다. 테스트 계정은 `db/05_local_account_seed.sql`(비밀번호는 파일 머리 주석, 이름·생년월일·휴대폰은 값 그대로).

## 6. 끝나면 남길 것 — `docs/dev/handoff/cursor-01-login.md`

1. 만든 것: 모듈·패키지·주요 클래스·화면 파일 목록
2. **고친 공통 파일 목록과 이유**(3절 9번)
3. 기동 방법: 실제로 돌려 본 명령 순서
4. 완료 기준 15개 항목별 결과(통과 / 실패 / 못 해 봄 + 이유)
5. 테스트 결과: 실행한 명령과 통과·실패 수
6. 설계와 다르게 한 것과 이유
7. 질문 · 막힌 것 · 다음에 할 일 제안

작업은 브랜치(`feat/login-backend`)에서 하고 PR로 올린다. main에 바로 넣지 않는다.

---
