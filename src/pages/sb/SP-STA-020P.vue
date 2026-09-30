<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-020P 사업참여통계 참여기업통계 — 명세 src/specs/SP-STA-020P.json */
import { computed, ref, watch } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import EzChart from '../../app/EzChart.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { notify } from '../../ws/notify'
import { YEARS, CO_FG, coFgLabel, bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { CO_FG_TABLE, PARTICIPATION_TYPE, REJOIN_COUNT, REJOIN_RATE, PARTNER_CO_LIST } from '@fixtures/sb/B8'

const CODE = 'SP-STA-020P'
/** 재참여율은 여러 해를 한눈에 봐야 하는 통계라 전역 참여년도 대신 비교 연도(시작~끝)를 따로 둔다 */
const MIN_YEAR = Math.min(...YEARS)
const coFg = ref('ALL')
const type = ref('ALL')
const yearFrom = ref(MIN_YEAR)
const yearTo = ref(ctx.year)
const picked = ref<string | null>(null)

function search() { notify('조건에 맞춰 다시 집계했습니다.', 'success') }
function reset() { coFg.value = 'ALL'; type.value = 'ALL'; yearFrom.value = MIN_YEAR; yearTo.value = ctx.year; search() }
watch(ctxKey, search)

const won = (n: number) => n.toLocaleString('ko-KR')
const totalCo = computed(() => CO_FG_TABLE.reduce((s, r) => s + r.co, 0))
const totalWorker = computed(() => CO_FG_TABLE.reduce((s, r) => s + r.worker, 0))
const totalAmt = computed(() => CO_FG_TABLE.reduce((s, r) => s + r.amount, 0))

const filteredList = computed(() => (picked.value ? PARTNER_CO_LIST.filter((c) => c.coFg === picked.value) : PARTNER_CO_LIST))
const rejoinRate = computed(() => REJOIN_RATE.filter((r) => r.year >= yearFrom.value && r.year <= yearTo.value))

const countOption = {
  xAxis: { type: 'category', data: REJOIN_COUNT.map((r) => `${r.times}회`) },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: REJOIN_COUNT.map((r) => r.co) }],
}
const rateOption = computed(() => ({
  xAxis: { type: 'category', data: rejoinRate.value.map((r) => r.year) },
  yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
  series: [{ type: 'line', data: rejoinRate.value.map((r) => r.rate) }],
}))
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <WsSearch :cols="['104px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="y-c">기업구분</label></th>
        <td><Select v-model="coFg" input-id="y-c" :options="[{ l: '전체', v: 'ALL' }, ...CO_FG.map((f) => ({ l: f.label, v: f.code }))]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="y-t">참여유형</label></th>
        <td><Select v-model="type" input-id="y-t" :options="[{ l: '전체', v: 'ALL' }, { l: '일반', v: '일반' }, { l: '발전모델', v: '발전모델' }, { l: '동반성장', v: '동반성장' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="y-fy">비교 연도</label></th>
        <td colspan="3">
          <span class="yr">
            <Select v-model="yearFrom" input-id="y-fy" :options="YEARS" aria-label="비교 연도 시작" class="yr__s" />
            <span aria-hidden="true">~</span>
            <Select v-model="yearTo" :options="YEARS" aria-label="비교 연도 종료" class="yr__s" />
          </span>
        </td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준(재참여율은 비교 연도 기준)</p>

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">기업구분별 집계</h2><span class="ws-desc">행을 누르면 아래 목록이 좁혀진다</span></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="집계표 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify('기업구분별 집계표를 내려받기를 요청했습니다.', 'success')" /></SbCan></div>
      </div>
      <table class="ws-gtb">
        <thead><tr><th>기업구분</th><th>참여기업수</th><th>참여인원수</th><th>입금금액</th></tr></thead>
        <tbody>
          <tr v-for="r in CO_FG_TABLE" :key="r.code" class="rowbtn" :class="{ active: picked === r.code }" @click="picked = picked === r.code ? null : r.code">
            <td>{{ r.label }}</td><td>{{ won(r.co) }}</td><td>{{ won(r.worker) }}</td><td>{{ won(r.amount) }}원</td>
          </tr>
          <tr><th scope="row">합계</th><td>{{ won(totalCo) }}</td><td>{{ won(totalWorker) }}</td><td>{{ won(totalAmt) }}원</td></tr>
        </tbody>
      </table>
    </section>

    <div class="ws-split ws-split--12">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">참여유형별 현황</h2></div></div>
        <table class="ws-gtb"><thead><tr><th>참여유형</th><th>참여기업수</th><th>참여인원수</th></tr></thead>
          <tbody><tr v-for="t in PARTICIPATION_TYPE" :key="t.type"><td>{{ t.type }}</td><td>{{ won(t.co) }}</td><td>{{ won(t.worker) }}</td></tr></tbody>
        </table>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">참여횟수 분포</h2></div></div>
        <EzChart :option="countOption" height="220px" />
      </section>
    </div>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">연도별 재참여율</h2><span class="ws-desc">비교 연도 {{ yearFrom }}~{{ yearTo }} · 이관 전 연도는 점을 찍지 않는다</span></div></div>
      <EzChart :option="rateOption" height="220px" />
      <p class="ws-desc" style="margin-top:6px">이관 전: {{ rejoinRate.filter((r) => r.rate === null).map((r) => r.year).join(', ') }}</p>
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">참여기업 목록</h2><span class="ws-total">총<strong>{{ filteredList.length }}</strong>건</span></div>
        <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="filteredList.length" :limit="10000" label="엑셀 다운로드(개인정보)" modal-code="SP-STA-020P-M1" /></SbCan></div>
      </div>
      <table class="ws-gtb">
        <thead><tr><th>기업명</th><th>기업구분</th><th>사업명</th><th>참여개시일</th><th>담당자</th><th>신청</th><th>확정</th></tr></thead>
        <tbody>
          <tr v-for="c in filteredList" :key="c.id">
            <td>{{ c.name }}</td><td>{{ coFgLabel(c.coFg) }}</td><td>{{ c.bizName }}</td><td>{{ c.startedAt }}</td>
            <td>{{ can(CODE, 'download-pii') ? c.manager : c.manager[0] + '*'.repeat(c.manager.length - 1) }}</td>
            <td>{{ c.applied }}</td><td>{{ c.confirmed }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>조회 전용은 목록을 <b :title="denyTip(CODE, 'download-pii')">가린 채</b> 보고, 집계표만 내려받는다.</li></ul></div>
  </div>
</template>

<style scoped>
.rowbtn { cursor: pointer; }
.rowbtn:hover { background: var(--ws-surface-alt); }
.rowbtn.active { background: var(--ws-surface-alt); font-weight: 600; }
.yr { display: flex; align-items: center; gap: 8px; }
.yr__s { width: 120px; }
</style>
