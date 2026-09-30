<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-011P 사업운영통계 이용정지통계 — 명세 src/specs/SP-STA-011P.json */
import { computed, ref, watch } from 'vue'
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
import { STOP_MATRIX, STOP_WITHDRAWN } from '@fixtures/sb/B8'

const CODE = 'SP-STA-011P'
const REASONS = ['퇴사(이직)', '개인사유', '신분변경', '기업경영악화', '복지제도 변경', '동반성장모델 지원 기한 종료', '기타']

const defaultRange = () => presetRange(PRESETS[4]) as Range
const range = ref(defaultRange())
const total = computed(() => STOP_MATRIX.flat().reduce((s, n) => s + n, 0))
const rowSum = (i: number) => STOP_MATRIX[i].reduce((s, n) => s + n, 0)
const colSum = (j: number) => STOP_MATRIX.reduce((s, row) => s + row[j], 0)

function search() {
  if (periodError(range.value, { maxYears: 1 })) return notify('이용정지 기한을 확인하세요 — 최대 12개월까지 조회할 수 있습니다.', 'danger')
  notify('조건에 맞춰 이용정지 교차표를 다시 집계했습니다.', 'success')
}
function reset() { range.value = defaultRange(); search() }
watch(ctxKey, search)

const reasonOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['40%', '70%'], data: REASONS.map((r, i) => ({ name: r, value: rowSum(i) })) }],
}))
function download() {
  if (total.value === 0) return notify('다운로드할 목록이 없습니다.', 'warning')
  notify(`이용정지 교차표(${total.value}건)를 내려받기를 요청했습니다.`, 'success')
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <WsSearch :cols="['110px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="y-p">이용정지 기한</label></th>
        <td><WsPeriod id="y-p" v-model="range" :limit="{ maxYears: 1 }" /></td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준 · 마지막 집계 2026.09.30 00:12</p>

    <div class="ws-split ws-split--21">
      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">이용정지 사유 × 기업구분</h2><span class="ws-desc">정지철회 {{ STOP_WITHDRAWN }}건은 제외</span></div>
          <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="download" /></SbCan></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th>사유</th><th v-for="f in CO_FG" :key="f.code">{{ f.label }}</th><th>합계</th></tr></thead>
          <tbody>
            <tr v-for="(reason, i) in REASONS" :key="reason">
              <td>{{ reason }}</td>
              <td v-for="(f, j) in CO_FG" :key="f.code" style="text-align:right">{{ STOP_MATRIX[i][j] }}</td>
              <td style="text-align:right; font-weight:600">{{ rowSum(i) }}</td>
            </tr>
            <tr>
              <th scope="row">합계</th>
              <td v-for="(f, j) in CO_FG" :key="f.code" style="text-align:right; font-weight:600">{{ colSum(j) }}</td>
              <td style="text-align:right; font-weight:700">{{ total }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">사유 구성</h2></div></div>
        <EzChart :option="reasonOption" height="280px" />
      </section>
    </div>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>교차표는 건수만 — 노동자 식별 정보를 내보내지 않는다.</li><li>0인 칸도 늘 같은 순서로 표시한다.</li></ul></div>
  </div>
</template>
