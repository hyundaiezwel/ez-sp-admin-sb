<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-031P 이용통계 이용실적통계 — 명세 src/specs/SP-STA-031P.json */
import { computed, ref } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import EzChart from '../../app/EzChart.vue'
import { notify } from '../../ws/notify'
import { periodError, presetRange, PRESETS, type Range } from '../../ws/period'
import WsPeriod from '../../ws/WsPeriod.vue'
import { YEARS, BIZ, CO_FG } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { USAGE_DAILY, USAGE_MONTHLY, USAGE_YEARLY, USAGE_BY_TYPE } from '@fixtures/sb/B8'

const CODE = 'SP-STA-031P'
const year = ref(ctx.year)
const biz = ref(ctx.biz)
const coFg = ref('')
const useType = ref('')
const unit = ref<'일별' | '월별' | '연도별'>('월별')
const range = ref(presetRange(PRESETS[3]) as Range)
const simFail = ref(false)
const won = (n: number) => n.toLocaleString('ko-KR')

const rowsOf = computed(() => (unit.value === '일별' ? USAGE_DAILY : unit.value === '월별' ? USAGE_MONTHLY : USAGE_YEARLY))
const totalAmt = computed(() => rowsOf.value.reduce((s: number, r: any) => s + r.amount, 0))

function search() {
  if (unit.value === '일별' && periodError(range.value, { maxYears: 1 })) return notify('일별은 12개월까지 볼 수 있습니다. 월별로 바꿔 주세요.', 'danger')
  notify('조건에 맞춰 이용실적을 다시 집계했습니다.', 'success')
}

const trendOption = computed(() => ({
  legend: { bottom: 0 },
  xAxis: { type: 'category', data: rowsOf.value.map((r: any) => r.period) },
  yAxis: [{ type: 'value', name: '금액' }, { type: 'value', name: '건수' }],
  series: [
    { name: '이용금액', type: 'bar', data: rowsOf.value.map((r: any) => r.amount) },
    { name: '이용건수', type: 'line', yAxisIndex: 1, data: rowsOf.value.map((r: any) => r.cnt) },
  ],
}))
const typeOption = {
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['40%', '70%'], data: USAGE_BY_TYPE.map((t) => ({ name: t.type, value: t.amount })) }],
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
        <label for="y-t">이용유형</label>
        <Select v-model="useType" input-id="y-t" :options="[{ l: '전체', v: '' }, ...USAGE_BY_TYPE.map((t) => ({ l: t.type, v: t.type }))]" option-label="l" option-value="v" style="width:150px" />
      </div>
      <div class="cond" style="margin-top:8px">
        <label for="y-u" class="ws-req">집계 단위</label>
        <Select v-model="unit" input-id="y-u" :options="['일별', '월별', '연도별']" style="width:110px" />
        <template v-if="unit === '일별'"><label for="y-p">기간</label><WsPeriod id="y-p" v-model="range" :limit="{ maxYears: 1 }" /></template>
        <Button label="조회" @click="search" />
        <Button label="원천 조회 실패 시연" size="small" severity="secondary" outlined class="ws-line" @click="simFail = !simFail" />
      </div>
    </section>

    <QueryState :loading="false" :error="simFail ? '실적을 불러오지 못했습니다' : ''" :empty="false" @retry="simFail = false">
      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">{{ unit }} 실적표</h2><span class="ws-desc">합계 이용금액 {{ won(totalAmt) }}원</span></div>
          <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify('기간별 실적표를 내려받기를 요청했습니다.', 'success')" /></SbCan></div>
        </div>
        <EzChart :option="trendOption" height="240px" />
        <table class="ws-gtb" style="margin-top:10px">
          <thead>
            <tr><th>기간</th><th>이용건수</th><th>이용금액</th><th>지원금액</th><th>승인</th><th>취소</th><th v-if="unit === '일별'">일반</th><th v-if="unit === '일별'">가정친화</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in rowsOf" :key="r.period">
              <td>{{ r.period }}</td><td>{{ won(r.cnt) }}</td><td>{{ won(r.amount) }}</td><td>{{ won(r.support) }}</td><td>{{ won(r.approve) }}</td><td>{{ won(r.cancel) }}</td>
              <td v-if="unit === '일별'">{{ won((r as any).general) }}</td><td v-if="unit === '일별'">{{ won((r as any).family) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">이용유형별 실적</h2></div></div>
        <EzChart :option="typeOption" height="240px" />
      </section>
    </QueryState>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>이용금액은 승인 · 취소 · 환불을 반영한 순금액이다.</li><li>일별 보기는 정산 일매출자료(구 SP-STL-050P)의 일반 · 가정친화 열을 이어받는다.</li></ul></div>
  </div>
</template>

<style scoped>
.cond { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
</style>
