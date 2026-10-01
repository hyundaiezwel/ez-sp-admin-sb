<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-050P CS통계 — 명세 src/specs/SP-STA-050P.json */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import EzChart from '../../app/EzChart.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { periodError, presetRange, PRESETS, type Range } from '../../ws/period'
import WsPeriod from '../../ws/WsPeriod.vue'
import { bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { routeOf } from '../../sb/screens'
import SbCan from '../../sb/SbCan.vue'
import { CS_CHANNEL, CS_DAILY, CS_TYPE_CROSS } from '@fixtures/sb/B8'

const CODE = 'SP-STA-050P'
const router = useRouter()
const channel = ref<string[]>([])
const defaultRange = () => presetRange(PRESETS[2]) as Range
const range = ref(defaultRange())

function search() {
  if (periodError(range.value, { maxYears: 1 })) return notify('최대 12개월 이내로 설정해 주세요.', 'danger')
  notify('조건에 맞춰 CS통계를 다시 집계했습니다.', 'success')
}
function reset() { channel.value = []; range.value = defaultRange(); search() }
watch(ctxKey, search)

function gotoPending(ch: string) {
  if (ch === '누리집 문의') router.push(routeOf('SP-OPS-020L'))
  else if (ch === '기업 업무요청') router.push(routeOf('SP-OPS-010L'))
}

const dailyOption = {
  legend: { bottom: 0 },
  grid: { bottom: 56 },
  xAxis: { type: 'category', data: CS_DAILY.map((d) => d.date.slice(5)) },
  yAxis: { type: 'value' },
  series: ['콜센터', '이메일', '누리집문의', '업무요청'].map((k) => ({ name: k, type: 'bar', stack: 'a', data: CS_DAILY.map((d: any) => d[k]) })),
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <WsSearch :cols="['104px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="y-ch">문의채널</label></th>
        <td><MultiSelect v-model="channel" input-id="y-ch" :options="CS_CHANNEL.map((c) => c.channel)" display="chip" placeholder="전체" fluid /></td>
        <th scope="row"><label for="y-p">기간</label></th>
        <td><WsPeriod id="y-p" v-model="range" :limit="{ maxYears: 1 }" /></td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준</p>

    <ul class="kpis">
      <li v-for="c in CS_CHANNEL" :key="c.channel" class="kpi ws-card" :class="{ mute: !c.linked }">
        <span class="kpi__label">{{ c.channel }} <small>· {{ c.source }}</small></span>
        <span v-if="!c.linked" class="ws-badge ws-badge--mute">연계 대기</span>
        <template v-else>
          <span class="kpi__value">{{ c.received }}<small>건</small></span>
          <span class="kpi__sub">완료 {{ c.done }} · <a href="#" class="pending" @click.prevent="gotoPending(c.channel)">미처리 {{ c.pending }}</a> · 평균 {{ c.avgMin >= 60 ? Math.round(c.avgMin / 60) + '시간' : c.avgMin + '분' }}</span>
        </template>
      </li>
    </ul>

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">일자별 접수 추이</h2></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify('채널 · 유형 · 일자별 집계를 내려받기를 요청했습니다.', 'success')" /></SbCan></div>
      </div>
      <EzChart :option="dailyOption" height="240px" />
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">문의유형 × 채널</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th>문의유형</th><th>콜센터</th><th>이메일</th><th>누리집 문의</th><th>업무요청</th></tr></thead>
        <tbody><tr v-for="t in CS_TYPE_CROSS" :key="t.type"><td>{{ t.type }}</td><td>{{ t.콜센터 }}</td><td>{{ t.이메일 }}</td><td>{{ t.누리집문의 }}</td><td>{{ t.업무요청 }}</td></tr></tbody>
      </table>
    </section>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>콜센터 · 이메일 · 챗봇은 상담 시스템 집계, 누리집 문의 · 업무요청은 이 어드민 데이터다.</li><li>문의자 개인정보는 집계에 담지 않는다.</li></ul></div>
  </div>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi.mute { opacity: 0.6; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpi__sub { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.pending { color: var(--ws-text-link); }
</style>
