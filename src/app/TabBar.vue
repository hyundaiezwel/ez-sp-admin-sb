<script setup lang="ts">
/**
 * 열린 화면 탭(MDI).
 *
 * 모양은 원본 `w2tabcontrol`을 따른다 — 35px · 밑줄 #ccc · 활성 탭 흰 배경에 #ced4da 테두리.
 * **폭은 180px 고정이다.** 내용에 맞추면 탭을 열 때마다 이미 열린 탭이 움직여서 같은 탭이
 * 같은 자리에 있지 않다(DS1 docs/navigation.md §3 — 사용자 결정 2026-09-21).
 *
 * 넘치면 좌우 버튼이 나온다. 스크롤바를 드러내지 않는 이유는 업무 화면에서 휠이
 * 본문 스크롤과 다투기 때문이다.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { close, tabs } from './tabs'

const router = useRouter()
const scroller = ref<HTMLElement | null>(null)
const overflow = ref(false)

const measure = () => {
  const el = scroller.value
  overflow.value = !!el && el.scrollWidth > el.clientWidth + 1
}
watch(() => tabs.items.length, async () => { await nextTick(); measure() }, { immediate: true })

const move = (d: 1 | -1) => scroller.value?.scrollBy({ left: d * 360, behavior: 'smooth' })
const active = computed(() => tabs.active)
</script>

<template>
  <div class="tb">
    <button v-if="overflow" class="tb__nav" type="button" aria-label="이전 탭 보기" @click="move(-1)">‹</button>
    <div ref="scroller" class="tb__scroll" role="tablist" aria-label="열린 화면">
      <div
        v-for="t in tabs.items"
        :key="t.path"
        class="tb__item"
        :class="{ 'is-on': t.path === active }"
        role="tab"
        :aria-selected="t.path === active"
        tabindex="0"
        @click="router.push(t.path)"
        @keydown.enter="router.push(t.path)"
        @keydown.space.prevent="router.push(t.path)"
      >
        <span class="tb__label" :title="t.title">{{ t.title }}</span>
        <button v-if="!t.fixed" class="tb__x" type="button" :aria-label="`${t.title} 탭 닫기`" @click.stop="close(t.path, router)">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.4" /></svg>
        </button>
      </div>
    </div>
    <button v-if="overflow" class="tb__nav" type="button" aria-label="다음 탭 보기" @click="move(1)">›</button>
  </div>
</template>

<style scoped>
.tb {
  --tab-w: 180px;
  flex: none;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: calc(var(--ws-tab-h) + 8px);
  padding: 0 16px;
  background: var(--ws-surface-head);
  border-bottom: 1px solid var(--ws-border);
}
.tb__scroll { flex: 1; min-width: 0; display: flex; align-items: flex-end; gap: 2px; overflow-x: auto; scrollbar-width: none; }
.tb__scroll::-webkit-scrollbar { display: none; }

.tb__item {
  position: relative;
  flex: none;
  width: var(--tab-w);
  display: flex;
  align-items: center;
  gap: 4px;
  height: calc(var(--ws-tab-h) + 1px);
  margin-bottom: -1px; /* 밑줄을 덮는다 */
  padding: 0 30px; /* D7 T3 — 좌우 같게, 이름이 가운데 */
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: var(--ws-radius) var(--ws-radius) 0 0;
  color: var(--ws-text-sub);
  cursor: pointer;
}
.tb__item:hover { background: var(--ws-surface-head-hover); }
.tb__item.is-on {
  background: var(--ws-surface);
  border-color: var(--ws-border-grid);
  color: var(--ws-text);
  font-weight: 700;
}
/* D7 T3(2026-09-28) — 이름은 탭 가운데. 좌우 안쪽 여백을 30으로 같게 두고 닫기는 오른쪽에 띄운다(이름 폭을 먹지 않게).
   닫기는 활성 탭 · 올렸을 때 · 키보드로 들어왔을 때만 보인다 — 쉬는 탭 줄이 조용해진다 */
.tb__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.tb__x { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 20px; height: 20px; border: 0; border-radius: var(--ws-radius-sm); background: none; color: var(--ws-text-muted); cursor: pointer; }
.tb__item:not(.is-on):not(:hover):not(:focus-within) .tb__x { opacity: 0; }
.tb__x:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--ws-field-border-focus); }
.tb__x:hover { background: var(--ws-surface-alt); color: var(--ws-text); }
.tb__nav { flex: none; width: 24px; height: var(--ws-tab-h); border: 0; background: none; color: var(--ws-text-sub); font-size: 18px; cursor: pointer; }
</style>
