<script setup lang="ts">
/** 미결 질문 모음 — 전 명세의 openQuestions. 화면 · 메뉴로 거른다 */
import { computed, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import { GROUPS, screenOf, routeOf } from '../screens'
import { allSpecs } from '../spec'

const rows = allSpecs().flatMap((s) => s.openQuestions.map((q) => ({ ...q, code: s.code, name: s.name, group: screenOf(s.code)?.menu[0] ?? s.menu[0] })))
  .sort((a, b) => a.id.localeCompare(b.id))
const group = ref('')
const code = ref('')
const kw = ref('')
const groups = [{ l: '전체 메뉴', v: '' }, ...GROUPS.map((v) => ({ l: v, v }))]
const codes = computed(() => [{ l: '전체 화면', v: '' }, ...[...new Set(rows.filter((r) => !group.value || r.group === group.value).map((r) => r.code))].map((v) => ({ l: v, v }))])
const list = computed(() => rows.filter((r) => (!group.value || r.group === group.value) && (!code.value || r.code === code.value) &&
  (!kw.value.trim() || `${r.q} ${r.why}`.includes(kw.value.trim()))))
</script>

<template>
  <div class="ws-page">
    <PageHead title="미결 질문" />
    <div class="qf" role="search">
      <Select v-model="group" :options="groups" option-label="l" option-value="v" aria-label="메뉴" placeholder="전체 메뉴" @change="code = ''" />
      <Select v-model="code" :options="codes" option-label="l" option-value="v" aria-label="화면" placeholder="전체 화면" filter />
      <InputText v-model="kw" placeholder="질문 · 이유 검색" aria-label="검색어" />
      <span class="ws-desc">{{ list.length }} / {{ rows.length }}건</span>
    </div>
    <p v-if="!rows.length" class="ws-empty">아직 명세에 미결 질문이 없다.</p>
    <table v-else class="ws-gtb">
      <thead><tr><th style="width: 170px">ID</th><th style="width: 200px">화면</th><th>질문</th><th>왜 묻나</th></tr></thead>
      <tbody>
        <tr v-for="q in list" :key="q.id">
          <td><code>{{ q.id }}</code></td>
          <td><RouterLink :to="routeOf(q.code)">{{ q.code }}</RouterLink><small class="ws-desc" style="display: block">{{ q.name }}</small></td>
          <td>{{ q.q }}</td>
          <td class="ws-desc">{{ q.why }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.qf { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.qf .p-select { width: 200px; }
.qf .p-inputtext { width: 260px; }
td { vertical-align: top; line-height: 1.5; }
code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
</style>
