<script setup lang="ts">
/**
 * 설계 카드 — 아직 화면 파일(`src/pages/sb/<CODE>.vue`)이 없는 자리.
 * 명세가 있으면 요약 · 기능 · 모달 · 미결 질문을 카드로, 없으면 IA 기본 정보만 보인다.
 */
import { computed, inject } from 'vue'
import Button from 'primevue/button'
import PageHead from '../app/PageHead.vue'
import { getSpec, levelTone } from './spec'
import { screenOf } from './screens'
import { SB_FRAME } from './frame'
import SbCode from './SbCode.vue'

const frame = inject(SB_FRAME)!
const spec = computed(() => getSpec(frame.code))
const scr = computed(() => screenOf(frame.code))
</script>

<template>
  <div class="ws-page">
    <PageHead :title="scr?.label" />

    <p class="ws-callout"><b>설계 카드</b> 아직 그리지 않은 화면이다. {{ spec ? '아래는 명세 요약이다.' : '명세도 아직 없다 — IA 기본 정보만 보인다.' }}</p>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">IA 기본 정보</h2></div>
        <div class="ws-tit__r"><Button label="명세 전체 보기 (?)" severity="secondary" outlined @click="frame.openSpec()" /></div>
      </div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr><th>화면 코드</th><td><code>{{ frame.code }}</code></td><th>분류</th><td>{{ scr?.type }}</td></tr>
          <tr><th>메뉴</th><td>{{ scr?.menu.join(' › ') }}</td><th>이름</th><td>{{ scr?.name }}</td></tr>
          <tr><th>IA 구분</th><td>{{ scr?.cls || '기존' }} (행 {{ scr?.row }})</td><th>복지몰 연계</th><td>{{ scr?.link || '없음' }}</td></tr>
        </tbody>
      </table>
    </section>

    <template v-if="spec">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">요약</h2><span class="ws-badge" :class="spec.status === 'complete' ? 'ws-badge--success' : 'ws-badge--warning'">{{ spec.status === 'complete' ? '명세 완료' : '초안' }}</span></div></div>
        <p class="pd-sum">{{ spec.summary }}</p>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">기능</h2><span class="ws-total">총<strong>{{ spec.functions.length }}</strong>건</span></div></div>
        <ul class="pd">
          <li v-for="f in spec.functions" :key="f.id"><code>{{ f.id }}</code><b>{{ f.name }}</b><span>{{ f.desc }}</span><span :class="levelTone(f.level)">{{ f.level }}</span></li>
        </ul>
      </section>

      <section v-if="spec.modals.length" class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">모달</h2><span class="ws-total">총<strong>{{ spec.modals.length }}</strong>건</span></div></div>
        <ul class="pd">
          <li v-for="m in spec.modals" :key="m.code"><SbCode :code="m.code" /><b>{{ m.name }}</b><span>{{ m.purpose }}</span><span /></li>
        </ul>
      </section>

      <section v-if="spec.openQuestions.length" class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">미결 질문</h2><span class="ws-total">총<strong>{{ spec.openQuestions.length }}</strong>건</span></div></div>
        <ul class="pd">
          <li v-for="q in spec.openQuestions" :key="q.id"><code>{{ q.id }}</code><b>{{ q.q }}</b><span class="ws-desc">{{ q.why }}</span><span /></li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.pd-sum { line-height: 1.6; }
.pd { display: grid; gap: 6px; }
.pd li { display: grid; grid-template-columns: 150px 220px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.pd li :deep(.sb-code) { margin-right: 0; justify-self: start; }
code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
</style>
