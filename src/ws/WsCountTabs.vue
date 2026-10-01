<script setup lang="ts">
/**
 * 건수가 붙은 상태 거르개 — 목록 바로 위.
 *
 * AS-IS는 상태를 조회 영역의 라디오 15개로 고른다. 몇 건씩 있는지는 하나씩 눌러 봐야 안다.
 * 여기서는 업무 단계 몇 개로 묶어 **건수를 먼저 보여 주고**, 누르면 바로 거른다(조회 버튼 없이).
 * 하위 상태가 있는 단계만 아래 칩을 편다 — 15개를 한 줄에 늘어놓지 않는다.
 *
 * 탭 모양이지만 거르개다 — 내용이 바뀌는 게 아니라 같은 목록이 좁혀진다. 그래서 role은
 * tablist가 아니라 radiogroup이다.
 */
export interface CountTab { id: string; label: string; count: number; subs?: { id: string; label: string; count: number }[] }
defineProps<{ tabs: CountTab[]; label: string }>()
const tab = defineModel<string>({ required: true })
const sub = defineModel<string | null>('sub', { default: null })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ct">
    <div class="ct__main" role="radiogroup" :aria-label="label">
      <button
        v-for="t in tabs" :key="t.id" type="button" role="radio" class="ct__t" :aria-checked="tab === t.id"
        @click="tab = t.id; sub = null"
      ><span>{{ t.label }}</span><b>{{ fmt(t.count) }}</b></button>
    </div>
    <div v-for="t in tabs.filter((x) => x.id === tab && x.subs)" :key="t.id" class="ct__subs" role="radiogroup" :aria-label="`${t.label} 하위 상태`">
      <button type="button" role="radio" class="ct__s" :aria-checked="sub === null" @click="sub = null">전체 {{ fmt(t.count) }}</button>
      <button v-for="s in t.subs" :key="s.id" type="button" role="radio" class="ct__s" :aria-checked="sub === s.id" :disabled="!s.count" @click="sub = s.id">{{ s.label }} {{ fmt(s.count) }}</button>
    </div>
  </div>
</template>

<style scoped>
.ct { display: grid; gap: 8px; }
.ct__main { display: flex; border-bottom: 1px solid var(--ws-border); overflow-x: auto; scrollbar-width: thin; }
.ct__t { flex: none; white-space: nowrap;
  display: flex; align-items: baseline; gap: 6px; height: 40px; padding: 0 16px; margin-bottom: -1px;
  border: 0; border-bottom: 2px solid transparent; background: none; color: var(--ws-text-sub); font: inherit; cursor: pointer;
}
.ct__t b { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--ws-text-muted); }
.ct__t:hover { color: var(--ws-text); }
.ct__t[aria-checked='true'] { border-bottom-color: var(--ws-action-primary); color: var(--ws-text); font-weight: 700; }
.ct__t[aria-checked='true'] b { color: var(--ws-text-brand); }
.ct__t:focus-visible, .ct__s:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
.ct__subs { display: flex; flex-wrap: wrap; gap: 6px; }
.ct__s {
  height: 28px; padding: 0 10px; border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius-pill);
  background: var(--ws-surface); color: var(--ws-text-sub); font: inherit; font-size: var(--ws-font-size-md); cursor: pointer;
}
.ct__s:hover:not(:disabled) { color: var(--ws-text); }
.ct__s[aria-checked='true'] { border-color: var(--ws-action-primary); background: var(--ws-action-primary); color: var(--ws-action-primary-fg); font-weight: 600; }
.ct__s:disabled { opacity: 0.5; cursor: default; }
</style>
