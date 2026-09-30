<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-030P 이용통계 포인트통계 — 명세 src/specs/SP-STA-030P.json */
import { ref } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import EzChart from '../../app/EzChart.vue'
import { notify } from '../../ws/notify'
import { periodError, presetRange, PRESETS, type Range } from '../../ws/period'
import WsPeriod from '../../ws/WsPeriod.vue'
import { YEARS, BIZ, CO_FG } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { POINT_SUMMARY, BALANCE_BUCKETS, POINT_GROUPS, DAILY_TREND_30 } from '@fixtures/sb/B8'

const CODE = 'SP-STA-030P'
const year = ref(ctx.year)
const biz = ref(ctx.biz)
const coFg = ref('')
const range = ref(presetRange(PRESETS[1]) as Range)
const won = (n: number) => n.toLocaleString('ko-KR')

function search() {
  if (periodError(range.value, { maxYears: 1 })) return notify('최대 12개월 이내로 설정해 주세요.', 'danger')
  notify('조건에 맞춰 포인트 통계를 다시 집계했습니다.', 'success')
}

const bucketOption = {
  xAxis: { type: 'category', data: BALANCE_BUCKETS.map((b) => b.range) },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: BALANCE_BUCKETS.map((b) => b.cnt) }],
}
const trendOption = {
  legend: { bottom: 0 },
  xAxis: { type: 'category', data: DAILY_TREND_30.map((d) => d.date.slice(5)) },
  yAxis: [{ type: 'value', name: '인원' }, { type: 'value', name: '금액' }],
  series: [
    { name: '참여기업', type: 'bar', data: DAILY_TREND_30.map((d) => d.co) },
    { name: '참여노동자', type: 'bar', data: DAILY_TREND_30.map((d) => d.worker) },
    { name: '포인트 사용금액', type: 'line', yAxisIndex: 1, data: DAILY_TREND_30.map((d) => d.amount) },
  ],
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 조건</h2></div></div>
      <div class="cond">
        <label for="y-y" class="ws-req">참여년도</label>
        <Select v-model="year" input-id="y-y" :options="YEARS" style="width:110px" />
        <label for="y-b">사업</label>
        <Select v-model="biz" input-id="y-b" :options="[{ l: '전체', v: '' }, ...BIZ.map((b) => ({ l: b.label, v: b.code }))]" option-label="l" option-value="v" style="width:190px" />
        <label for="y-c">기업구분</label>
        <Select v-model="coFg" input-id="y-c" :options="[{ l: '전체', v: '' }, ...CO_FG.map((f) => ({ l: f.label, v: f.code }))]" option-label="l" option-value="v" style="width:170px" />
      </div>
      <div class="cond" style="margin-top:8px">
        <label for="y-p" class="ws-req">조회기간</label>
        <WsPeriod id="y-p" v-model="range" :limit="{ maxYears: 1 }" />
        <Button label="조회" @click="search" />
      </div>
    </section>

    <ul class="kpis">
      <li class="kpi ws-card"><span class="kpi__label">참여확정인원</span><span class="kpi__value">{{ won(POINT_SUMMARY.confirmed) }}</span></li>
      <li class="kpi ws-card"><span class="kpi__label">미가입자</span><span class="kpi__value">{{ won(POINT_SUMMARY.unjoined) }}</span></li>
      <li class="kpi ws-card"><span class="kpi__label">전액 미사용자</span><span class="kpi__value">{{ won(POINT_SUMMARY.fullUnused) }}</span></li>
      <li class="kpi ws-card"><span class="kpi__label">전액 사용자</span><span class="kpi__value">{{ won(POINT_SUMMARY.fullUsed) }}</span></li>
      <li class="kpi ws-card"><span class="kpi__label">이용정지(사용/미사용)</span><span class="kpi__value">{{ POINT_SUMMARY.stopUsed }}/{{ POINT_SUMMARY.stopUnused }}</span></li>
      <li class="kpi ws-card"><span class="kpi__label">환불완료(사용/미사용)</span><span class="kpi__value">{{ POINT_SUMMARY.refundUsed }}/{{ POINT_SUMMARY.refundUnused }}</span></li>
    </ul>

    <div class="ws-split ws-split--12">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">잔액 구간별 분포</h2></div></div>
        <EzChart :option="bucketOption" height="220px" />
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">포인트 그룹별 지급 · 사용 · 환불</h2></div>
          <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify('포인트 그룹별 표를 내려받기를 요청했습니다.', 'success')" /></SbCan></div>
        </div>
        <table class="ws-gtb"><thead><tr><th>그룹</th><th>배정</th><th>사용</th><th>환불예정</th><th>환불완료</th></tr></thead>
          <tbody>
            <tr v-for="g in POINT_GROUPS" :key="g.group"><td>{{ g.group }}</td><td>{{ won(g.assigned) }}</td><td>{{ won(g.used) }}</td><td>{{ won(g.refundPending) }}</td><td>{{ won(g.refundDone) }}</td></tr>
          </tbody>
        </table>
      </section>
    </div>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">일별 추이</h2><span class="ws-desc">참여기업 · 참여노동자 · 포인트 사용금액(순사용)</span></div></div>
      <EzChart :option="trendOption" height="260px" />
    </section>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>원천은 복지몰 포인트 · 거래 데이터 — 일 적재 전제, 실시간이 아니다.</li></ul></div>
  </div>
</template>

<style scoped>
.cond { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
