<script setup lang="ts">
/** 역할 소개 + 화면 × 역할 권한 매트릭스. 명세의 권한 행이 있으면 그것을, 없으면 기본값(roles.ts)을 보인다 */
import { computed, ref } from 'vue'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import { ACTIONS, ROLES } from '../roles'
import { GROUPS, SCREENS, routeOf } from '../screens'
import { getSpec } from '../spec'
import { allowed, sb } from '../context'

const group = ref<string>(GROUPS[2])
const groups = [{ l: '전체', v: '' }, ...GROUPS.map((v) => ({ l: v, v }))]
const list = computed(() => SCREENS.filter((s) => !group.value || s.menu[0] === group.value))
const short = (a: string) => ACTIONS.find((x) => x.code === a)?.label ?? a
const fromSpec = (code: string, role: string) => !!getSpec(code)?.permissions?.rows?.some((r) => r.role === role)
</script>

<template>
  <div class="ws-page">
    <PageHead title="역할 · 권한" />

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">역할</h2><span class="ws-total">총<strong>{{ ROLES.length }}</strong>개</span><span class="ws-desc">상단바 '역할'로 미리보기 역할을 바꾼다</span></div></div>
      <ul class="rl">
        <li v-for="r in ROLES" :key="r.code" :class="{ 'is-me': r.code === sb.role }">
          <p><b>{{ r.label }}</b> <code>{{ r.code }}</code> <span class="ws-badge">{{ r.org }} · {{ r.tier }}</span></p>
          <p class="ws-desc">{{ r.desc }}</p>
        </li>
      </ul>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">동작</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th style="width: 140px">코드</th><th style="width: 140px">이름</th><th>뜻</th></tr></thead>
        <tbody><tr v-for="a in ACTIONS" :key="a.code"><td><code>{{ a.code }}</code></td><td>{{ a.label }}</td><td>{{ a.desc }}</td></tr></tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">화면 × 역할</h2><span class="ws-desc"><b class="src">명</b> 명세 반영 · 나머지는 기본값(추정)</span></div>
        <div class="ws-tit__r"><Select v-model="group" :options="groups" option-label="l" option-value="v" aria-label="1depth 메뉴" placeholder="전체" /></div>
      </div>
      <div class="ws-xscroll">
        <table class="ws-gtb mx">
          <thead><tr><th>화면</th><th v-for="r in ROLES" :key="r.code" :class="{ 'is-me': r.code === sb.role }">{{ r.label }}</th></tr></thead>
          <tbody>
            <tr v-for="s in list" :key="s.code">
              <th scope="row"><RouterLink :to="routeOf(s.code)"><code>{{ s.code }}</code></RouterLink><small>{{ s.label }}</small></th>
              <td v-for="r in ROLES" :key="r.code" :class="{ 'is-me': r.code === sb.role }">
                <b v-if="fromSpec(s.code, r.code)" class="src" title="명세 반영">명</b>
                <span v-if="allowed(s.code, r.code).length">{{ allowed(s.code, r.code).map(short).join(' · ') }}</span>
                <span v-else class="ws-desc">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rl { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 8px; }
.rl li { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.rl li.is-me { box-shadow: inset 3px 0 0 var(--ws-brand); }
.mx { font-size: var(--ws-font-size-md); }
.mx thead th { white-space: nowrap; }
.mx tbody th { text-align: left; white-space: nowrap; }
.mx tbody th small { display: block; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.mx td { vertical-align: top; line-height: 1.5; min-width: 120px; }
.mx .is-me { background: var(--ws-surface-selected); }
.src { display: inline-block; margin-right: 4px; padding: 0 4px; border-radius: var(--ws-radius-xs); background: var(--ws-brand-surface); color: var(--ws-text-brand); font-size: 11px; }
code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
</style>
