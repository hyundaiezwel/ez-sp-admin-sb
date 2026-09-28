<script setup lang="ts">
/**
 * 통합 검색 — 상단바 가운데(D6 A · Q2).
 *
 * 메뉴는 메뉴 트리에서 바로 찾고, 업무 데이터(기업 · 접수번호 · 회원 · 적발 번호)는
 * 처음 검색할 때 `sp/search.ts`를 늦게 싣는다.
 *
 * `/` 또는 ⌘K / Ctrl+K로 들어온다(입력 중이 아닐 때). ↑↓로 고르고 Enter로 간다. Esc는 지우고 닫는다.
 * WAI-ARIA 콤보박스 — 입력칸이 목록을 가리키고, 고른 항목을 `aria-activedescendant`로 알린다.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SYSTEM as sys } from './menu'
import AppIcon from './AppIcon.vue'

export interface SearchHit { group: string; label: string; sub?: string; to: string; before?: () => void }

const router = useRouter()
const q = ref('')
const open = ref(false)
const at = ref(0)
const input = ref<HTMLInputElement | null>(null)
const dataSearch = shallowRef<((q: string) => SearchHit[]) | null>(null)

const menuHits = computed<SearchHit[]>(() => {
  const k = q.value.trim()
  if (!k) return []
  return [...sys.menu, ...sys.foot]
    .flatMap((m) => (m.children ?? [m]).filter((c) => c.to && c.label.includes(k)).map((c) => ({ group: '메뉴', label: c.label, sub: m.children ? m.label : undefined, to: c.to! })))
    .slice(0, 6)
})
const hits = computed<SearchHit[]>(() => [...menuHits.value, ...(q.value.trim() && dataSearch.value ? dataSearch.value(q.value) : [])])
const groups = computed(() => [...new Set(hits.value.map((h) => h.group))].map((g) => ({ g, items: hits.value.filter((h) => h.group === g) })))
watch(q, async (v) => {
  at.value = 0
  open.value = !!v.trim()
  if (v.trim() && !dataSearch.value) dataSearch.value = (await import('../sp/search')).searchData
})

function go(h: SearchHit | undefined) {
  if (!h) return
  h.before?.()
  router.push(h.to)
  q.value = ''
  open.value = false
  input.value?.blur()
}
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); open.value = true; at.value = Math.min(at.value + 1, hits.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); at.value = Math.max(at.value - 1, 0) }
  else if (e.key === 'Enter') { e.preventDefault(); go(hits.value[at.value]) }
  else if (e.key === 'Escape') { q.value = ''; open.value = false }
}
/** `/` · ⌘K — 입력칸 · 편집 칸에 있을 때는 가로채지 않는다 */
function global(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); input.value?.focus(); input.value?.select() }
}
onMounted(() => window.addEventListener('keydown', global))
onBeforeUnmount(() => window.removeEventListener('keydown', global))
const idx = (h: SearchHit) => hits.value.indexOf(h)
const placeholder = '메뉴 · 기업 · 회원 · 접수번호 검색'
</script>

<template>
  <div class="gs" @focusout="(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) open = false }">
    <label class="gs__box">
      <AppIcon name="search" :size="16" />
      <input
        ref="input" v-model="q" type="search" role="combobox" :aria-expanded="open" aria-controls="gs-list" aria-autocomplete="list"
        :aria-activedescendant="open && hits.length ? `gs-o${at}` : undefined" :placeholder="placeholder" :aria-label="placeholder"
        @keydown="key" @focus="open = !!q.trim()"
      />
      <kbd class="gs__kbd" aria-hidden="true">/</kbd>
    </label>
    <div v-if="open" id="gs-list" class="gs__pop" role="listbox" :aria-label="`${placeholder} 결과`">
      <template v-for="g in groups" :key="g.g">
        <p class="gs__g" role="presentation">{{ g.g }}</p>
        <div
          v-for="h in g.items" :id="`gs-o${idx(h)}`" :key="h.group + h.label + h.to" role="option" :aria-selected="idx(h) === at"
          class="gs__i" @mousedown.prevent="go(h)" @mousemove="at = idx(h)"
        >
          <span class="gs__l">{{ h.label }}</span><small v-if="h.sub">{{ h.sub }}</small>
        </div>
      </template>
      <p v-if="!hits.length" class="gs__none">일치하는 항목이 없습니다</p>
      <p class="gs__foot">회원은 2자 이상 · 이름은 가려서 보인다 · 적발은 SC-번호</p>
    </div>
  </div>
</template>

<style scoped>
.gs { position: relative; width: min(440px, 36vw); }
.gs__box {
  display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px 0 12px;
  border: 1px solid var(--ws-top-field); border-radius: 17px; background: var(--ws-top-q); color: var(--ws-top-muted);
}
.gs__box:focus-within { border-color: var(--ws-top-fg); }
.gs__box input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--ws-top-fg); font: inherit; font-size: var(--ws-font-size-md); }
.gs__box input::placeholder { color: var(--ws-top-muted); }
.gs__box input:focus { outline: none; }
.gs__box input::-webkit-search-cancel-button { display: none; }
.gs__kbd { padding: 0 6px; border: 1px solid var(--ws-top-field); border-radius: 4px; font: inherit; font-size: 11px; line-height: 16px; }
.gs__pop {
  position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 60; max-height: 420px; overflow: auto; padding: 6px 0;
  border: 1px solid var(--ws-border); border-radius: var(--ws-radius-lg); background: var(--ws-surface); color: var(--ws-text);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.22);
}
.gs__g { padding: 8px 14px 4px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.gs__i { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 8px 14px; cursor: pointer; }
.gs__i[aria-selected='true'] { background: var(--ws-surface-selected); }
.gs__l { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs__i small { flex: none; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.gs__none { padding: 16px 14px; color: var(--ws-text-muted); text-align: center; }
.gs__foot { margin-top: 4px; padding: 8px 14px 4px; border-top: 1px solid var(--ws-border-lighter); color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
</style>
