<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-010L 업무요청 목록 — 명세 src/specs/SP-OPS-010L.json */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { opsRequests, type OpsRequest, type ReqSts } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-010L'
const router = useRouter()

const STS: ReqSts[] = ['접수', '처리중', '처리완료']
const TYPES = ['참여신청 문의', '포인트사용 문의', '기초정보 정정', '계정 문의', '기타']

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, kw: '', sts: 'ALL' as string, type: 'ALL' })
const f = ref(blank())
const applied = ref(blank())

const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: OpsRequest) => {
  const a = applied.value
  const d = day(r.requestedAt)
  return (a.sts === 'ALL' || r.sts === a.sts) && (a.type === 'ALL' || r.type === a.type) &&
    (!a.kw.trim() || r.title.includes(a.kw.trim()) || r.requester.includes(a.kw.trim()) || r.company.includes(a.kw.trim())) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => opsRequests.filter(hit), {
  failIf: () => applied.value.kw.includes(ERROR_KEYWORD),
})
onMounted(reload)

function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

const counts = computed(() => STS.map((s) => ({ id: s, label: s, count: opsRequests.filter((r) => r.sts === s).length })))
function filterByChip(s: string) { f.value.sts = f.value.sts === s ? 'ALL' : s; search() }

const NOW_DAYS = (r: OpsRequest) => Math.floor((Date.now() - day(r.requestedAt).getTime()) / 86_400_000)
const columns = computed(() => [
  { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '요청상태', field: 'sts', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '접수' ? ' ws-badge--warning' : c.getValue() === '처리중' ? ' ws-badge--info' : ''}">${c.getValue()}</span>` },
  { title: '요청유형', field: 'type', width: 116, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '제목', field: 'title', minWidth: 200 },
  { title: '요청자', field: 'requester', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업명', field: 'company', minWidth: 140 },
  { title: '요청일시', field: 'requestedAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '답변자', field: 'answerer', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() || '<span class="ws-desc">—</span>' },
  { title: '답변일시', field: 'answeredAt', width: 124, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() || '<span class="ws-desc">—</span>' },
  {
    title: '경과일', field: 'no', width: 80, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: (c: any) => { const r: OpsRequest = c.getRow().getData(); if (r.sts === '처리완료') return '<span class="ws-desc">—</span>'; const n = NOW_DAYS(r); return `<span class="${n > 3 ? 'ws-badge ws-badge--danger' : 'ws-desc'}">${n}일</span>` },
  },
])
const openDetail = (r: OpsRequest) => router.push({ path: routeOf('SP-OPS-010D'), query: { id: r.id } })
const create = () => { if (can(CODE, 'create')) router.push({ path: routeOf('SP-OPS-010D'), query: { id: 'new' } }) }
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-from">요청일</label></th>
        <td colspan="3"><WsPeriod id="q-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-kw">검색어</label></th>
        <td><InputText id="q-kw" v-model="f.kw" fluid placeholder="제목 · 요청자 · 답변자 · 기업명" /></td>
        <th scope="row"><label for="q-type">요청유형</label></th>
        <td><Select v-model="f.type" input-id="q-type" :options="[{ l: '전체', v: 'ALL' }, ...TYPES.map((t) => ({ l: t, v: t }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">업무요청 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">요청일시 최신순 · 전 기업 · 행을 누르면 요청상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="create"><Button label="업무요청 등록(대리)" severity="secondary" outlined @click="create" /></SbCan>
        </div>
      </div>
      <div class="ws-chips">
        <button v-for="c in counts" :key="c.id" type="button" class="ws-chip" :aria-pressed="applied.sts === c.id" @click="filterByChip(c.id)">{{ c.label }} <b>{{ fmt(c.count) }}</b></button>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>답변 · 요청상태 변경은 행을 눌러 여는 상세(SP-OPS-010D)에서 한다.</li>
        <li>경과일이 3일을 넘긴 미처리 건은 강조된다.</li>
        <li>상태 확인 — 검색어에 <b>오류</b>를 넣으면 실패 화면이 나온다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.ws-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
</style>
