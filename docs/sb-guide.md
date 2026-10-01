# SB 화면 작성 가이드

지원 사업 관리 SB 목업(`#/sb`)에 화면 하나를 더하는 방법. 본보기는 `SP-PRT-010L`(신청목록) — 명세 `src/specs/SP-PRT-010L.json`, 화면 `src/pages/sb/SP-PRT-010L.vue`.

## 1. 파일 세 개만 만든다

| 무엇 | 위치 | 비고 |
|---|---|---|
| 명세 | `src/specs/<CODE>.json` | 타입 정본은 `src/sb/spec.ts`의 `Spec`. 끝나면 `"status": "complete"` |
| 화면 | `src/pages/sb/<CODE>.vue` | **첫 줄 `<!-- SB-DONE -->`**(끝났을 때). 라우터 · 메뉴는 고치지 않는다 — `/sb/s/<CODE>`가 파일을 찾아 그린다 |
| 가짜 데이터 | `fixtures/sb/<배치ID>.ts` | 여러 배치가 같이 볼 기업 · 노동자 · 신청 건은 `fixtures/sb/common.ts` |

화면 파일이 없으면 같은 주소에 설계 카드(명세 요약)가 뜬다. 공통 파일(`src/sb/*`, `src/app/*`, `src/ws/*`, `src/router.ts`, `package.json`)은 고치지 않는다 — 버그는 보고한다.

점검: `npm run check:sb` — 명세 존재 · status · 필수 배열(requirements · functions · scenarios · permissions.rows) · 역할 행 전부 · 시나리오(정상 + 예외/권한) · SB-DONE · 모달 코드가 화면에 나오는지.

## 2. 명세 쓰는 법

- 요구사항은 EARS 5패턴(`보편` · `상태` "~인 동안" · `이벤트` "~하면" · `선택` "~인 경우" · `원치않는상황` "만약 ~하면"). 주어는 "시스템은", 업무 용어는 「용어」.
- 모든 항목에 `level`: `확인`(근거 있음) · `추정` · `미확인`. 근거는 `source`에(예 `AS-IS S-003-04`, `IA 03 …`).
- ID: `REQ-<CODE>-01`, `FN-<CODE>-01`, `TS-<CODE>-01`, `Q-<CODE>-01`, 모달 `<CODE>-M1`.
- 시나리오 `gherkin`은 한 문자열에 `\n`으로 줄을 나눈다. 키워드 Given/When/Then/And, 내용은 한국어.
- `permissions.rows`는 `src/sb/roles.ts`의 `ROLES` **전부**를 한 줄씩. `actions`는 `Action` 코드(`view` · `status` · `download-pii` …). 명세 행은 기본값(`DEFAULT_MATRIX`)을 이긴다.
- `data[].entity`는 `ENTITIES`(spec.ts) 문자열 그대로(`'E05 참여 건'`). `states[].from/to`는 `src/sp/codes.ts`의 `STATES` 코드(110~840).
- 모르는 것은 지어내지 않고 `openQuestions`에. `effort`는 `null`로 둔다.

## 3. 쓰는 부품

```ts
// 화면 골격 — 루트 .ws-page, 첫 자식 <PageHead /> (제목 · 경로 · '명세' 버튼은 셸이 채운다)
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'          // 로딩 · 오류 · 빈 · 정상
import { usePaged } from '../../app/usePaged'               // 서버 페이징 목업
import TabGrid from '../../grid/TabGrid.vue'                // 목록 그리드(체크박스 열 자동)
import WsSearch from '../../ws/WsSearch.vue'                // 조회 영역 — <tr>만 넘긴다
import WsPeriod from '../../ws/WsPeriod.vue'                // 기간 입력
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'            // 엑셀 세 관문(상한 · 재인증 · 사유)
import WsActionDialog from '../../ws/WsActionDialog.vue'    // 처리 확인 모달(사유 · 날짜 · 대외 통지)
import WsResultDialog from '../../ws/WsResultDialog.vue'    // 부분 실패 결과
import WsFileView from '../../ws/WsFileView.vue'            // 첨부 미리보기
import WsMasked from '../../ws/WsMasked.vue'                // 가린 값 열람(상세)
import { mask } from '../../ws/mask'                        // 목록 가림
import { notify } from '../../ws/notify'                    // 토스트
import { statusHtml } from '../../sp/status'                // 상태 코드 → 뱃지 HTML(그리드)
import { STATES, stateOf, BIZ, CO_FG } from '../../sp/codes'
import { ctx } from '../../sp/context'                      // 전역 조건 — ctx.year · ctx.biz
// SB 전용
import SbCan from '../../sb/SbCan.vue'                      // 버튼 권한 울타리
import SbCode from '../../sb/SbCode.vue'                    // 모달 코드 표시
import { can, denyTip } from '../../sb/context'             // 권한 판단
import { routeOf } from '../../sb/screens'                  // '/sb/s/<CODE>'
import { COMPANIES, WORKERS, applications } from '@fixtures/sb/common'
```

구성 규칙은 README의 "새 화면 만드는 순서" · "그리드 규칙"을 따른다. 대시보드 · 통계는 `.ws-page--canvas` + `.ws-card`.

## 4. 권한 버튼 — 숨기지 않고 끈다

```vue
<SbCan action="download-pii"><WsDownload :total="total" modal-code="SP-XXX-010L-M2" /></SbCan>
<SbCan action="approve"><Button label="승인" severity="contrast" @click="…" /></SbCan>
<SbCan action="bulk"><SbCan action="status"><Button label="일괄 변경" /></SbCan></SbCan>  <!-- 둘 다 필요 -->
```

`SbCan`은 권한이 없으면 안의 버튼을 끄고 툴팁 '<역할>은 <동작> 권한 없음'을 단다. 화면 코드는 셸이 넘겨 주므로 `code`를 안 줘도 된다(다른 화면 권한을 볼 때만 `code="…"`).

그리드 칸 버튼(HTML 문자열)은 `can()`으로 끈다 — 역할이 바뀌면 열이 다시 그려지게 `columns`를 `computed`로:

```ts
const columns = computed(() => {
  const ok = can(CODE, 'status'), tip = denyTip(CODE, 'status')
  return [ /* … */ { title: '변경', formatter: () => `<button class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>변경</button>`,
    cellClick: (_: any, c: any) => ok && open(c.getRow().getData()) } ]
})
```

## 5. 모달 코드 — 모달마다 하나

명세 `modals[].code`(`<CODE>-M1` …)가 화면 파일에 글자 그대로 나와야 한다(점검이 본다).

```vue
<WsActionDialog v-model:visible="open" code="SP-XXX-010L-M1" header="…" … />   <!-- 푸터 왼쪽에 코드 -->
<WsDownload :total="total" modal-code="SP-XXX-010L-M2" />                        <!-- 사유 모달 -->
<Dialog v-model:visible="open" modal header="…">                                  <!-- 직접 만든 모달 -->
  …
  <template #footer>
    <SbCode code="SP-XXX-010L-M3" />
    <Button label="취소" severity="secondary" outlined /><Button label="확인" />
  </template>
</Dialog>
```

## 6. 목록 → 상세

상세는 같은 주소 하나(`/sb/s/<CODE>D`)에 `?id=`로 건을 넘긴다. 상세 화면은 `useRoute().query.id`를 **watch** 한다 — 탭이 경로 단위로 살아 있어 다른 id로 다시 들어와도 같은 화면 인스턴스다.

```ts
router.push({ path: routeOf('SP-XXX-010D'), query: { id: row.id } })
```

## 7. 가짜 데이터

- 전부 지어낸 값. 실제 기관 · 기업 · 사람 이름, 사업자번호 · 계좌 · 전화를 쓰지 않는다.
- 사업자번호 `000-00-0000N`, 전화 `010-0000-NNNN`, 메일 `@example.com`, 이름은 목록에서 `mask(v, 'name')`(`김*수`).
- 사업은 `BIZ-26-01`~`04`(`src/sp/codes.ts` BIZ), 참여 상태는 `STATES` 코드(110~840)만.
- 시드 고정 난수: `rand('<배치ID>-<무엇>')`(common.ts) — 새로고침해도 같은 값.
- 배치 파일끼리 import 하지 않는다. 같이 봐야 하면 common.ts에 있는 것을 쓰고, 없으면 보고한다.

## 8. 일괄 처리 화면 규격

업로드 · 조건 조회로 여러 건을 한 번에 처리하는 화면(엑셀 일괄 등록, 일괄 취소 등)은 아래 틀을 따른다.
본보기: `src/pages/sp/UploadPage.vue`(엑셀 일괄 등록), `src/pages/sp/BulkCancelPage.vue`(일괄 참여 취소) —
먼저 읽고 구성을 그대로 따른다. SB 쪽 적용 예는 `src/pages/sb/SP-PRT-070P.vue` · `SP-PRT-080P.vue`.

1. 맨 위 단계 표시 `WsStepTrack`(예: 양식 · 조건 → 올리기 → 검증 결과 → 등록 결과 / 일괄취소는 조건 → 대상 확인 → 예외 지정 → 실행 결과).
2. 조건은 입력 표 `<table class="ws-tb">` + `<colgroup>`(라벨 칸 고정 폭) + `th.req`로 필수 표시. `Select`는 `fluid`로 칸을 채운다 — 인라인 `style="width: …"` 금지.
3. 양식 내려받기 같은 보조 동작은 구획 제목줄(`ws-tit`) 오른쪽 버튼(`ws-tit__r`)에 둔다.
4. 파일은 `src/ws/WsUpload.vue`로 받는다(`:accept="['xlsx', 'xls']"` 등, 제약 문구를 자동으로 보여 준다). 날 `<input type="file">` 금지.
5. 검증 결과 · 대상 목록은 기존 표/그리드(`ws-gtb`) + 건수(`ws-total`)로 보이고, 행별 오류 · 예외는 행 안에 표시한다.
6. 실행 버튼은 하단 `ws-btnbox` > `ws-btnbox__c`(가운데 정렬)에 둔다. 비가역 처리(등록 확정 · 일괄 취소 실행)는 확인 모달(`WsActionDialog` 또는 직접 만든 `Dialog`)과 결과 모달(`WsResultDialog`)을 거친다 — 모달 코드(`SbCode`/`code`/`modal-code`, 명세 `modals[].code`)는 그대로 유지한다.
7. 안내 문구는 `ws-msg` 상자에 둔다.

금지: 인라인 `style="width: …"`로 Select · 영역 폭 고정, 날 `<input type="file">`, 정의되지 않은 `ws-form`/`ws-form__row`/`ws-form__l`(라벨 · 칸 정렬이 없다 — 대신 `ws-tb`를 쓴다).

## 9. 하지 않는 것

- push · 원격 · 배포 · commit, 새 의존성(`npm install`).
- 공통 파일 수정, 다른 배치의 파일 수정.
- AS-IS 서버 주소 · 필드명 · 알림 템플릿 ID · 요구서 조항 번호를 글자로 쓰기. AS-IS 화면 ID(`S-003-04`)와 화면명은 써도 된다.
- 이미 끝난 화면(명세 `complete` + 화면 `SB-DONE`) 다시 만들기.
