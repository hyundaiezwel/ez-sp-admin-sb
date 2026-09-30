<script setup lang="ts">
/**
 * 접수·자격심사 — AS-IS S-003-02 (난이도 5).
 *
 * 그대로 둔 것: 조회 조건 7종, 사업별 파이프라인 집계, 목록 컬럼, LMS·E-Mail 일괄 발송.
 * 바꾼 것:
 *   ① 사업·연도는 전역 조건이다 — 조회 영역에서 뺐다
 *   ② 상태 변경에 확인 팝업을 둔다. AS-IS는 이 화면만 **누르는 즉시** 바뀌었다(A2 §4)
 *   ③ 집계 숫자를 누르면 그 상태로 목록을 조회한다
 *   ④ 처리 결과를 성공 · 처리 실패 · 통지 실패로 나눠 보고한다
 *   ⑤ 조회 범위(최대 4년)는 입력하는 자리에서 알린다
 */
import { computed, onMounted, ref, watch } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import WsFileView from '../../ws/WsFileView.vue'
import { presetRange, periodError, PRESETS, parseDate, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { BIZ, CO_FG, SCREENING, bizLabel, coFgLabel, stateOf } from '../../sp/codes'
import { ctx, ctxKey, can, needRole } from '../../sp/context'
import { makeIntake, makePipeline, type IntakeRow } from '@fixtures/sp'
import { memo } from '../../sp/stores'

const KW = ['기업명', '접수번호', '사업자번호', '심사담당자', '소재지', '참여경로']
const blank = () => ({ range: presetRange(PRESETS[4]) as Range, growth: '', coFg: '', disabled: '', sts: '', kwType: '기업명', kw: '' })
const f = ref(blank())
const applied = ref(blank())

// 일괄 참여 취소와 같은 행을 본다 — 거기서 취소하면 여기서도 참여취소로 보인다
const all = computed(() => memo('intake', ctxKey(), () => makeIntake(ctxKey(), ctx.year)))
const pipeline = computed(() => makePipeline(ctxKey(), BIZ.map((b) => b.code)))

const hit = (r: IntakeRow) => {
  const a = applied.value
  const k = a.kw.trim()
  const field = { 기업명: r.name, 접수번호: r.receiptNo, 사업자번호: r.bizNo, 심사담당자: r.judge, 소재지: r.region, 참여경로: r.channel }[a.kwType] ?? ''
  const d = parseDate(r.joinedAt)
  return (!a.sts || r.sts === a.sts) && (!a.coFg || r.coFg === a.coFg) && (!a.growth || (a.growth === 'Y') === r.growth) &&
    (!a.disabled || (a.disabled === 'Y') === r.disabled) && (!k || field.includes(k)) &&
    (!a.range[0] || !d || d >= a.range[0]) && (!a.range[1] || !d || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.kw.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(ctxKey, () => { grid.value?.clearSelection(); requery() })

function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요 — 최대 4년까지 조회할 수 있습니다.', 'danger')
  applied.value = { ...f.value }
  grid.value?.clearSelection()
  requery()
}
function reset() { f.value = blank(); search() }

/** 집계 숫자 → 그 사업 · 그 상태로 목록 조회. 다른 사업 행이면 전역 조건을 옮긴다 */
function drill(biz: string, sts: string) {
  if (biz !== '전체' && biz !== ctx.biz) ctx.biz = biz
  f.value = { ...f.value, sts }
  search()
}

/* --- 목록 --------------------------------------------------------------- */
const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const selected = ref(0)
const current = ref<IntakeRow | null>(null)

const btn = (label: string) => `<button type="button" class="ws-cellbtn">${label}</button>`
const columns = [
  { title: '번호', field: 'no', width: 72, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '기업명', field: 'name', minWidth: 170 },
  { title: '사업자번호', field: 'bizNo', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '접수번호', field: 'receiptNo', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '발전모델', field: 'growth', width: 84, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '대상' : '비대상') },
  { title: '기업구분', field: 'coFg', width: 120, formatter: (c: any) => coFgLabel(c.getValue()) },
  { title: '접수일', field: 'joinedAt', width: 104, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '심사담당자', field: 'judge', width: 96, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '자격심사 상태', field: 'sts', width: 150, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
  { title: '변경', field: 'id', width: 72, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: () => btn('변경'), cellClick: (_: any, c: any) => openChange(c.getRow().getData()) },
  { title: '서류', field: 'docs', width: 80, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => btn(`보기 ${c.getValue()}`), cellClick: (_: any, c: any) => openDocs(c.getRow().getData()) },
]

/* --- 처리 --------------------------------------------------------------- */
const changeOpen = ref(false)
const selectOpen = ref(false)
const sendOpen = ref(false)
const docsOpen = ref(false)
const result = ref<{ open: boolean; header: string; ok: number; fails: ResultItem[]; auditId?: string }>({ open: false, header: '', ok: 0, fails: [] })

const CHANGE_TO = ['120', '110', '130', '131', '210', '220']
const labelOf = (c: string) => stateOf(c)?.label ?? c
function openChange(row: IntakeRow) { current.value = row; changeOpen.value = true }
function doChange(p: ActionPayload) {
  const code = CHANGE_TO.find((c) => labelOf(c) === p.option)
  if (!current.value || !code) return
  current.value.sts = code
  reload()
  notify(`${current.value.name} — ${p.option}(으)로 바꿨습니다`, 'success')
}

const picked = () => (grid.value?.selectedData() ?? []) as IntakeRow[]
function doSelect() {
  const rows = picked()
  const bad = rows.filter((r) => !['210', '120', '110'].includes(r.sts))
  const good = rows.filter((r) => !bad.includes(r))
  good.forEach((r) => (r.sts = '220'))
  const noPhone = good.filter((_, i) => i % 7 === 3)
  result.value = {
    open: true, header: '선정 처리 결과', ok: good.length, auditId: `AUD-${Date.now().toString(36).toUpperCase()}`,
    fails: [
      ...bad.map((r) => ({ target: r.name, reason: `지금 상태(${labelOf(r.sts)})에서는 선정할 수 없다`, kind: 'process' as const })),
      ...noPhone.map((r) => ({ target: r.name, reason: '휴대전화번호 정보가 없어 LMS 전송 실패', kind: 'notice' as const })),
    ],
  }
  grid.value?.clearSelection()
  reload()
}
function doSend(p: ActionPayload) {
  const rows = picked()
  const noMail = rows.filter((_, i) => i % 5 === 2)
  result.value = {
    open: true, header: `안내 발송 결과 — ${p.option}`, ok: rows.length - noMail.length,
    fails: noMail.map((r) => ({ target: r.name, reason: 'EMAIL 주소 정보가 없어 E-Mail 전송 실패', kind: 'notice' as const })),
  }
}
function openDocs(row: IntakeRow) { current.value = row; docsOpen.value = true }
const docs = computed(() => [
  { name: '참여신청서.pdf', kind: 'PDF', size: '412KB' },
  { name: '사업자등록증.pdf', kind: 'PDF', size: '188KB' },
  { name: '재직증빙_4대보험.pdf', kind: 'PDF', size: '1.2MB' },
  { name: '근로자명부.xlsx', kind: 'XLSX', size: '64KB' },
].slice(0, current.value?.docs ?? 2))

const fmt = (n: number) => n.toLocaleString('ko-KR')
const INTAKE_COLS: [string, string][] = [['220', '선정완료'], ['130', '보완필요'], ['131', '심사 미대상'], ['139', '참여취소'], ['210', '선정대기'], ['120', '정상접수']]
const BASIC_COLS = ['입금대기', '입금완료', '참여개시', '참여취소(이용정지·환불)', '참여취소(미입금·미제출·파기)']
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="i-from">접수일</label></th>
        <td colspan="3"><WsPeriod id="i-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row">자격심사 상태</th>
        <td colspan="3">
          <div class="ws-choices" role="radiogroup" aria-label="자격심사 상태">
            <div class="ws-radio"><RadioButton v-model="f.sts" input-id="i-s-all" name="i-sts" value="" /><label for="i-s-all">전체</label></div>
            <div v-for="c in SCREENING" :key="c" class="ws-radio"><RadioButton v-model="f.sts" :input-id="`i-s-${c}`" name="i-sts" :value="c" /><label :for="`i-s-${c}`">{{ labelOf(c) }}</label></div>
          </div>
        </td>
      </tr>
      <tr>
        <th scope="row"><label for="i-kw">검색어</label></th>
        <td>
          <div class="kw">
            <Select v-model="f.kwType" :options="KW" aria-label="검색어 구분" class="kw__t" />
            <InputText id="i-kw" v-model="f.kw" fluid :placeholder="`${f.kwType} 입력`" />
          </div>
        </td>
        <th scope="row">발전모델</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="발전모델 대상">
            <div v-for="[v, l] in [['', '전체'], ['Y', '대상'], ['N', '비대상']]" :key="v" class="ws-radio"><RadioButton v-model="f.growth" :input-id="`i-g-${v}`" name="i-g" :value="v" /><label :for="`i-g-${v}`">{{ l }}</label></div>
          </div>
        </td>
      </tr>
      <template #detail>
        <tr>
          <th scope="row">기업구분</th>
          <td colspan="3">
            <div class="ws-choices" role="radiogroup" aria-label="기업구분">
              <div class="ws-radio"><RadioButton v-model="f.coFg" input-id="i-c-all" name="i-c" value="" /><label for="i-c-all">전체</label></div>
              <div v-for="c in CO_FG" :key="c.code" class="ws-radio"><RadioButton v-model="f.coFg" :input-id="`i-c-${c.code}`" name="i-c" :value="c.code" /><label :for="`i-c-${c.code}`">{{ c.label }}</label></div>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row">장애인 채용</th>
          <td colspan="3">
            <div class="ws-choices" role="radiogroup" aria-label="장애인 근로자 채용 여부">
              <div v-for="[v, l] in [['', '전체'], ['Y', '예'], ['N', '아니요']]" :key="v" class="ws-radio"><RadioButton v-model="f.disabled" :input-id="`i-d-${v}`" name="i-d" :value="v" /><label :for="`i-d-${v}`">{{ l }}</label></div>
            </div>
          </td>
        </tr>
      </template>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">사업별 참여 현황</h2>
          <span class="ws-fresh ws-fresh--live">실시간</span>
          <span class="ws-desc">단위 명 · 숫자를 누르면 그 상태로 아래 목록을 조회한다</span>
        </div>
        <div class="ws-tit__r"><RouterLink to="/sp/basic-info" class="lnk">기초정보 심사로 가기 →</RouterLink></div>
      </div>
      <div class="ws-xscroll">
        <table class="ws-gtb">
          <caption class="ws-desc" style="caption-side: bottom; text-align: left; padding-top: 6px">
            파란 막대가 붙은 행이 지금 전역 조건의 사업이다. 기초정보 묶음은 다음 화면(기초정보 심사)의 단계라 여기서는 숫자만 보인다.
          </caption>
          <thead>
            <tr>
              <th scope="col" rowspan="2">사업</th>
              <th scope="col" rowspan="2">총 참여인원</th>
              <th scope="col" rowspan="2">최종선정<br />대상자</th>
              <th scope="col" rowspan="2">심사중</th>
              <th scope="colgroup" colspan="6" class="g">접수</th>
              <th scope="colgroup" colspan="5" class="g">기초정보</th>
            </tr>
            <tr>
              <th v-for="([, l], i) in INTAKE_COLS" :key="l" scope="col" :class="{ g: i === 0 }">{{ l }}</th>
              <th v-for="(l, i) in BASIC_COLS" :key="l" scope="col" :class="{ g: i === 0 }">{{ l }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pipeline" :key="p.biz" :class="{ 'is-total': p.biz === '전체', 'is-ctx': p.biz === ctx.biz }">
              <th scope="row">{{ p.biz === '전체' ? '전체' : bizLabel(p.biz) }}</th>
              <td class="ws-num">{{ fmt(p.total) }}</td>
              <td class="ws-num">{{ fmt(p.selected) }}</td>
              <td class="ws-num">
                <button v-if="p.judging" type="button" class="ws-cell-link" @click="drill(p.biz, '110')">{{ fmt(p.judging) }}</button>
                <span v-else class="ws-cell-zero">0</span>
              </td>
              <td v-for="([c], i) in INTAKE_COLS" :key="c" class="ws-num" :class="{ g: i === 0 }">
                <button v-if="p.intake[c]" type="button" class="ws-cell-link" :aria-label="`${p.biz === '전체' ? '전체' : bizLabel(p.biz)} ${labelOf(c)} ${fmt(p.intake[c])}명 — 목록 조회`" @click="drill(p.biz, c)">{{ fmt(p.intake[c]) }}</button>
                <span v-else class="ws-cell-zero">0</span>
              </td>
              <td v-for="(n, i) in p.basic" :key="i" class="ws-num" :class="{ g: i === 0 }">{{ fmt(n) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">접수 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">선택 {{ selected }}건 · {{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span>
        </div>
        <div class="ws-tit__r">
          <WsDownload :total="total" :limit="20000" />
          <span class="ws-sep" aria-hidden="true" />
          <span v-if="!can('bulk-send')" class="ws-desc">발송은 {{ needRole('bulk-send') }} 이상</span>
          <Button label="LMS·E-Mail 발송" severity="secondary" outlined :disabled="!selected || !can('bulk-send')" @click="sendOpen = true" />
          <Button label="선정 처리" severity="contrast" :disabled="!selected" @click="selectOpen = true" />
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid ref="grid" :columns="columns" :rows="rows" height="auto" @selection-change="selected = $event" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>사업 · 참여년도는 오른쪽 위 <b>전역 조건</b>에서 바꾼다 — 열린 화면 전부에 적용된다.</li>
        <li>상태 <b>변경</b>은 확인 팝업을 거친다. AS-IS는 이 화면만 누르는 즉시 바뀌었다.</li>
        <li>쪽을 넘기면 선택이 풀린다 — 보이지 않는 행이 일괄 처리에 섞이지 않게 한다.</li>
        <li>상태 확인 — 검색어에 <b>오류</b>를 넣으면 실패 화면이 나온다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="changeOpen" header="자격심사 상태 변경"
      :target="current ? `${current.name} (${current.receiptNo}) — 지금 ${labelOf(current.sts)}` : ''"
      :reason="{ label: '바꿀 상태', options: CHANGE_TO.map(labelOf) }"
      notice="보완필요 · 선정완료로 바꾸면 기업담당자에게 LMS 및 E-Mail이 발송됩니다."
      confirm-label="변경" @confirm="doChange"
    />
    <WsActionDialog
      v-model:visible="selectOpen" header="선정 처리" :target="`선택한 ${selected}개 기업을 선정완료로 바꿉니다`"
      notice="선정 결과 안내 LMS 및 E-Mail이 기업담당자에게 발송됩니다."
      confirm-label="선정 처리" @confirm="doSelect"
    >
      <p class="ws-desc">정상접수 · 심사중 · 선정대기만 선정할 수 있다. 나머지는 결과에서 처리 실패로 돌아온다.</p>
    </WsActionDialog>
    <WsActionDialog
      v-model:visible="sendOpen" header="LMS · E-Mail 일괄 발송" :target="`선택한 ${selected}개 기업 담당자`"
      :reason="{ label: '발송할 안내', options: ['보완 요청 안내', '선정 결과 안내', '기초정보 제출 안내', '직접 입력'], other: '직접 입력', max: 1000 }"
      notice="선택한 기업담당자 전원에게 즉시 발송됩니다. 발송은 되돌릴 수 없습니다."
      confirm-label="발송" @confirm="doSend"
    />
    <WsResultDialog v-model:visible="result.open" :header="result.header" :ok="result.ok" :fails="result.fails" :audit-id="result.auditId" />
    <WsFileView v-model:visible="docsOpen" :title="current ? `${current.name} 제출서류` : '제출서류'" :files="docs" />
  </div>
</template>

<style scoped>
.kw { display: flex; gap: 6px; }
.kw__t { width: 120px; flex: none; }
.lnk { color: var(--ws-text-link); font-size: var(--ws-font-size-md); }
.ws-gtb thead th { white-space: nowrap; font-size: var(--ws-font-size-md); line-height: 18px; padding: 6px 8px; }
</style>
