<script setup lang="ts">
/**
 * 화면 · 모달 코드 표시 — 누르면 코드를 복사한다.
 * 모달은 푸터 왼쪽에 둔다: `<template #footer><SbCode code="SP-XXX-010L-M1" /><Button … /></template>`.
 * 푸터가 오른쪽 정렬이라 `margin-right: auto`로 왼쪽에 붙는다.
 */
import { notify } from '../ws/notify'

const props = defineProps<{ code: string }>()
async function copy() {
  try { await navigator.clipboard.writeText(props.code); notify(`${props.code} 복사함`, 'success', 1600) }
  catch { notify(props.code, 'info') }
}
</script>

<template>
  <button type="button" class="sb-code" :aria-label="`화면 코드 ${code} 복사`" :title="`${code} — 눌러서 복사`" @click="copy">{{ code }}</button>
</template>

<style>
.sb-code {
  margin-right: auto; padding: 1px 6px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius-sm);
  background: var(--ws-surface); color: var(--ws-text-muted); cursor: copy;
  font: 500 11px/16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0;
}
.sb-code:hover { color: var(--ws-text); border-color: var(--ws-field-border); }
.sb-code:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
</style>
