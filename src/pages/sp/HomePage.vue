<script setup lang="ts">
/**
 * 업무 현황 — AS-IS G-006(메인 대시보드). 관리자 센터 대시보드를 옮겨 지원 사업 데이터로 채웠다(2026-09-28).
 *
 * **카드 화면이다(D3 C).** 위젯끼리 서로 독립이라 카드로 가른다 — 회색 캔버스 · 흰 카드 ·
 * 모서리 12. 목록·폼은 평면이다. 폭을 2:1로 나눠 무게를 준다.
 * 캔버스 위에 바로 놓이는 기간 선택기는 테두리를 --ws-field-border-canvas로 진하게 쓴다.
 *
 * 맨 위 숫자는 **메뉴 옆 숫자와 같은 원천**(`PENDING`)이다. AS-IS는 상단 바의 금일등록 · 미처리 건수와
 * 화면 안 숫자가 따로 놀았다 — 두 자리가 다른 숫자를 말하면 어느 쪽도 믿지 않는다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import EzChart from '../../app/EzChart.vue'
import { PENDING } from '../../app/menu'
import { badgeClass } from '../../ws/badge'
import { useMockQuery } from '../../app/useMockQuery'
import { HANDLE, MAIN_LINE, bizLabel, stateOf } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { rng } from '@fixtures/rng'
import { makeBasic, makeIntake, makeScraping, makeUsage, seedOf } from '@fixtures/sp'

const router = useRouter()
const { loading, error, reload } = useMockQuery(() => [1], { latency: 500 })
onMounted(reload)
watch(ctxKey, reload)

const intake = computed(() => memo('intake', ctxKey(), () => makeIntake(ctxKey(), ctx.year)))
const basic = computed(() => memo('basic', ctxKey(), () => makeBasic(ctxKey(), ctx.year)))
const usage = computed(() => memo('usage', ctxKey(), () => makeUsage(ctxKey(), ctx.year)))
const scraps = computed(() => memo('scrap', ctxKey(), () => makeScraping(ctxKey(), ctx.year)))

const period = ref('14일')
const days = computed(() => {
  const n = Number(period.value.replace('일', ''))
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
})
const trend = computed(() => {
  const r = rng(seedOf('home' + ctxKey() + period.value))
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['접수', '선정'] },
    xAxis: { type: 'category', data: days.value },
    yAxis: { type: 'value' },
    series: [
      { name: '접수', type: 'line', smooth: true, areaStyle: { opacity: 0.12 }, data: days.value.map(() => 40 + Math.round(r() * 60)) },
      { name: '선정', type: 'line', smooth: true, data: days.value.map(() => 20 + Math.round(r() * 30)) },
    ],
  }
})

/** 접수 · 기초정보 두 목록의 상태를 단계로 묶는다 — 기업이 지금 어디에 쌓여 있나. 조각은 생애주기 순서 */
const STAGE_ORDER: string[] = [...MAIN_LINE, '이탈', '종료', '환불']
const byStage = computed(() => {
  const n = new Map<string, number>()
  for (const x of [...intake.value, ...basic.value]) {
    const st = stateOf(x.sts)?.stage ?? '기타'
    n.set(st, (n.get(st) ?? 0) + 1)
  }
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'], label: { show: false }, data: STAGE_ORDER.filter((st) => n.has(st)).map((name) => ({ name, value: n.get(name) })) }],
  }
})

/** 업종별 포인트 사용 — 취소를 뺀 순사용, 단위 만원 */
const byBiz = computed(() => {
  const n = new Map<string, number>()
  for (const u of usage.value) n.set(u.biz, (n.get(u.biz) ?? 0) + u.point)
  const rows = [...n].sort((a, b) => a[1] - b[1])
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 56, top: 10, bottom: 24 },
    xAxis: { type: 'value', name: '만원' },
    yAxis: { type: 'category', data: rows.map(([k]) => k) },
    series: [{ type: 'bar', barWidth: 14, data: rows.map(([, v]) => Math.round(v / 10_000)) }],
  }
})

const recent = computed(() => scraps.value.filter((s) => s.handle === '1').slice(0, 6))
const handleOf = (c: string) => HANDLE.find((h) => h.code === c)!
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <div class="ws-pgt-row"><PageHead /><SelectButton v-model="period" :options="['7일', '14일', '30일']" :allow-empty="false" aria-label="기간" /></div>

    <QueryState :loading="loading" :error="error" :lines="3" @retry="reload">
      <ul class="kpis" aria-label="처리 대기">
        <li v-for="k in PENDING" :key="k.to">
          <RouterLink :to="k.to" class="kpi ws-card">
            <span class="kpi__label">{{ k.label }}<small v-if="k.group">{{ k.group }}</small></span>
            <span class="kpi__value">{{ k.count }}<small>건</small></span>
            <span class="kpi__sub">처리 대기</span>
          </RouterLink>
        </li>
      </ul>
    </QueryState>

    <div class="ws-split ws-split--21">
      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">접수 · 선정 추이</h2><span class="ws-total">최근<strong>{{ days.length }}</strong>일</span></div>
          <div class="ws-tit__r"><Button label="사용현황" severity="secondary" outlined class="ws-line" @click="router.push('/sp/usage-stats')" /></div>
        </div>
        <div class="ws-chartbox"><EzChart :option="trend" height="260px" /></div>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">참여 단계 분포</h2><span class="ws-desc">{{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span></div></div>
        <div class="ws-chartbox"><EzChart :option="byStage" height="260px" /></div>
      </section>
    </div>

    <div class="ws-split ws-split--12">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">업종별 포인트 사용</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="byBiz" height="232px" /></div>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">조치가 필요한 적발</h2></div>
          <div class="ws-tit__r"><Button label="전체 보기" severity="secondary" outlined class="ws-line" @click="router.push('/sp/scraping')" /></div>
        </div>
        <table class="ws-gtb recent">
          <caption class="ws-sr-only">조치필요 상태인 스크래핑 적발 최근 6건</caption>
          <colgroup><col style="width: 11ch" /><col style="width: 11ch" /><col /><col style="width: 10ch" /></colgroup>
          <thead><tr><th scope="col">적발번호</th><th scope="col">사이트</th><th scope="col">게시글 제목</th><th scope="col">조치</th></tr></thead>
          <tbody>
            <tr v-for="r in recent" :key="r.id">
              <td><RouterLink :to="`/sp/scraping/${r.id}`" class="ws-celllink">{{ r.id }}</RouterLink></td>
              <td>{{ r.site }}</td>
              <td class="trunc">{{ r.title }}</td>
              <td style="text-align: center"><span :class="badgeClass(handleOf(r.handle).tone)">{{ handleOf(r.handle).label }}</span></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; color: var(--ws-text); text-decoration: none; }
.kpi:hover { text-decoration: none; box-shadow: 0 0 0 1px var(--ws-field-border-focus), var(--ws-card-shadow); }
.kpi__label { color: var(--ws-text-sub); }
.kpi__label small { margin-left: 6px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.kpi__value { font-size: 26px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
.kpi__value small { margin-left: 3px; font-size: var(--ws-font-size); font-weight: 400; color: var(--ws-text-muted); }
.kpi__sub { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }

.recent { table-layout: fixed; }
.trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
