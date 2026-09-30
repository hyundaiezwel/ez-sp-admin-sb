<script setup lang="ts">
/** 소요 집계 — src/sb/effort.json. 단계별 · 화면별 시간 · 토큰. 막대는 CSS 폭으로 */
import { computed } from 'vue'
import PageHead from '../../app/PageHead.vue'
import { EFFORT, tokenSum } from '../effort'
import { screenOf, routeOf } from '../screens'

const e = EFFORT
const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const maxStage = computed(() => Math.max(1, ...(e?.stages ?? []).map((s) => s.minutes)))
const screens = computed(() => Object.entries(e?.screens ?? {}).map(([code, v]) => {
  const parts = [v.spec, v.build, v.fix].filter(Boolean) as { minutes: number; tokens: Parameters<typeof tokenSum>[0] }[]
  return { code, name: screenOf(code)?.label ?? '', v, minutes: parts.reduce((n, p) => n + p.minutes, 0), tokens: parts.reduce((n, p) => n + tokenSum(p.tokens), 0) }
}).sort((a, b) => b.minutes - a.minutes))
const maxScreen = computed(() => Math.max(1, ...screens.value.map((s) => s.minutes)))
</script>

<template>
  <div class="ws-page">
    <PageHead title="소요 집계" />
    <p v-if="!e" class="ws-empty">집계 전 — <code>src/sb/effort.json</code>이 아직 없다.</p>
    <template v-else>
      <p class="ws-desc">집계 {{ e.generatedAt }} · {{ e.method }}</p>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">단계별</h2></div></div>
        <table class="ws-gtb">
          <thead><tr><th>단계</th><th style="width: 40%">시간</th><th>분</th><th>에이전트</th><th>입력</th><th>출력</th><th>캐시 읽기</th><th>캐시 쓰기</th></tr></thead>
          <tbody>
            <tr v-for="s in e.stages" :key="s.id">
              <td>{{ s.label }}</td>
              <td><span class="bar" :style="{ width: `${(s.minutes / maxStage) * 100}%` }" /></td>
              <td class="ws-num">{{ fmt(s.minutes) }}</td><td class="ws-num">{{ s.agents }}</td>
              <td class="ws-num">{{ fmt(s.tokens.input) }}</td><td class="ws-num">{{ fmt(s.tokens.output) }}</td>
              <td class="ws-num">{{ fmt(s.tokens.cacheRead) }}</td><td class="ws-num">{{ fmt(s.tokens.cacheWrite) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">화면별</h2><span class="ws-total">총<strong>{{ screens.length }}</strong>화면</span></div></div>
        <table class="ws-gtb">
          <thead><tr><th>화면</th><th style="width: 36%">시간</th><th>명세 분</th><th>화면 분</th><th>수정 분</th><th>합 분</th><th>토큰 합</th></tr></thead>
          <tbody>
            <tr v-for="s in screens" :key="s.code">
              <td><RouterLink :to="routeOf(s.code)"><code>{{ s.code }}</code></RouterLink> {{ s.name }}</td>
              <td><span class="bar" :style="{ width: `${(s.minutes / maxScreen) * 100}%` }" /></td>
              <td class="ws-num">{{ fmt(s.v.spec.minutes) }}</td><td class="ws-num">{{ fmt(s.v.build.minutes) }}</td>
              <td class="ws-num">{{ s.v.fix ? fmt(s.v.fix.minutes) : '—' }}</td>
              <td class="ws-num">{{ fmt(s.minutes) }}</td><td class="ws-num">{{ fmt(s.tokens) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.bar { display: block; height: 10px; min-width: 2px; border-radius: 2px; background: var(--ws-brand); }
code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
</style>
