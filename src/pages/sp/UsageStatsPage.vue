<script setup lang="ts">
/**
 * 사용현황 — AS-IS S-006-01. 관리자 센터 통계 화면을 옮겨 포인트 사용 집계로 채웠다(2026-09-28).
 * **내용은 가정이다** — AS-IS가 진입 불가라 무엇을 보여 주던 화면인지 모른다(메뉴 note).
 *
 * **카드 화면이다(D3 C).** 차트 위젯끼리 독립이라 카드로 가른다. 집계 표만 한 카드 안의 평면 표다.
 * 조회 기간은 차트 하나가 아니라 **화면 전체**에 건다 — 표와 차트가 다른 기간을 말하면 합이 안 맞는다.
 *
 * 패턴(`aria.decal`)은 쓰지 않는다(사용자 결정). 그래서 이 화면은 **범례를 빼면 안 된다** —
 * 계열이 가장 많은 화면이라 색 하나가 구분을 다 진다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import EzChart from '../../app/EzChart.vue'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { useMockQuery } from '../../app/useMockQuery'
import { bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { won } from '@fixtures/rng'
import { makeUsage, PAY_KIND } from '@fixtures/sp'

const RANGES = ['7일', '14일', '30일', '90일']
const range = ref('30일')

const { loading, error, reload } = useMockQuery(() => [1], { latency: 500 })
onMounted(reload)
watch([ctxKey, range], reload)

const all = computed(() => memo('usage', ctxKey(), () => makeUsage(ctxKey(), ctx.year)))
/** 목업 데이터의 마지막 사용일을 "오늘"로 본다 — 실제로는 서버가 기준일을 준다 */
const days = computed(() => {
  const last = all.value.reduce((m, u) => (u.at > m ? u.at : m), '')
  const [y, mo, d] = last.split('.').map(Number)
  const n = Number(range.value.replace('일', ''))
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(y, mo - 1, d - (n - 1 - i))
    return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`
  })
})
const rows = computed(() => { const s = new Set(days.value); return all.value.filter((u) => s.has(u.at)) })
const label = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`
const sumBy = <K extends string>(keys: readonly K[], key: (u: (typeof rows.value)[number]) => K, val = (u: (typeof rows.value)[number]) => 1) => {
  const n = new Map<K, number>(keys.map((k) => [k, 0]))
  for (const u of rows.value) n.set(key(u), (n.get(key(u)) ?? 0) + val(u))
  return n
}

const stacked = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: [...PAY_KIND] },
  xAxis: { type: 'category', data: days.value.map(label) },
  yAxis: { type: 'value', name: '건' },
  series: PAY_KIND.map((name) => {
    const n = sumBy(days.value, (u) => u.at, (u) => (u.kind === name && !u.cancel ? 1 : 0))
    return { name, type: 'bar', stack: 'total', barMaxWidth: 20, data: days.value.map((d) => n.get(d)) }
  }),
}))

const combo = computed(() => {
  const amt = sumBy(days.value, (u) => u.at, (u) => u.point)
  const cnt = sumBy(days.value, (u) => u.at, (u) => (u.cancel ? 0 : 1))
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['사용 포인트', '건수'] },
    xAxis: { type: 'category', data: days.value.map(label) },
    yAxis: [{ type: 'value', name: '만원' }, { type: 'value', name: '건', splitLine: { show: false } }],
    series: [
      { name: '사용 포인트', type: 'bar', barMaxWidth: 18, data: days.value.map((d) => Math.round(amt.get(d)! / 10_000)) },
      { name: '건수', type: 'line', yAxisIndex: 1, smooth: true, data: days.value.map((d) => cnt.get(d)) },
    ],
  }
})

/** 업종 — 제휴사 이름의 앞말(숙박 · 여행 · 레저 …) */
const table = computed(() => {
  const m = new Map<string, { biz: string; count: number; cancel: number; point: number }>()
  for (const u of rows.value) {
    const x = m.get(u.biz) ?? { biz: u.biz, count: 0, cancel: 0, point: 0 }
    u.cancel ? x.cancel++ : x.count++
    x.point += u.point
    m.set(u.biz, x)
  }
  return [...m.values()].sort((a, b) => b.point - a.point)
})
const donut = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'], label: { show: false }, data: table.value.map((r) => ({ name: r.biz, value: r.count })) }],
}))

/** 요일 × 시간대(2시간). 색 하나로만 값을 나르므로 visualMap 범례를 반드시 같이 둔다 */
const WEEK = ['월', '화', '수', '목', '금', '토', '일']
const HOURS = [8, 10, 12, 14, 16, 18, 20]
const heat = computed(() => {
  const n = new Map<string, number>()
  for (const u of rows.value) {
    const [y, mo, d] = u.at.split('.').map(Number)
    const w = (new Date(y, mo - 1, d).getDay() + 6) % 7
    const h = Math.floor((Number(u.time.slice(0, 2)) - 8) / 2)
    n.set(`${h}-${w}`, (n.get(`${h}-${w}`) ?? 0) + 1)
  }
  const data = HOURS.flatMap((_, h) => WEEK.map((_, w) => [h, w, n.get(`${h}-${w}`) ?? 0]))
  return {
    tooltip: { position: 'top' },
    grid: { left: 40, right: 16, top: 10, bottom: 56 },
    xAxis: { type: 'category', data: HOURS.map((h) => `${h}시`), splitArea: { show: true } },
    yAxis: { type: 'category', data: WEEK, splitArea: { show: true } },
    visualMap: { min: 0, max: Math.max(1, ...data.map((x) => x[2])), calculable: true, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 90, inRange: { color: ['#eaf2fd', '#2f80ed'] } },
    series: [{ type: 'heatmap', data }],
  }
})
const total = (f: (r: (typeof table.value)[number]) => number) => table.value.reduce((s, r) => s + f(r), 0)
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">결제 수단별 사용 건수</h2><span class="ws-desc">{{ ctx.year }}년 {{ bizLabel(ctx.biz) }} · {{ days[0] }} ~ {{ days[days.length - 1] }}</span></div>
        <div class="ws-tit__r">
          <SelectButton v-model="range" :options="RANGES" :allow-empty="false" aria-label="조회 기간" />
          <span class="ws-sep" aria-hidden="true" />
          <Button label="엑셀 내려받기" severity="secondary" outlined class="ws-line" />
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :lines="8" @retry="reload">
        <div class="ws-chartbox"><EzChart :option="stacked" height="280px" /></div>
      </QueryState>
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">사용 포인트 · 건수</h2><span class="ws-desc">취소를 뺀 순사용</span></div></div>
      <div class="ws-chartbox"><EzChart :option="combo" height="280px" /></div>
    </section>

    <div class="ws-split">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">업종 구성</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="donut" height="260px" /></div>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">요일 · 시간대 사용 밀도</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="heat" height="260px" /></div>
      </section>
    </div>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">업종별 집계</h2></div></div>
      <table class="ws-gtb">
        <caption class="ws-sr-only">업종별 사용 건수 · 취소 건수 · 순사용 포인트</caption>
        <thead><tr><th scope="col">업종</th><th scope="col">사용 건수</th><th scope="col">취소 건수</th><th scope="col">순사용 포인트</th><th scope="col">건단가</th></tr></thead>
        <tbody>
          <tr v-for="r in table" :key="r.biz">
            <td>{{ r.biz }}</td>
            <td class="ws-num">{{ won(r.count) }}</td>
            <td class="ws-num">{{ won(r.cancel) }}</td>
            <td class="ws-num">{{ won(r.point) }}원</td>
            <td class="ws-num">{{ r.count ? won(Math.round(r.point / r.count)) + '원' : '—' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">합계</th>
            <td class="ws-num">{{ won(total((r) => r.count)) }}</td>
            <td class="ws-num">{{ won(total((r) => r.cancel)) }}</td>
            <td class="ws-num">{{ won(total((r) => r.point)) }}원</td>
            <td class="ws-num">—</td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</template>
