<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-021P 사업참여통계 참여노동자통계 — 명세 src/specs/SP-STA-021P.json */
import { computed, onMounted, ref, watch } from 'vue'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { usePaged } from '../../app/usePaged'
import { mask } from '../../ws/mask'
import { bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { WORKER_LIST, WORKER_SUMMARY, type StaWorkerRow } from '@fixtures/sb/B8'

const CODE = 'SP-STA-021P'
const defaultDate = () => new Date(2026, 8, 30)
const reportDate = ref(defaultDate())
const round = ref('ALL')
const kw = ref('')
const kwType = ref<'이름' | '사번' | '생년월일'>('이름')
const joinSts = ref('')

const hit = (r: StaWorkerRow) => {
  if (round.value !== 'ALL' && r.round !== round.value) return false
  if (joinSts.value && r.joinSts !== joinSts.value) return false
  if (kw.value.trim()) {
    const q = kw.value.trim()
    if (kwType.value === '이름' && !r.name.includes(q)) return false
    if (kwType.value === '사번' && !r.id.includes(q)) return false
  }
  return true
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => WORKER_LIST.filter(hit), { size: 10 })
onMounted(reload)
watch(ctxKey, () => requery())
function search() { requery() }
function reset() { round.value = 'ALL'; kw.value = ''; kwType.value = '이름'; reportDate.value = defaultDate(); joinSts.value = ''; search() }
function byCard(sts: string) { joinSts.value = sts; search() }

const columns = computed(() => [
  { title: '차수', field: 'round', width: 70, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업구분', field: 'coFg', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업명', field: 'company', minWidth: 140 },
  { title: '참여개시일', field: 'startedAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '이름', field: 'name', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '동반성장 연계', field: 'partner', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? 'O' : '') },
  { title: '휴대폰', field: 'phone', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'phone') },
  { title: '이메일', field: 'email', width: 140, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'email') },
  { title: '가입 상태', field: 'joinSts', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '사용포인트', field: 'usedPoint', width: 100, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
])
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="y-r">차수</label></th>
        <td><Select v-model="round" input-id="y-r" :options="[{ l: '전체', v: 'ALL' }, { l: '1차', v: '1차' }, { l: '2차', v: '2차' }, { l: '3차', v: '3차' }]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="y-d">보고일자</label></th>
        <td><DatePicker v-model="reportDate" input-id="y-d" date-format="yy.mm.dd" show-icon icon-display="input" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="y-kw">검색어</label></th>
        <td colspan="3">
          <span class="kwrow">
            <Select v-model="kwType" :options="['이름', '사번', '생년월일']" aria-label="검색어 종류" class="kwrow__t" />
            <InputText id="y-kw" v-model="kw" fluid placeholder="검색어" />
          </span>
        </td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준</p>

    <ul class="kpis">
      <li class="kpi ws-card"><span class="kpi__label">확정인원</span><span class="kpi__value">{{ fmt(WORKER_SUMMARY.confirmed) }}<small>명</small></span></li>
      <li class="kpi ws-card clickable" @click="byCard('미가입')"><span class="kpi__label">미가입자</span><span class="kpi__value">{{ fmt(WORKER_SUMMARY.unjoined) }}<small>명</small></span></li>
      <li class="kpi ws-card clickable" @click="byCard('전액 미사용')"><span class="kpi__label">전액 미사용자</span><span class="kpi__value">{{ fmt(WORKER_SUMMARY.unused) }}<small>명</small></span></li>
    </ul>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">노동자 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span></div>
        <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="total" :limit="50000" label="엑셀 다운로드(개인정보)" modal-code="SP-STA-021P-M1" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="8" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>이름 · 휴대폰 · 이메일은 목록에서 가려 보인다.</li><li>조회 전용은 <b :title="denyTip(CODE, 'download-pii')">목록 다운로드</b> 권한이 없다.</li></ul></div>
  </div>
</template>

<style scoped>
.kwrow { display: flex; gap: 8px; }
.kwrow__t { width: 110px; flex: none; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpi__value small { margin-left: 3px; font-size: var(--ws-font-size); font-weight: 400; color: var(--ws-text-muted); }
.clickable { cursor: pointer; }
.clickable:hover { background: var(--ws-surface-alt); }
</style>
