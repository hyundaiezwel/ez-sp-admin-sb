<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-041P 전용몰통계 지역별 이용 통계 — 명세 src/specs/SP-STA-041P.json */
import { ref, watch } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import EzChart from '../../app/EzChart.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { periodError, presetRange, PRESETS, type Range } from '../../ws/period'
import WsPeriod from '../../ws/WsPeriod.vue'
import { CO_FG, bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { REGION_USAGE, REGION_DETAIL, INDUSTRY_PROVIDED, INDUSTRY_USAGE } from '@fixtures/sb/B8'

const CODE = 'SP-STA-041P'
const coFg = ref('ALL')
const defaultRange = () => presetRange(PRESETS[1]) as Range
const range = ref(defaultRange())
const opened = ref<string | null>(null)
const won = (n: number) => n.toLocaleString('ko-KR')

function search() {
  if (periodError(range.value, { maxYears: 1 })) return notify('최대 12개월 이내로 설정해 주세요.', 'danger')
  notify('조건에 맞춰 지역별 이용 통계를 다시 집계했습니다.', 'success')
}
function reset() { coFg.value = 'ALL'; range.value = defaultRange(); opened.value = null; search() }
watch(ctxKey, search)

const regionOption = {
  xAxis: { type: 'category', data: REGION_USAGE.map((r) => r.region), axisLabel: { rotate: 45 } },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: REGION_USAGE.map((r) => r.amount) }],
}
const industryOption = {
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['40%', '70%'], data: INDUSTRY_USAGE.map((i) => ({ name: i.industry, value: i.amount })) }],
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <WsSearch :cols="['104px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="y-c">기업구분</label></th>
        <td><Select v-model="coFg" input-id="y-c" :options="[{ l: '전체', v: 'ALL' }, ...CO_FG.map((f) => ({ l: f.label, v: f.code }))]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="y-p">기간</label></th>
        <td><WsPeriod id="y-p" v-model="range" :limit="{ maxYears: 1 }" /></td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준 · 지역 기준: 상품 소재지(추정, 숙박상품만 지역이 있는지 확인 필요 — Q-SP-STA-041P-01)</p>

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">시 · 도별 이용현황</h2><span class="ws-desc">행을 누르면 시 · 군 · 구가 펼쳐진다</span></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify('지역 집계표를 내려받기를 요청했습니다.', 'success')" /></SbCan></div>
      </div>
      <EzChart :option="regionOption" height="240px" />
      <table class="ws-gtb" style="margin-top:10px">
        <thead><tr><th>지역</th><th>이용건수</th><th>이용금액</th></tr></thead>
        <tbody>
          <template v-for="r in REGION_USAGE" :key="r.region">
            <tr class="rowbtn" :class="{ active: opened === r.region }" @click="REGION_DETAIL[r.region] && (opened = opened === r.region ? null : r.region)">
              <td>{{ r.region }}<span v-if="REGION_DETAIL[r.region]" class="ws-desc"> · 펼치기</span></td><td>{{ won(r.cnt) }}</td><td>{{ won(r.amount) }}</td>
            </tr>
            <template v-if="opened === r.region && REGION_DETAIL[r.region]">
              <tr v-for="g in REGION_DETAIL[r.region]" :key="r.region + g.region" class="sub">
                <td>ㄴ {{ g.region }}</td><td>{{ won(g.cnt) }}</td><td>{{ won(g.amount) }}</td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">업종별 이용현황</h2></div></div>
      <template v-if="INDUSTRY_PROVIDED">
        <EzChart :option="industryOption" height="220px" />
        <table class="ws-gtb" style="margin-top:10px"><thead><tr><th>업종</th><th>이용건수</th><th>이용금액</th></tr></thead>
          <tbody><tr v-for="i in INDUSTRY_USAGE" :key="i.industry"><td>{{ i.industry }}</td><td>{{ won(i.cnt) }}</td><td>{{ won(i.amount) }}</td></tr></tbody>
        </table>
      </template>
      <p v-else class="ws-desc">업종 데이터 미제공</p>
    </section>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>지역 속성이 없는 이용 건은 '지역 미상'으로 따로 센다.</li></ul></div>
  </div>
</template>

<style scoped>
.rowbtn { cursor: pointer; }
.rowbtn:hover { background: var(--ws-surface-alt); }
.rowbtn.active { background: var(--ws-surface-alt); font-weight: 600; }
.sub td { color: var(--ws-text-muted); background: var(--ws-surface-alt); }
</style>
