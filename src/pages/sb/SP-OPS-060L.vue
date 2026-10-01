<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-060L 부정행위 모니터링 목록 — 명세 src/specs/SP-OPS-060L.json */
import { computed, onMounted, ref } from 'vue'
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
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { fraudCases, HANDLE_LABEL, type FraudCase } from '@fixtures/sb/B6'
import { SITES, HANDLE, REPORT } from '../../sp/codes'

const CODE = 'SP-OPS-060L'
const router = useRouter()

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, basis: '등록일', handle: '', site: 'ALL', report: 'ALL' })
const f = ref(blank())
const applied = ref(blank())
const day = (s: string) => { const [y, m, d] = s.split('.').map(Number); return new Date(y, m - 1, d) }
const hit = (r: FraudCase) => {
  const a = applied.value
  const d = day(a.basis === '실행일' ? r.runAt : r.regAt)
  return (!a.handle || r.handle === a.handle) && (a.site === 'ALL' || r.site === a.site) && (a.report === 'ALL' || r.report === a.report) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => fraudCases.filter(hit), { failIf: () => false })
onMounted(reload)
function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

/** 교차 집계 — 조회 기간 전체 기준(조치여부 · 사이트 조건과 무관) */
const periodOnly = computed(() => fraudCases.filter((r) => { const d = day(applied.value.basis === '실행일' ? r.runAt : r.regAt); return (!applied.value.range[0] || d >= applied.value.range[0]) && (!applied.value.range[1] || d <= applied.value.range[1]) }))
const matrix = computed(() => HANDLE.map((h) => ({ handle: h, label: h.label, cells: [...SITES, '미상'].map((s) => periodOnly.value.filter((r) => r.handle === h.code && (s === '미상' ? !SITES.includes(r.site) : r.site === s)).length) })))
function cellClick(handleCode: string, site: string) {
  f.value.handle = handleCode
  f.value.site = site === '미상' ? 'ALL' : site
  search()
}

const columns = computed(() => [
  { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '등록일', field: 'regAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '거래사이트', field: 'site', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '글제목', field: 'title', minWidth: 180 },
  { title: '아이디(닉네임)', field: 'nick', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '연락처', field: 'phone', width: 112, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'phone') },
  { title: '이메일', field: 'email', width: 140, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'email') },
  { title: '소명서 제출여부', field: 'report', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => REPORT.find((x) => x.code === c.getValue())?.label ?? c.getValue() },
  { title: '게시글 삭제여부', field: 'deleted', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? 'O' : '—') },
  { title: '조치여부', field: 'handle', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '1' ? ' ws-badge--warning' : c.getValue() === '2' ? ' ws-badge--success' : ''}">${HANDLE_LABEL[c.getValue()]}</span>` },
])
const openDetail = (r: FraudCase) => router.push({ path: routeOf('SP-OPS-060D'), query: { id: r.id } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
const lastRun = '2026.09.30 06:00'
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-basis">기간 기준</label></th>
        <td><Select v-model="f.basis" input-id="q-basis" :options="[{ l: '등록일', v: '등록일' }, { l: '실행일', v: '실행일' }]" option-label="l" option-value="v" fluid /></td>
        <th scope="row" colspan="1"><label for="q-from">기간</label></th>
        <td><WsPeriod id="q-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-site">거래사이트</label></th>
        <td><Select v-model="f.site" input-id="q-site" :options="[{ l: '전체', v: 'ALL' }, ...SITES.map((s) => ({ l: s, v: s }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
        <th scope="row"><label for="q-report">소명서 제출여부</label></th>
        <td><Select v-model="f.report" input-id="q-report" :options="[{ l: '전체', v: 'ALL' }, ...REPORT.map((r) => ({ l: r.label, v: r.code }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit"><h2 class="ws-tit__h">조치여부 × 거래사이트 교차 집계</h2><span class="ws-desc">마지막 수집 {{ lastRun }} · 칸을 누르면 아래 목록이 좁혀진다</span></div>
      <table class="ws-gtb xt">
        <thead><tr><th scope="col">조치여부</th><th v-for="s in [...SITES, '미상']" :key="s" scope="col">{{ s }}</th></tr></thead>
        <tbody>
          <tr v-for="row in matrix" :key="row.handle.code">
            <th scope="row">{{ row.label }}</th>
            <td v-for="(n, i) in row.cells" :key="i"><button type="button" class="xt__c" @click="cellClick(row.handle.code, [...SITES, '미상'][i])">{{ fmt(n) }}</button></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">부정행위 적발 건 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span></div>
        <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="total" :limit="10000" modal-code="SP-OPS-060L-M1" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>
    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>수집 · 대조는 이번 목업 범위 밖이다 — 아래 데이터는 지어낸 값이다.</li><li>조치 · 제재는 상세(SP-OPS-060D)에서 한다.</li></ul></div>
  </div>
</template>

<style scoped>
.xt th, .xt td { text-align: center; }
.xt__c { width: 100%; padding: 4px 0; border: 0; background: none; color: var(--ws-text); font: inherit; font-variant-numeric: tabular-nums; cursor: pointer; }
.xt__c:hover { color: var(--ws-text-link); text-decoration: underline; }
</style>
