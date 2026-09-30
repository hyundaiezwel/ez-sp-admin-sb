<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-020L 청구내역서 목록 — 청구연월 기준 기업별 이용금액(기업+개인 · 지원기관)과
 * 그달 입금 · 환불액을 대조한다. 조회 전용 · 개인정보 없음 — 사유 없이 내려받는다
 * (ponytail: WsDownload는 늘 사유 모달을 여는 공용 컴포넌트라 직접 버튼으로 구현했다).
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
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { COMPANY_BILLS, billOf, type CompanyBill } from '@fixtures/sb/B5'

const CODE = 'SP-STL-020L'
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const blank = () => ({ ym: '2026.08', q: '' })
const f = ref(blank())
const applied = ref(blank())
function search() {
  if (applied.value.ym > '2026.09') return notify('청구연월은 이번 달보다 뒤로 조회할 수 없습니다.', 'danger')
  applied.value = { ...f.value }
  first.value = 0
  reload()
}
function reset() { f.value = blank() }

const companyOf = (id: string) => COMPANIES.find((c) => c.id === id)
const q = (s: string) => s.replace(/-/g, '')
const rows = computed(() => COMPANY_BILLS.filter((b) => b.ym === applied.value.ym).map((b) => {
  const c = companyOf(b.companyId)!
  const ratioOff = Math.abs(b.coPersonAmt / 3 - b.orgAmt) > 1
  return { ...b, name: c.name, bizNo: c.bizNo, vAcct: `123-45-${b.companyId.slice(-6)}`, ratioOff }
}).filter((r) => !applied.value.q.trim() || r.name.includes(applied.value.q.trim()) || q(r.bizNo).includes(q(applied.value.q.trim())) || q(r.vAcct).includes(q(applied.value.q.trim()))))
const { rows: pageRows, loading, error, reload, first, size, total } = usePaged(() => rows.value)

const bill = computed(() => billOf(applied.value.ym))
const totals = computed(() => rows.value.reduce((s, r) => ({ coPerson: s.coPerson + r.coPersonAmt, org: s.org + r.orgAmt, deposit: s.deposit + r.deposit, refund: s.refund + r.refund }), { coPerson: 0, org: 0, deposit: 0, refund: 0 }))

function downloadList() {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  if (!rows.value.length) return notify('내려받을 목록이 없습니다.', 'warning')
  notify(`${rows.value.length}건을 원 단위로 내려받았습니다(미리보기).`, 'success')
}
const columns = computed(() => [
  { title: '기업명', field: 'name', minWidth: 140 },
  { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '가상계좌번호', field: 'vAcct', width: 130, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'account') },
  { title: '청구 금액(기업+개인)', field: 'coPersonAmt', width: 140, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
  { title: '청구 금액(지원기관)', field: 'orgAmt', width: 130, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); return `${d.orgAmt.toLocaleString('ko-KR')}${d.ratioOff ? ' <span class="ws-badge ws-badge--warning" title="기업+개인:지원기관 = 3:1 어긋남">비율 어긋남</span>' : ''}` } },
  { title: '입금액', field: 'deposit', width: 120, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
  { title: '환불액', field: 'refund', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
])
const openDetail = (r: any) => router.push({ path: routeOf('SP-STL-020D'), query: { companyId: r.companyId, ym: r.ym } })
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '112px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="cb-ym">청구연월</label></th>
        <td><InputText id="cb-ym" v-model="f.ym" fluid placeholder="2026.08" /></td>
        <th scope="row"><label for="cb-q">검색어</label></th>
        <td><InputText id="cb-q" v-model="f.q" fluid placeholder="기업명 · 사업자등록번호 · 가상계좌번호" /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 결과 합계</h2><span v-if="bill && bill.status !== '승인'" class="ws-badge ws-badge--warning">미승인(잠정) 금액</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">청구(기업+개인)</th><th scope="col">청구(지원기관)</th><th scope="col">입금 합계</th><th scope="col">환불 합계</th></tr></thead>
        <tbody><tr><td class="ws-num">{{ won(totals.coPerson) }}</td><td class="ws-num">{{ won(totals.org) }}</td><td class="ws-num">{{ won(totals.deposit) }}</td><td class="ws-num">{{ won(totals.refund) }}</td></tr></tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">기업별 청구내역</h2><span class="ws-total">총<strong>{{ total }}</strong>건</span><span class="ws-desc">행을 누르면 청구내역서 상세</span></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" severity="secondary" outlined @click="downloadList" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="pageRows.length === 0" :lines="8" @retry="reload">
        <TabGrid :columns="columns" :rows="pageRows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>
  </div>
</template>
