<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-030L 잔액현황 목록 — 기업 가상계좌 잔액을 재원 2개(기업+개인 · 지원기관) ×
 * 단계 4개(최초입금 · 출금 · 환불 · 잔여)로 대조한다. 조회 전용 · 개인정보 없음 — 사유 없이
 * 내려받는다(ponytail: WsDownload는 늘 사유 모달을 여는 공용 컴포넌트라 직접 버튼으로 구현했다).
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import { usePaged } from '../../app/usePaged'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import { CO_FG } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { BALANCES } from '@fixtures/sb/B5'

const CODE = 'SP-STL-030L'
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const unit = ref<'원' | '천원' | '백만원'>('원')
const div = computed(() => (unit.value === '원' ? 1 : unit.value === '천원' ? 1_000 : 1_000_000))
const money = (n: number) => Math.round(n / div.value).toLocaleString('ko-KR') + (unit.value === '원' ? '원' : unit.value)

const blank = () => ({ q: '', coFg: '', dev: '', onlyIssue: false })
const f = ref(blank())
const applied = ref(blank())
function search() { applied.value = { ...f.value }; first.value = 0; reload() }
function reset() { f.value = blank() }

const companyOf = (id: string) => COMPANIES.find((c) => c.id === id)!
const q = (s: string) => s.replace(/-/g, '')
const rows = computed(() => BALANCES.map((b) => {
  const c = companyOf(b.companyId)
  const calcCoPerson = b.initCoPerson - b.withdrawCoPerson - b.refundCoPerson
  const calcOrg = b.initOrg - b.withdrawOrg - b.refundOrg
  const mismatch = Math.abs(calcCoPerson - b.remainCoPerson) > 1 || Math.abs(calcOrg - b.remainOrg) > 1
  const ratioOff = Math.abs(b.initCoPerson / 3 - b.initOrg) > 1
  const negative = b.remainCoPerson < 0 || b.remainOrg < 0
  return { ...b, name: c.name, bizNo: c.bizNo, coFg: c.coFg, mismatch, ratioOff, negative }
}).filter((r) =>
  (!applied.value.coFg || r.coFg === applied.value.coFg) &&
  (!applied.value.onlyIssue || r.mismatch || r.ratioOff || r.negative) &&
  (!applied.value.q.trim() || r.name.includes(applied.value.q.trim()) || q(r.bizNo).includes(q(applied.value.q.trim())) || q(r.vAccount).includes(q(applied.value.q.trim()))),
))
const { rows: pageRows, loading, error, reload, first, size, total } = usePaged(() => rows.value)
const totals = computed(() => rows.value.reduce((s, r) => ({
  initCoPerson: s.initCoPerson + r.initCoPerson, initOrg: s.initOrg + r.initOrg,
  withdrawCoPerson: s.withdrawCoPerson + r.withdrawCoPerson, withdrawOrg: s.withdrawOrg + r.withdrawOrg,
  refundCoPerson: s.refundCoPerson + r.refundCoPerson, refundOrg: s.refundOrg + r.refundOrg,
  remainCoPerson: s.remainCoPerson + r.remainCoPerson, remainOrg: s.remainOrg + r.remainOrg,
}), { initCoPerson: 0, initOrg: 0, withdrawCoPerson: 0, withdrawOrg: 0, refundCoPerson: 0, refundOrg: 0, remainCoPerson: 0, remainOrg: 0 }))
const negCount = computed(() => rows.value.filter((r) => r.negative).length)

function downloadList(label: string) {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  notify(`${label}을 원 단위로 내려받았습니다(미리보기).`, 'success')
}
const columns = computed(() => [
  { title: '기업명', field: 'name', minWidth: 140 },
  { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '최초입금(기업+개인)', field: 'initCoPerson', width: 140, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); return `${money(d.initCoPerson)}${d.ratioOff ? ' <span class="ws-badge ws-badge--warning">비율 어긋남</span>' : ''}` } },
  { title: '최초입금(지원기관)', field: 'initOrg', width: 130, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => money(c.getValue()) },
  { title: '출금(기업+개인)', field: 'withdrawCoPerson', width: 130, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => money(c.getValue()) },
  { title: '출금(지원기관)', field: 'withdrawOrg', width: 120, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => money(c.getValue()) },
  { title: '환불(기업+개인)', field: 'refundCoPerson', width: 120, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => money(c.getValue()) },
  { title: '환불(지원기관)', field: 'refundOrg', width: 120, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => money(c.getValue()) },
  { title: '잔여(기업+개인)', field: 'remainCoPerson', width: 130, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); const s = d.remainCoPerson < 0 ? ' style="color:var(--ws-text-danger)"' : ''; return `<span${s}>${money(d.remainCoPerson)}</span>${d.mismatch ? ' <span class="ws-badge ws-badge--danger">대사 불일치</span>' : ''}` } },
  { title: '잔여(지원기관)', field: 'remainOrg', width: 120, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const v = c.getValue(); const s = v < 0 ? ' style="color:var(--ws-text-danger)"' : ''; return `<span${s}>${money(v)}</span>` } },
])
const openDetail = (r: any) => router.push({ path: routeOf('SP-STL-030D'), query: { companyId: r.companyId } })
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '112px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="bl-cofg">기업구분</label></th>
        <td><Select v-model="f.coFg" input-id="bl-cofg" :options="[{ label: '전체', code: '' }, ...CO_FG]" option-label="label" option-value="code" fluid /></td>
        <th scope="row"><label for="bl-q">검색어</label></th>
        <td><InputText id="bl-q" v-model="f.q" fluid placeholder="기업명 · 사업자등록번호 · 가상계좌번호" /></td>
      </tr>
      <tr>
        <th scope="row">표시 행만</th>
        <td colspan="3"><label class="ws-desc" style="display:flex; align-items:center; gap:6px"><input type="checkbox" v-model="f.onlyIssue" /> 대사 불일치 · 비율 어긋남 · 음수 잔액만 보기</label></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">조회 결과 합계</h2><span class="ws-fresh ws-fresh--batch">2026.09.29 06:00 기준</span><span v-if="negCount" class="ws-badge ws-badge--danger">음수 잔액 {{ negCount }}개사</span></div>
        <div class="ws-tit__r"><Select v-model="unit" :options="['원', '천원', '백만원']" style="width:100px" /></div>
      </div>
      <table class="ws-gtb">
        <thead><tr><th scope="col"></th><th scope="col">기업+개인</th><th scope="col">지원기관</th></tr></thead>
        <tbody>
          <tr><th scope="row">최초입금</th><td class="ws-num">{{ money(totals.initCoPerson) }}</td><td class="ws-num">{{ money(totals.initOrg) }}</td></tr>
          <tr><th scope="row">출금</th><td class="ws-num">{{ money(totals.withdrawCoPerson) }}</td><td class="ws-num">{{ money(totals.withdrawOrg) }}</td></tr>
          <tr><th scope="row">환불</th><td class="ws-num">{{ money(totals.refundCoPerson) }}</td><td class="ws-num">{{ money(totals.refundOrg) }}</td></tr>
          <tr class="is-total"><th scope="row">잔여</th><td class="ws-num">{{ money(totals.remainCoPerson) }}</td><td class="ws-num">{{ money(totals.remainOrg) }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">기업별 잔액</h2><span class="ws-total">총<strong>{{ total }}</strong>건</span><span class="ws-desc">행을 누르면 잔액현황 상세</span></div>
        <div class="ws-tit__r">
          <SbCan action="download"><Button label="목록 내려받기" severity="secondary" outlined @click="downloadList('목록')" /></SbCan>
          <SbCan action="download"><Button label="상세내역 내려받기" severity="secondary" outlined @click="downloadList('청구연월별 상세내역')" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="pageRows.length === 0" :lines="8" @retry="reload">
        <TabGrid :columns="columns" :rows="pageRows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>
  </div>
</template>
