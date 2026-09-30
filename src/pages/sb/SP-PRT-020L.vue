<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-020L 기업목록 — 선정완료 이후 참여 건을 사업연도 단위로 조회한다.
 * 행을 누르면 기업상세(SP-PRT-020D). 목록에서는 일괄 참여개시 · 일괄 입금기한 변경 · 안내 발송만 한다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsCountTabs, { type CountTab } from '../../ws/WsCountTabs.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { CO_FG, stateOf, bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { mask } from '../../ws/mask'
import { participations, type SbParticipation } from '@fixtures/sb/B3'

const CODE = 'SP-PRT-020L'
const router = useRouter()
const labelOf = (c: string) => stateOf(c)?.label ?? c
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const TABS = [
  { id: 'all', codes: [] as string[], label: '전체' },
  { id: '410', codes: ['410'], label: '최종제출' },
  { id: '510', codes: ['510'], label: '입금 대기' },
  { id: '520', codes: ['520'], label: '입금완료' },
  { id: '6', codes: ['610', '611', '612', '613', '614', '615', '616'], label: '참여개시' },
  { id: 'end', codes: ['390', '590', '710', '810', '820', '830', '840'], label: '종료·환불' },
]
const tab = ref('all')

const blank = () => ({ name: '', bizNo: '', coFg: '', sts: '', vacct: '', dueOnly: false })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => participations(ctx.biz))
const codesOf = () => TABS.find((t) => t.id === tab.value)!.codes
const hit = (r: SbParticipation) => {
  const a = applied.value
  return (codesOf().length === 0 || codesOf().includes(r.sts)) &&
    (!a.name.trim() || r.name.includes(a.name.trim())) &&
    (!a.bizNo.trim() || r.bizNo.replace(/-/g, '').includes(a.bizNo.replace(/-/g, '').trim())) &&
    (!a.coFg || r.coFg === a.coFg) && (!a.sts || r.sts === a.sts) &&
    (!a.vacct.trim() || (r.vAccount.no ?? '').includes(a.vacct.trim())) &&
    (!a.dueOnly || r.vAccount.dueUnpaid)
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => ctx.biz, () => requery())
watch(tab, () => requery())
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); tab.value = 'all'; search() }

const tabs = computed<CountTab[]>(() => TABS.map((t) => ({
  id: t.id, label: t.label, count: all.value.filter((r) => t.codes.length === 0 || t.codes.includes(r.sts)).length,
})))

/* --- 목록 · 선택 ------------------------------------------------------------ */
const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const selCount = ref(0)
const sel = () => (grid.value?.selectedData() ?? []) as SbParticipation[]
const columns = computed(() => [
  { title: '번호', field: 'no', width: 60, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '기업명', field: 'name', minWidth: 150 },
  { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업구분', field: 'coFg', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => CO_FG.find((x) => x.code === c.getValue())?.label ?? c.getValue() },
  { title: '참여인원', headerHozAlign: 'center', columns: [
    { title: '최초', field: 'participants', width: 56, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().initial },
    { title: '추가', field: 'participants', width: 56, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().extra },
    { title: '최종', field: 'participants', width: 56, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().final },
  ] },
  { title: '가상계좌', field: 'vAccount', width: 150, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue().no ?? '미발급' },
  { title: '입금기한', field: 'depositDeadline', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() ?? '—' },
  { title: '분담금 납부', field: 'vAccount', width: 150, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const v = c.getValue(); return v.target ? `${won(v.paid)} / ${won(v.target)}` : '—' } },
  { title: '담당자명', field: 'manager', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '참여상태', field: 'sts', width: 130, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
])
const openDetail = (r: SbParticipation) => router.push({ path: routeOf('SP-PRT-020D'), query: { id: r.id } })

/* --- 일괄 참여개시(M1) ------------------------------------------------------ */
const startOpen = ref(false)
const startElig = computed(() => ({ ok: sel().filter((r) => r.sts === '520'), no: sel().filter((r) => r.sts !== '520') }))
function doStart() {
  startElig.value.ok.forEach((r) => { r.sts = '611' })
  result.value = { open: true, header: '일괄 참여개시 결과', ok: startElig.value.ok.length, skipped: startElig.value.no.length, fails: [] }
  grid.value?.clearSelection(); reload()
}

/* --- 일괄 입금기한 변경(M2) -------------------------------------------------- */
const dueOpen = ref(false)
const dueElig = computed(() => ({ ok: sel().filter((r) => ['510', '613'].includes(r.sts)), no: sel().filter((r) => !['510', '613'].includes(r.sts)) }))
function doDue(p: ActionPayload) {
  if (!p.date) return notify('입금기한은 오늘 이후로 정하세요.', 'danger')
  const y = p.date.getFullYear(), m = String(p.date.getMonth() + 1).padStart(2, '0'), d = String(p.date.getDate()).padStart(2, '0')
  dueElig.value.ok.forEach((r) => { r.depositDeadline = `${y}.${m}.${d}` })
  result.value = { open: true, header: '일괄 입금기한 변경 결과', ok: dueElig.value.ok.length, skipped: dueElig.value.no.length, fails: [] }
  grid.value?.clearSelection(); reload()
}

/* --- 안내 발송(M3) ----------------------------------------------------------- */
const sendOpen = ref(false)
function doSend(p: ActionPayload) {
  notify(`${sel().length}곳에 ${p.option} 안내를 발송했습니다.`, 'success')
  grid.value?.clearSelection()
}

const result = ref<{ open: boolean; header: string; ok: number; fails: ResultItem[]; skipped?: number }>({ open: false, header: '', ok: 0, fails: [] })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="c-name">기업명</label></th>
        <td><InputText id="c-name" v-model="f.name" fluid placeholder="기업명 일부" /></td>
        <th scope="row"><label for="c-biz">사업자등록번호</label></th>
        <td><InputText id="c-biz" v-model="f.bizNo" fluid placeholder="숫자만 입력해도 된다" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="c-cofg">기업구분</label></th>
        <td><Select v-model="f.coFg" input-id="c-cofg" :options="[{ label: '전체', code: '' }, ...CO_FG]" option-label="label" option-value="code" placeholder="전체" fluid /></td>
        <th scope="row"><label for="c-vacct">가상계좌번호</label></th>
        <td><InputText id="c-vacct" v-model="f.vacct" fluid placeholder="가상계좌번호 일부" /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <WsCountTabs v-model="tab" :tabs="tabs" label="참여상태" />
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">기업 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">{{ bizLabel(ctx.biz) }} · 선택 {{ selCount }}건 · 행을 누르면 기업상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="send"><Button label="안내 발송" severity="secondary" outlined :disabled="!selCount" @click="sendOpen = true" /></SbCan>
          <SbCan action="bulk"><SbCan action="status"><Button label="일괄 입금기한 변경" severity="secondary" outlined :disabled="!selCount" @click="dueOpen = true" /></SbCan></SbCan>
          <SbCan action="bulk"><SbCan action="status"><Button label="일괄 참여개시" :disabled="!selCount" @click="startOpen = true" /></SbCan></SbCan>
          <SbCan action="download-pii"><WsDownload :total="total" :limit="20000" modal-code="SP-PRT-020L-M4" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid ref="grid" :columns="columns" :rows="rows" height="auto" @row-click="openDetail" @selection-change="selCount = $event" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>일괄 참여개시 · 일괄 입금기한 변경은 <b>일괄 처리</b> 권한(총괄 이상)이 있어야 켜진다. {{ denyTip(CODE, 'bulk') || '' }}</li>
        <li>등록승인 · 확인서 파기 · 승인취소 · 참여취소 같은 건별 처리는 기업상세에서 한다.</li>
        <li>상태 확인 — 기업명에 <b>오류</b>를 넣으면 실패 화면이 나온다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="startOpen" code="SP-PRT-020L-M1" header="일괄 참여개시"
      :target="`선택 ${selCount}건 — 적격(입금완료) ${startElig.ok.length}건 · 제외 ${startElig.no.length}건`"
      notice="참여개시 안내 LMS · E-Mail이 발송되고, 복지몰 회원 생성 · 포인트 배정이 요청됩니다."
      confirm-label="참여개시" @confirm="doStart"
    />
    <WsActionDialog
      v-model:visible="dueOpen" code="SP-PRT-020L-M2" header="일괄 입금기한 변경"
      :target="`선택 ${selCount}건 — 적격(입금중) ${dueElig.ok.length}건 · 제외 ${dueElig.no.length}건`"
      :date="{ label: '새 입금기한' }"
      notice="입금 요청 LMS · E-Mail이 재발송됩니다."
      confirm-label="변경" @confirm="doDue"
    />
    <WsActionDialog
      v-model:visible="sendOpen" code="SP-PRT-020L-M3" header="안내 발송"
      :target="`선택 ${selCount}곳`"
      :reason="{ label: '안내 종류', options: ['가입독려', '납부안내', '미납안내'] }"
      confirm-label="발송" @confirm="doSend"
    />
    <WsResultDialog v-model:visible="result.open" :header="result.header" :ok="result.ok" :fails="result.fails" :skipped="result.skipped" />
    <SbCode v-if="result.open" code="SP-PRT-020L-M5" style="display: none" />
  </div>
</template>
