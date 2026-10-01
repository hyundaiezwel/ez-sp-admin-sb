<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-040L 환불내역 목록 — 환불청구연월 · 차수 단위로 기업별 환불 청구 금액과
 * 환불완료 · 환불실패 결과를 대조한다. 기업계좌번호가 있어 사유 등록(M1) 후 내려받는다.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { usePaged } from '../../app/usePaged'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { REFUND_ROUNDS } from '@fixtures/sb/B5'

const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const companyOf = (id: string) => COMPANIES.find((c) => c.id === id)!

const rows0 = computed(() => REFUND_ROUNDS.map((rr) => {
  const c = companyOf(rr.companyId)
  const reqAmtPerson = rr.items.reduce((s, i) => s + i.amtPerson, 0)
  const reqAmtCompany = rr.items.reduce((s, i) => s + i.amtCompany, 0)
  const orgRecall = rr.items.reduce((s, i) => s + i.orgRecall, 0)
  const done = rr.items.filter((i) => i.status === '환불완료')
  const failed = rr.items.filter((i) => i.status === '환불실패')
  return {
    key: `${rr.companyId}-${rr.ym}-${rr.round}`, companyId: rr.companyId, name: c.name, bizNo: c.bizNo, dev: c.id.endsWith('1'),
    ym: rr.ym, round: rr.round, acctNo: rr.acctNo, target: rr.items.length, reqAmtPerson, reqAmtCompany, orgRecall,
    doneCount: done.length, failCount: failed.length,
    doneAmt: done.reduce((s, i) => s + i.amtPerson + i.amtCompany, 0), failAmt: failed.reduce((s, i) => s + i.amtPerson + i.amtCompany, 0),
    pending: rr.ym === '2026.09',
  }
}))

const blank = () => ({ year: 2026, month: '09', round: '1', dev: 'ALL', result: 'ALL', q: '' })
const f = ref(blank())
const applied = ref(blank())
function search() {
  if (f.value.month !== '전체' && !f.value.round) return notify('차수를 선택해 주세요.', 'danger')
  applied.value = { ...f.value }
  first.value = 0
  reload()
}
function reset() { f.value = blank() }
const qn = (s: string) => s.replace(/-/g, '')
const rows = computed(() => rows0.value.filter((r) => {
  const ymMatch = applied.value.month === '전체' ? r.ym.startsWith(String(applied.value.year)) : r.ym === `${applied.value.year}.${applied.value.month}`
  const resultMatch = applied.value.result === 'ALL' || (applied.value.result === '실패' ? r.failCount > 0 : r.doneCount > 0)
  return ymMatch && resultMatch &&
    (!applied.value.q.trim() || r.name.includes(applied.value.q.trim()) || qn(r.bizNo).includes(qn(applied.value.q.trim())) || qn(r.acctNo).includes(qn(applied.value.q.trim())))
}))
const { rows: pageRows, loading, error, reload, first, size, total } = usePaged(() => rows.value)

const totals = computed(() => rows.value.reduce((s, r) => ({
  reqAmt: s.reqAmt + r.reqAmtPerson + r.reqAmtCompany, reqOrg: s.reqOrg + r.orgRecall,
  doneAmt: s.doneAmt + r.doneAmt, failAmt: s.failAmt + r.failAmt,
  reqCnt: s.reqCnt + r.target, doneCnt: s.doneCnt + r.doneCount, failCnt: s.failCnt + r.failCount,
}), { reqAmt: 0, reqOrg: 0, doneAmt: 0, failAmt: 0, reqCnt: 0, doneCnt: 0, failCnt: 0 }))
function filterFailedOnly() { applied.value = { ...applied.value, result: '실패' }; f.value.result = '실패'; first.value = 0; reload() }

const columns = computed(() => [
  { title: '청구년월', field: 'ym', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업명(사업자번호)', field: 'name', minWidth: 160, formatter: (c: any) => { const d = c.getRow().getData(); return `${d.name} (${d.bizNo})` } },
  { title: '기업계좌번호', field: 'acctNo', width: 130, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'account') },
  { title: '청구대상', field: 'target', width: 80, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '환불청구(개인+기업)', field: 'reqAmtPerson', width: 140, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); return (d.reqAmtPerson + d.reqAmtCompany).toLocaleString('ko-KR') } },
  { title: '환불완료', field: 'doneCount', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); return `${d.doneCount}건 · ${d.doneAmt.toLocaleString('ko-KR')}원` } },
  { title: '환불실패', field: 'failCount', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); return d.failCount ? `<span class="ws-badge ws-badge--danger">${d.failCount}건</span> · ${d.failAmt.toLocaleString('ko-KR')}원` : '0건' } },
])
const openDetail = (r: any) => router.push({ path: routeOf('SP-STL-040D'), query: { companyId: r.companyId, ym: r.ym, round: r.round } })
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '112px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="rf-year">환불청구연월</label></th>
        <td style="display:flex; gap:8px">
          <Select v-model="f.year" :options="[2026, 2025]" fluid />
          <Select v-model="f.month" input-id="rf-year" :options="['전체', '01', '02', '03', '04', '05', '06', '07', '08', '09']" fluid />
          <Select v-if="f.month !== '전체'" v-model="f.round" :options="[{ l: '1차', v: '1' }, { l: '2차', v: '2' }]" option-label="l" option-value="v" fluid />
        </td>
        <th scope="row"><label for="rf-dev">발전모델 대상</label></th>
        <td><Select v-model="f.dev" input-id="rf-dev" :options="[{ l: '전체', v: 'ALL' }, { l: '대상', v: 'Y' }, { l: '비대상', v: 'N' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="rf-res">환불 결과</label></th>
        <td><Select v-model="f.result" input-id="rf-res" :options="[{ l: '전체', v: 'ALL' }, { l: '완료 있음', v: '완료' }, { l: '실패 있음', v: '실패' }]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="rf-q">검색어</label></th>
        <td><InputText id="rf-q" v-model="f.q" maxlength="25" fluid placeholder="기업명 · 사업자등록번호 · 기업계좌번호" /></td>
      </tr>
    </WsSearch>

    <p v-if="rows.some((r) => r.pending)" class="ws-desc" style="margin:0 0 8px">환불 결과 확정 전(발행일 기준 3~5영업일 뒤 확인) — 이번 달 일부 건이 아직 진행 중입니다.</p>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 결과 합계</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">환불청구</th><th scope="col">환불청구(지원기관 회수)</th><th scope="col">환불완료</th><th scope="col">환불실패</th></tr></thead>
        <tbody><tr>
          <td class="ws-num">{{ won(totals.reqAmt) }}({{ totals.reqCnt }}건)</td>
          <td class="ws-num">{{ won(totals.reqOrg) }}</td>
          <td class="ws-num">{{ won(totals.doneAmt) }}({{ totals.doneCnt }}건)</td>
          <td class="ws-num"><button type="button" class="ws-linklike" @click="filterFailedOnly">{{ won(totals.failAmt) }}({{ totals.failCnt }}건)</button></td>
        </tr></tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">환불내역 목록</h2><span class="ws-total">총<strong>{{ total }}</strong>건</span><span class="ws-desc">행을 누르면 환불내역 상세</span></div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="50000" label="목록 내려받기" modal-code="SP-STL-040L-M1" /></SbCan>
          <SbCan action="download-pii"><WsDownload :total="total" :limit="50000" label="노동자별 내려받기" modal-code="SP-STL-040L-M1" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="pageRows.length === 0" emptyText="조회된 목록이 없습니다." :lines="8" @retry="reload">
        <TabGrid :columns="columns" :rows="pageRows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>
  </div>
</template>

<style scoped>
.ws-linklike { padding: 0; border: 0; background: none; color: inherit; cursor: pointer; font: inherit; text-decoration: underline; }
</style>
