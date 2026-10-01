<script setup lang="ts">
/**
 * ECharts 래퍼.
 *
 * 차트 라이브러리는 CSS 변수를 모른다 — 색·글자색을 JS 옵션으로 받는다. 그래서 화면마다
 * 색을 적어 넣으면 토큰 체계 밖으로 새고, 테마를 바꿔도 차트만 라이트로 남는다.
 * 여기서 `getComputedStyle`로 토큰을 읽어 옵션에 주입하고, 테마가 바뀌면 다시 읽는다.
 *
 * **패턴(`aria.decal`)은 쓰지 않는다.** 톤을 흐린다는 판단이다. 그래서 계열 구분을
 * 색 하나가 지고, 적록 색각이상에서 여유가 없다(ΔE 10.6) — 범례·직접 라벨·툴팁이
 * 그 몫을 져야 한다. 계열이 셋 이상인 화면은 범례를 빼면 안 된다.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, HeatmapChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, VisualMapComponent,
} from 'echarts/components'

use([
  CanvasRenderer, BarChart, LineChart, PieChart, HeatmapChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, VisualMapComponent,
])

const props = withDefaults(
  defineProps<{
    /** ECharts 옵션. 색·글자색은 넣지 않는다 — 여기서 토큰으로 채운다 */
    option: Record<string, any>
    height?: string
    /** 색 외 단서(패턴). 계열이 2개 이상이면 켜는 것이 기본이다 */
  }>(),
  { height: '260px' },
)

/** 테마가 바뀌면 값을 다시 읽어야 한다. 카운터를 올려 computed를 무효화한다 */
const themeTick = ref(0)
let observer: MutationObserver | null = null

onMounted(() => {
  observer = new MutationObserver(() => themeTick.value++)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-contrast'] })
})
onUnmounted(() => observer?.disconnect())

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/**
 * 면으로 그리는 계열(파이·누적 막대)에 **배경색 획**을 준다.
 *
 * 채움 색이 배경과 3:1일 필요는 없다 — WCAG 1.4.11은 경계가 식별되면 된다. 그 경계를
 * 획이 맡는다. 획이 없으면 인접 조각끼리 붙어 보이고, 그걸 막으려고 채움 색을 서로
 * 멀리 벌리면 팔레트가 알록달록해진다.
 *
 * 선 차트에는 주지 않는다 — 거기선 선 자체가 정보라 색이 캔버스와 3:1이어야 한다.
 * 화면이 직접 준 `itemStyle`은 덮지 않는다.
 */
function withSeparators(series: any, surface: string) {
  if (!series) return undefined
  const seal = (s: any) =>
    s && (s.type === 'pie' || s.type === 'bar')
      ? { ...s, itemStyle: { borderColor: surface, borderWidth: 2, ...(s.itemStyle ?? {}) } }
      : s
  return Array.isArray(series) ? series.map(seal) : seal(series)
}

const merged = computed(() => {
  void themeTick.value
  const text = token('--ws-text')
  const muted = token('--ws-text-muted')
  const line = token('--ws-border-lighter')
  const surface = token('--ws-surface')

  // **기본은 두 색이다.** 계열이 둘이면 브랜드 1색 + 중립색만 쓴다 —
  // 이번 기간 vs 지난 기간 같은 비교 쌍이 업무 차트의 대부분이고, 거기에 여섯 색을
  // 다 꺼내면 알록달록해진다. 셋 이상일 때만 범주 팔레트를 편다.
  //
  // 의미색(success 초록·danger 빨강)은 범주에 쓰지 않는다 — "좋음/나쁨"으로 읽힌다.
  const seriesCount = Array.isArray(props.option.series) ? props.option.series.length : 1
  const pieCount =
    props.option.series?.[0]?.type === 'pie' ? (props.option.series[0].data?.length ?? 0) : 0
  const count = Math.max(seriesCount, pieCount)

  const palette =
    count <= 2
      ? [token('--ws-chart-1'), token('--ws-chart-muted')]
      : [1, 2, 3, 4, 5, 6].map((i) => token(`--ws-chart-${i}`))

  const axis = {
    axisLine: { lineStyle: { color: line } },
    axisTick: { show: false },
    axisLabel: { color: muted, fontSize: 11 },
    splitLine: { lineStyle: { color: line, type: 'dashed' } },
  }

  // 축이 둘이면 배열이다(이중 축). 배열을 객체에 펼치면 {0:…, 1:…}이 돼 축이 사라지고
  // "yAxis 0 not found"로 setOption이 중간에 죽는다 — 그 뒤로 이 인스턴스는 계속 "main process" 오류를 낸다
  const withAxis = (a: any) => (a ? (Array.isArray(a) ? a.map((x) => ({ ...axis, ...x })) : { ...axis, ...a }) : undefined)

  // 화면이 준 옵션을 **먼저** 편다. 뒤에 펴면 legend · tooltip · grid 원본이 아래 병합본을 덮어
  // 글자색 · 배경이 ECharts 기본값(#333 · 흰 바탕)으로 돌아간다 — 다크에서 범례가 안 읽혔다
  return {
    ...props.option,
    color: palette,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: token('--ws-font'), color: text },
    tooltip: {
      backgroundColor: surface,
      borderColor: token('--ws-border'),
      textStyle: { color: text, fontSize: 12 },
      ...(props.option.tooltip ?? {}),
    },
    // 범례는 위가 기본이다(grid top 28이 그 자리). 아래에 두려면 화면이 bottom을 준다
    legend: { textStyle: { color: muted, fontSize: 11 }, icon: 'roundRect', ...(props.option.legend?.bottom == null ? { top: 0 } : {}), ...(props.option.legend ?? {}) },
    // 범례를 아래에 두면 축 라벨과 범례 두 줄이 들어갈 자리(56)를 기본으로 준다 — 28이면 겹친다(UI-19)
    grid: { left: 48, right: 16, top: 28, bottom: props.option.legend?.bottom == null ? 28 : 56, ...(props.option.grid ?? {}) },
    series: withSeparators(props.option.series, surface),
    xAxis: withAxis(props.option.xAxis),
    yAxis: withAxis(props.option.yAxis),
  }
})
</script>

<template>
  <!-- KeepAlive 안에서 autoresize가 즉시 발화하면 ECharts가
       "resize should not be called during main process" 경고를 낸다. 스로틀로 한 틱 미룬다 -->
  <VChart class="chart" :option="merged" :style="{ height }" :autoresize="{ throttle: 100 }" />
</template>

<style scoped>
.chart { width: 100%; }
</style>
