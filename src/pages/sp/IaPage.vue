<script setup lang="ts">
/**
 * 메뉴 대응표 — AS-IS 54 → TO-BE 제안. 지원 사업 미리보기의 첫 화면.
 *
 * 두 방향을 다 답한다: "제안 메뉴의 이 자리는 AS-IS 어디였나"와 "AS-IS 이 화면은 어디로 갔나".
 * 한쪽만 있으면 기획 검토에서 빠진 화면을 찾을 수 없다.
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import SelectButton from 'primevue/selectbutton'
import { SP_MENU, SP_REMOVED } from '../../sp/menu'
import { ASIS, asisById } from '../../sp/asis'
import type { MenuItem } from '../../app/menu'

const view = ref('제안 메뉴 기준')
const groups = SP_MENU.map((g) => ({ group: g, leaves: g.children ?? [g] }))
const leaves = groups.flatMap((g) => g.leaves.map((l) => ({ g: g.group, l })))
const where = (id: string) => leaves.find((x) => x.l.asis?.includes(id))

const stats = computed(() => ({
  asis: ASIS.length,
  tobe: leaves.length,
  built: leaves.filter((x) => x.l.built).length,
  merged: leaves.filter((x) => (x.l.asis?.length ?? 0) > 1).length,
  removed: Object.keys(SP_REMOVED).length,
  added: leaves.filter((x) => (x.l.asis ?? []).every((a) => a.startsWith('G-'))).length,
}))
const GNB = [...new Set(ASIS.map((s) => s.gnb))]
const lvl = (n: number | null) => (n == null ? '—' : '●'.repeat(n))
const linkOf = (l: MenuItem) => l.to ?? '/sp'
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <p class="ws-callout ws-callout--warn"><b>제안 · 미확정</b> 업무 흐름 기준으로 다시 묶은 메뉴다. IA가 확정되면 이 표를 정본에 맞춰 고친다. 근거는 기존 관리자시스템의 AS-IS 분석(비공개)이다 — 사업명 · 기관명 · 코드값은 일반화했다.</p>

    <section class="ws-sec">
      <dl class="sm">
        <div><dt>AS-IS 화면</dt><dd>{{ stats.asis }}</dd></div>
        <div><dt>제안 메뉴</dt><dd>{{ stats.tobe }}</dd></div>
        <div><dt>합친 자리</dt><dd>{{ stats.merged }}</dd></div>
        <div><dt>뺀 화면</dt><dd>{{ stats.removed }}</dd></div>
        <div><dt>새로 둔 자리</dt><dd>{{ stats.added }}</dd></div>
        <div class="is-key"><dt>그려 본 화면</dt><dd>{{ stats.built }}</dd></div>
      </dl>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">대응표</h2><span class="ws-desc">화면 이름을 누르면 그 자리로 간다 — 그려 본 화면은 실제 화면, 나머지는 설계 카드</span></div>
        <div class="ws-tit__r"><SelectButton v-model="view" :options="['제안 메뉴 기준', 'AS-IS 기준']" :allow-empty="false" aria-label="보기 기준" /></div>
      </div>

      <table v-if="view === '제안 메뉴 기준'" class="ws-gtb">
        <thead><tr><th scope="col" style="width: 140px">제안 그룹</th><th scope="col" style="width: 180px">화면</th><th scope="col">AS-IS 화면</th><th scope="col">바꾼 이유</th></tr></thead>
        <tbody>
          <template v-for="g in groups" :key="g.group.id">
            <tr v-for="(l, i) in g.leaves" :key="l.id">
              <th v-if="i === 0" scope="rowgroup" :rowspan="g.leaves.length">{{ g.group.label }}</th>
              <td>
                <RouterLink :to="linkOf(l)" class="nm">{{ l.label }}</RouterLink>
                <span v-if="l.built" class="ws-badge ws-badge--brand" style="margin-left: 6px">그림</span>
              </td>
              <td>
                <ul class="as">
                  <li v-for="a in l.asis" :key="a"><code>{{ a }}</code> {{ asisById(a)?.gnb ?? '(공통)' }} › {{ asisById(a)?.name ?? '메인 대시보드' }}</li>
                </ul>
              </td>
              <td class="ws-desc" style="font-size: var(--ws-font-size-md)">{{ l.note }}</td>
            </tr>
          </template>
        </tbody>
      </table>

      <table v-else class="ws-gtb">
        <thead><tr><th scope="col" style="width: 150px">AS-IS 메뉴</th><th scope="col" style="width: 96px">ID</th><th scope="col">AS-IS 화면</th><th scope="col" style="width: 80px">난이도</th><th scope="col">제안 위치</th></tr></thead>
        <tbody>
          <template v-for="gn in GNB" :key="gn">
            <tr v-for="(s, i) in ASIS.filter((x) => x.gnb === gn)" :key="s.id">
              <th v-if="i === 0" scope="rowgroup" :rowspan="ASIS.filter((x) => x.gnb === gn).length">{{ gn }}</th>
              <td><code>{{ s.id }}</code></td>
              <td>{{ s.name }}<span v-if="s.dup" class="ws-desc"> — {{ s.dup }} 재사용</span></td>
              <td class="lv" :aria-label="s.level == null ? '미정' : `난이도 ${s.level}`">{{ lvl(s.level) }}</td>
              <td>
                <template v-if="where(s.id)">
                  <span v-if="where(s.id)!.g !== where(s.id)!.l">{{ where(s.id)!.g.label }} › </span><RouterLink :to="linkOf(where(s.id)!.l)" class="nm">{{ where(s.id)!.l.label }}</RouterLink>
                  <span v-if="(where(s.id)!.l.asis?.length ?? 0) > 1" class="ws-badge ws-badge--info" style="margin-left: 6px">합침</span>
                </template>
                <span v-else class="ws-badge ws-badge--mute">뺌</span> <span class="ws-desc">{{ SP_REMOVED[s.id] }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.sm { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.sm div { padding: 12px 16px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.sm dt { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.sm dd { margin-top: 2px; font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sm .is-key { border-color: var(--ws-action-search); }
.sm .is-key dd { color: var(--ws-text-brand); }
.ws-gtb tbody th[scope='rowgroup'] { vertical-align: top; padding: 8px 10px; background: var(--ws-surface-head); font-weight: 600; text-align: left; border-right: 1px solid var(--ws-border); }
.as { display: grid; gap: 2px; }
.as code, td > code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
.nm { color: var(--ws-text-link); }
.lv { color: var(--ws-text-sub); letter-spacing: 1px; font-size: 10px; white-space: nowrap; }
</style>
