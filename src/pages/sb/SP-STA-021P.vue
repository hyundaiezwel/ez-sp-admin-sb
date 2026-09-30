<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-021P 사업참여통계 참여노동자통계 — 명세 src/specs/SP-STA-021P.json */
import { computed, onMounted, ref } from 'vue'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { usePaged } from '../../app/usePaged'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import { YEARS, BIZ } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { WORKER_LIST, WORKER_SUMMARY, type StaWorkerRow } from '@fixtures/sb/B8'

const CODE = 'SP-STA-021P'
const year = ref(ctx.year)
const biz = ref(ctx.biz)
const reportDate = ref(new Date(2026, 8, 30))
const round = ref('')
const kw = ref('')
const kwType = ref<'이름' | '사번' | '생년월일'>('이름')
const joinSts = ref('')

const hit = (r: StaWorkerRow) => {
  if (round.value && r.round !== round.value) return false
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
function search() { requery() }
function reset() { round.value = ''; kw.value = ''; joinSts.value = ''; search() }
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
    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 조건</h2></div></div>
      <div class="cond">
        <label for="y-y" class="ws-req">참여년도</label>
        <Select v-model="year" input-id="y-y" :options="YEARS" style="width:110px" />
        <label for="y-b">사업</label>
        <Select v-model="biz" input-id="y-b" :options="[{ l: '전체', v: '' }, ...BIZ.map((b) => ({ l: b.label, v: b.code }))]" option-label="l" option-value="v" style="width:190px" />
        <label for="y-r">차수</label>
        <Select v-model="round" input-id="y-r" :options="[{ l: '전체', v: '' }, { l: '1차', v: '1차' }, { l: '2차', v: '2차' }, { l: '3차', v: '3차' }]" option-label="l" option-value="v" style="width:110px" />
        <label for="y-d">보고일자</label>
        <DatePicker v-model="reportDate" input-id="y-d" date-format="yy.mm.dd" show-icon icon-display="input" style="width:150px" />
      </div>
      <div class="cond" style="margin-top:8px">
        <label for="y-kt">검색어</label>
        <Select v-model="kwType" input-id="y-kt" :options="['이름', '사번', '생년월일']" style="width:100px" />
        <InputText v-model="kw" placeholder="검색어" style="width:180px" />
        <Button label="조회" @click="search" />
        <Button label="초기화" severity="secondary" outlined @click="reset" />
      </div>
    </section>

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
.cond { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpi__value small { margin-left: 3px; font-size: var(--ws-font-size); font-weight: 400; color: var(--ws-text-muted); }
.clickable { cursor: pointer; }
.clickable:hover { background: var(--ws-surface-alt); }
</style>
