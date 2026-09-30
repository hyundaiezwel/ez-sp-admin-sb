<script setup lang="ts">
/** SB 화면 목록 — 77화면의 명세 · 구현 진행을 한 표로. 행을 누르면 그 화면으로 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import { GROUPS, SCREENS, routeOf } from '../screens'
import { getSpec } from '../spec'

const router = useRouter()
const built = new Set(Object.keys(import.meta.glob('/src/pages/sb/*.vue')).map((p) => p.slice(p.lastIndexOf('/') + 1, -4)))
const rows = SCREENS.map((s) => {
  const sp = getSpec(s.code)
  return { ...s, spec: sp ? (sp.status === 'complete' ? '완료' : '초안') : '없음', built: built.has(s.code), q: sp?.openQuestions.length ?? 0 }
})

const kw = ref('')
const group = ref('')
const spec = ref('')
const impl = ref('')
const all = (a: readonly string[]) => [{ l: '전체', v: '' }, ...a.map((v) => ({ l: v, v }))]
const list = computed(() => rows.filter((r) =>
  (!group.value || r.menu[0] === group.value) && (!spec.value || r.spec === spec.value) &&
  (!impl.value || (impl.value === '구현') === r.built) &&
  (!kw.value.trim() || `${r.code} ${r.name} ${r.menu.join(' ')}`.toLowerCase().includes(kw.value.trim().toLowerCase()))))
const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length
</script>

<template>
  <div class="ws-page">
    <PageHead title="SB 화면 목록" />

    <div class="ix-sum">
      <span>전체 <b>{{ rows.length }}</b></span>
      <span>명세 완료 <b>{{ count((r) => r.spec === '완료') }}</b></span>
      <span>명세 초안 <b>{{ count((r) => r.spec === '초안') }}</b></span>
      <span>화면 구현 <b>{{ count((r) => r.built) }}</b></span>
      <span>미결 질문 <b>{{ rows.reduce((n, r) => n + r.q, 0) }}</b></span>
    </div>

    <div class="ix-f" role="search">
      <InputText v-model="kw" placeholder="코드 · 이름 · 메뉴" aria-label="검색어" />
      <Select v-model="group" :options="all(GROUPS)" option-label="l" option-value="v" aria-label="1depth 메뉴" placeholder="메뉴 전체" />
      <Select v-model="spec" :options="all(['완료', '초안', '없음'])" option-label="l" option-value="v" aria-label="명세 상태" placeholder="명세 전체" />
      <Select v-model="impl" :options="all(['구현', '미구현'])" option-label="l" option-value="v" aria-label="화면 구현" placeholder="구현 전체" />
      <span class="ws-desc">{{ list.length }}건</span>
    </div>

    <table class="ws-gtb ix">
      <thead><tr><th>코드</th><th>이름</th><th>메뉴</th><th>분류</th><th>IA 구분</th><th>연계</th><th>명세</th><th>화면</th><th>질문</th></tr></thead>
      <tbody>
        <tr v-for="r in list" :key="r.code" tabindex="0" @click="router.push(routeOf(r.code))" @keydown.enter="router.push(routeOf(r.code))">
          <td><RouterLink :to="routeOf(r.code)" class="ix-code" @click.stop>{{ r.code }}</RouterLink></td>
          <td>{{ r.name }}</td>
          <td class="ws-desc">{{ r.menu.join(' › ') }}</td>
          <td>{{ r.type }}</td>
          <td>{{ r.cls || '—' }}</td>
          <td class="c">{{ r.link || '—' }}</td>
          <td class="c"><span class="ws-badge" :class="{ 'ws-badge--success': r.spec === '완료', 'ws-badge--warning': r.spec === '초안', 'ws-badge--mute': r.spec === '없음' }">{{ r.spec }}</span></td>
          <td class="c"><span class="ws-badge" :class="r.built ? 'ws-badge--brand' : 'ws-badge--mute'">{{ r.built ? '구현' : '설계 카드' }}</span></td>
          <td class="ws-num">{{ r.q || '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ix-sum { display: flex; flex-wrap: wrap; gap: 20px; color: var(--ws-text-sub); }
.ix-sum b { margin-left: 4px; color: var(--ws-text-brand); font-variant-numeric: tabular-nums; }
.ix-f { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ix-f .p-inputtext { width: 240px; }
.ix-f .p-select { width: 160px; }
.ix tbody tr { cursor: pointer; }
.ix tbody tr:hover td { background: var(--ws-surface-hover); }
.ix .c { text-align: center; }
.ix-code { font: 500 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--ws-text-link); white-space: nowrap; }
</style>
