<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PNT-020L 이용내역관리 이용내역현황 이용내역목록 — 노동자 포인트 사용 건을
 * 기간(필수, 최대 12개월) · 기업 · 제휴사 · 사용 구분 · 연령대 · 성별 · 검색어로 조회한다.
 * 취소 · 환불 거래는 음수 · 뱃지로 구분한다. 조회 전용 — 거래 취소는 이 화면에서 하지 않는다.
 */
import { computed, ref, watch } from 'vue'
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
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { usePaged } from '../../app/usePaged'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { allUsage, type UsageRow } from '@fixtures/sb/B5'

const router = useRouter()
const AFFILIATES = [...new Set(allUsage().map((u) => u.affiliate))].sort()
const CHANNELS = ['기본차감', '온라인', '복지카드 전체', '복지카드', '복지카드(비복지)', '영수증']

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, companyId: 'ALL', affiliate: 'ALL', channel: 'ALL', age: 'ALL', gender: 'ALL', q: '' })
const f = ref(blank())
const applied = ref(blank())
const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: UsageRow) => {
  const a = applied.value
  const d = day(r.appliedAt)
  return (a.companyId === 'ALL' || r.companyId === a.companyId) && (a.affiliate === 'ALL' || r.affiliate === a.affiliate) &&
    (a.channel === 'ALL' || r.channel === a.channel || (a.channel === '복지카드 전체' && r.channel === '복지카드')) &&
    (a.age === 'ALL' || r.ageBand === a.age) && (a.gender === 'ALL' || r.gender === a.gender) &&
    (!a.q.trim() || r.name.includes(a.q.trim()) || r.empNo.includes(a.q.trim())) &&
    a.range[0] && a.range[1] && d >= a.range[0] && d <= a.range[1]
}
const filtered = computed(() => allUsage().filter(hit))
const { rows, loading, error, reload, first, size, total } = usePaged(() => filtered.value)
watch(() => [applied.value.companyId, applied.value.affiliate, applied.value.channel, applied.value.age, applied.value.gender], () => { first.value = 0; reload() })

function search() {
  if (!f.value.range[0] || !f.value.range[1]) return notify('조회 기간을 설정해 주세요.', 'danger')
  const msg = periodError(f.value.range, { maxMonths: 12 })
  if (msg) return notify(msg, 'danger')
  applied.value = { ...f.value }
  first.value = 0
  reload()
}
function reset() { f.value = blank() }

const totals = computed(() => filtered.value.reduce((s, r) => {
  const used = r.status === '사용' ? r.amount : 0
  const canceled = r.status === '취소' ? -r.amount : 0
  return { count: s.count + 1, used: s.used + used, canceled: s.canceled + canceled }
}, { count: 0, used: 0, canceled: 0 }))

const columns = computed(() => [
  { title: '적용일자', field: 'appliedAt', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '카드승인일', field: 'approvedAt', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue().slice(0, 10) },
  { title: '매입일', field: 'boughtAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '이름', field: 'name', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '사업명', field: 'company', minWidth: 140 },
  { title: '사번', field: 'empNo', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '사용 구분', field: 'channel', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '업종', field: 'category', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '이용내역', field: 'desc', minWidth: 140 },
  { title: '포인트 구분', field: 'affiliate', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '상태', field: 'status', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ${c.getValue() === '취소' ? 'ws-badge--danger' : 'ws-badge--success'}">${c.getValue()}</span>` },
  { title: '포인트', field: 'amount', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
])
const openDetail = (r: UsageRow) => router.push({ path: routeOf('SP-PNT-010D'), query: { id: r.workerId } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="u-from" class="ws-req">기간</label></th>
        <td colspan="3"><WsPeriod id="u-from" v-model="f.range" :limit="{ maxMonths: 12 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="u-co">기업</label></th>
        <td><Select v-model="f.companyId" input-id="u-co" :options="[{ label: '전체', value: 'ALL' }, ...COMPANIES.map((c) => ({ label: c.name, value: c.id }))]" option-label="label" option-value="value" filter fluid /></td>
        <th scope="row"><label for="u-aff">제휴사</label></th>
        <td><Select v-model="f.affiliate" input-id="u-aff" :options="[{ l: '전체', v: 'ALL' }, ...AFFILIATES.map((a) => ({ l: a, v: a }))]" option-label="l" option-value="v" filter fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="u-ch">사용 구분</label></th>
        <td><Select v-model="f.channel" input-id="u-ch" :options="[{ l: '전체', v: 'ALL' }, ...CHANNELS.map((c) => ({ l: c, v: c }))]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="u-age">연령대 · 성별</label></th>
        <td style="display:flex; gap:8px">
          <Select v-model="f.age" input-id="u-age" :options="[{ l: '전체', v: 'ALL' }, { l: '20대', v: '20대' }, { l: '30대', v: '30대' }, { l: '40대', v: '40대' }, { l: '50대', v: '50대' }, { l: '60대 이상', v: '60대 이상' }]" option-label="l" option-value="v" fluid />
          <Select v-model="f.gender" :options="[{ l: '전체', v: 'ALL' }, { l: '남', v: '남' }, { l: '여', v: '여' }]" option-label="l" option-value="v" fluid />
        </td>
      </tr>
      <tr>
        <th scope="row"><label for="u-q">검색어</label></th>
        <td colspan="3"><InputText id="u-q" v-model="f.q" fluid placeholder="이름 · 사번" /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 결과 합계</h2><span class="ws-fresh ws-fresh--batch">전일까지 반영</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">건수</th><th scope="col">사용 포인트 합계</th><th scope="col">취소 포인트 합계</th></tr></thead>
        <tbody><tr><td class="ws-num">{{ fmt(totals.count) }}건</td><td class="ws-num">{{ fmt(totals.used) }}원</td><td class="ws-num">{{ fmt(totals.canceled) }}원</td></tr></tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">이용내역 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span><span class="ws-desc">행의 이름을 누르면 지급상세로 이동한다</span></div>
        <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="total" :limit="50000" modal-code="SP-PNT-020L-M1" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>주민등록번호는 검색 키로 받지 않는다. 이름 · 사번으로만 찾는다.</li>
        <li>조회 결과가 0건이면 다운로드 버튼을 눌러도 내려받지 않는다.</li>
      </ul>
    </div>
  </div>
</template>
