<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-010L 신청목록 — 배치 화면의 본보기.
 *
 * 따라 할 것:
 *   ① 루트 `.ws-page` + 첫 자식 `<PageHead />` — 제목 · 경로 · '명세' 버튼은 셸이 채운다
 *   ② 조회는 `WsSearch` + `usePaged` + `QueryState` + `TabGrid` + `WsPager`
 *   ③ 버튼 권한은 `<SbCan action>`으로 감싼다 — 숨기지 않고 끈다. 그리드 칸 버튼은 `can()`으로 disabled
 *   ④ 모달마다 코드 — WsActionDialog `code`, WsDownload `modal-code`, 직접 만든 Dialog는 푸터에 `<SbCode>`
 *   ⑤ 데이터는 fixtures/sb/ 에서
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { CO_FG, stateOf, bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { mask } from '../../ws/mask'
import { applications, type SbApplication } from '@fixtures/sb/common'

const CODE = 'SP-PRT-010L'
const router = useRouter()

/** 자격심사 상태 — IA 상태값 정책 7종 */
const STS = ['110', '130', '120', '220', '131', '139', '210']
const labelOf = (c: string) => stateOf(c)?.label ?? c

/* --- 조회 --------------------------------------------------------------- */
const blank = () => ({ range: presetRange(PRESETS[4]) as Range, name: '', bizNo: '', coFg: '', sts: 'ALL' })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => applications(ctx.biz))

const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: SbApplication) => {
  const a = applied.value
  const d = day(r.appliedAt)
  return (a.sts === 'ALL' || r.sts === a.sts) && (!a.coFg || r.coFg === a.coFg) &&
    (!a.name.trim() || r.name.includes(a.name.trim())) && (!a.bizNo.trim() || r.bizNo.replace(/-/g, '').includes(a.bizNo.replace(/-/g, '').trim())) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => ctx.biz, () => requery())

function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요 — 최대 4년까지 조회할 수 있습니다.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

/* --- 목록 --------------------------------------------------------------- */
/** 칸 안 버튼은 HTML 문자열이라 SbCan을 못 쓴다 — can()으로 disabled + title. 역할이 바뀌면 열을 다시 만든다 */
const cellBtn = (label: string, ok: boolean, tip: string) =>
  `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}" aria-label="${label} — ${tip}"`}>${label}</button>`
const CHANGEABLE = ['110', '130', '120']
const columns = computed(() => {
  const ok = can(CODE, 'status')
  const tip = denyTip(CODE, 'status')
  return [
    { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
    { title: '신청번호', field: 'applyNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '신청일시', field: 'appliedAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '기업명', field: 'name', minWidth: 140 },
    { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '담당자명', field: 'manager', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
    { title: '담당자 연락처', field: 'phone', width: 112, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'phone') },
    { title: '신청상태', field: 'sts', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
    { title: '최종처리일시', field: 'lastAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
    {
      title: '심사', field: 'id', width: 64, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => (CHANGEABLE.includes(c.getRow().getData().sts) ? cellBtn('변경', ok, tip) : '<span class="ws-desc">—</span>'),
      cellClick: (_: any, c: any) => { if (ok && CHANGEABLE.includes(c.getRow().getData().sts)) openChange(c.getRow().getData()) },
    },
  ]
})
const openDetail = (r: SbApplication) => router.push({ path: routeOf('SP-PRT-010D'), query: { id: r.id } })

/* --- 자격심사 상태 변경(M1) ---------------------------------------------- */
const changeOpen = ref(false)
const current = ref<SbApplication | null>(null)
/** 심사중 → 정상접수 · 심사보류(보완필요) · 심사 미대상 · 참여취소. 보완필요 · 정상접수 건도 다시 심사한다 */
const TARGETS: Record<string, string[]> = { '110': ['120', '130', '131', '139'], '130': ['120', '131', '139'], '120': ['130', '131', '139'] }
const ACTION_LABEL: Record<string, string> = { '120': '정상접수', '130': '심사보류(보완필요)', '131': '심사 미대상', '139': '참여취소' }
const options = computed(() => (TARGETS[current.value?.sts ?? ''] ?? []).map((c) => ACTION_LABEL[c]))
function openChange(r: SbApplication) { current.value = r; changeOpen.value = true }
const reason = ref('')
function doChange(p: ActionPayload) {
  const to = Object.keys(ACTION_LABEL).find((c) => ACTION_LABEL[c] === p.option)
  if (!current.value || !to) return
  if (to === '130' && reason.value.trim().length < 5) return notify('보완 사유를 5자 이상 입력하세요.', 'danger')
  current.value.sts = to
  const d = new Date()
  current.value.lastAt = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  reason.value = ''
  reload()
  notify(`${current.value.name} — ${labelOf(to)}(으)로 바꿨습니다${to === '130' || to === '139' ? ' · 기업 담당자에게 안내가 발송됩니다' : ''}`, 'success')
}

const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="a-from">신청일</label></th>
        <td colspan="3"><WsPeriod id="a-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="a-name">기업명</label></th>
        <td><InputText id="a-name" v-model="f.name" fluid placeholder="기업명 일부" /></td>
        <th scope="row"><label for="a-biz">사업자등록번호</label></th>
        <td><InputText id="a-biz" v-model="f.bizNo" fluid placeholder="숫자만 입력해도 된다" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="a-sts">신청상태</label></th>
        <td><Select v-model="f.sts" input-id="a-sts" :options="[{ l: '전체', v: 'ALL' }, ...STS.map((c) => ({ l: labelOf(c), v: c }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
        <th scope="row"><label for="a-cofg">기업구분</label></th>
        <td><Select v-model="f.coFg" input-id="a-cofg" :options="[{ label: '전체', code: '' }, ...CO_FG]" option-label="label" option-value="code" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">신청 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">{{ bizLabel(ctx.biz) }} · 신청일시 최신순 · 행을 누르면 신청상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="20000" modal-code="SP-PRT-010L-M2" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>사업은 오른쪽 위 <b>전역 조건</b>에서 바꾼다. 역할은 상단바 <b>역할</b>에서 — 역할에 따라 변경 · 엑셀 버튼이 꺼진다.</li>
        <li>목록에서는 심사중 · 보완필요 · 정상접수 건의 <b>자격심사 상태</b>만 바꾼다. 선정완료 · 반려는 신청상세에서 처리한다.</li>
        <li>담당자 이름 · 연락처는 가려 보인다. 엑셀은 사유를 등록해야 내려받는다.</li>
        <li>상태 확인 — 기업명에 <b>오류</b>를 넣으면 실패 화면이 나온다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="changeOpen" code="SP-PRT-010L-M1" header="자격심사 상태 변경"
      :target="current ? `${current.name} (${current.applyNo}) — 지금 ${labelOf(current.sts)}` : ''"
      :reason="{ label: '처리', options }"
      notice="심사보류(보완필요) · 참여취소로 바꾸면 기업 담당자에게 LMS 및 E-Mail이 발송됩니다."
      confirm-label="변경" @confirm="doChange"
    >
      <label for="a-why" class="ws-desc">보완 사유 — 심사보류를 고르면 필수(5자 이상)</label>
      <InputText id="a-why" v-model="reason" fluid maxlength="200" placeholder="예: 재직증빙 서류 누락" />
    </WsActionDialog>
  </div>
</template>
