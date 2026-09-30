<script setup lang="ts">
/**
 * 역할 스위처(미리보기용) — 상단바. 고른 역할로 모든 SB 화면의 버튼 권한이 바뀐다.
 * 칩 모양은 전역 조건(.cx)과 같게 해 상단바 보정을 같이 받는다.
 */
import { ref } from 'vue'
import Popover from 'primevue/popover'
import { ROLES } from './roles'
import { sb, roleLabel } from './context'

const pop = ref<InstanceType<typeof Popover> | null>(null)
function pick(code: string) { sb.role = code; pop.value?.hide() }
</script>

<template>
  <button type="button" class="cx" aria-haspopup="dialog" :aria-label="`미리보기 역할 — ${roleLabel()}. 바꾸기`" @click="(e) => pop?.toggle(e)">
    <span class="cx__k">역할</span><b>{{ roleLabel() }}</b>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  </button>
  <Popover ref="pop">
    <div class="rs">
      <p class="rs__h">미리보기 역할 — 버튼 권한이 이 역할을 따른다</p>
      <ul role="listbox" aria-label="역할">
        <li v-for="r in ROLES" :key="r.code">
          <button type="button" role="option" class="rs__i" :aria-selected="r.code === sb.role" @click="pick(r.code)">
            <b>{{ r.label }}</b><small>{{ r.org }} · {{ r.tier }}</small>
            <span class="ws-desc">{{ r.desc }}</span>
          </button>
        </li>
      </ul>
      <RouterLink to="/sb/roles" class="rs__lk" @click="pop?.hide()">역할 · 권한 매트릭스 →</RouterLink>
    </div>
  </Popover>
</template>

<style scoped>
.cx {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px;
  border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius); background: var(--ws-surface);
  color: var(--ws-text); font: inherit; font-size: var(--ws-font-size-md); cursor: pointer; white-space: nowrap;
}
.cx__k { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.rs { width: 380px; display: grid; gap: 8px; }
.rs__h { font-weight: 700; }
.rs ul { display: grid; gap: 2px; max-height: 60vh; overflow: auto; }
.rs__i { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; width: 100%; padding: 8px 10px; border: 0; border-radius: var(--ws-radius); background: none; color: var(--ws-text); font: inherit; text-align: left; cursor: pointer; }
.rs__i small { align-self: center; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.rs__i .ws-desc { grid-column: 1 / -1; }
.rs__i:hover { background: var(--ws-surface-hover); }
.rs__i[aria-selected='true'] { background: var(--ws-surface-selected); box-shadow: inset 3px 0 0 var(--ws-brand); }
.rs__lk { color: var(--ws-text-link); font-size: var(--ws-font-size-md); }
</style>
