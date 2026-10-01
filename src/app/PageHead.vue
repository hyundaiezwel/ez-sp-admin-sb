<script setup lang="ts">
/**
 * 화면 제목 — 원본 `pgtbox`. 36개 화면이 같은 wframe을 물고 있던 조각이다.
 *
 * 제목·경로는 메뉴 트리에서 뽑는다 — 화면이 제목 문자열을 따로 들면 메뉴 이름을 바꿀 때
 * 어긋난다. 오른쪽 경로는 원본대로 **제목 반대편**에 둔다(EZ 셸과 반대다).
 */
import { computed, inject, ref } from 'vue'
import Button from 'primevue/button'
import { SB_FRAME } from '../sb/frame'
import { useRoute } from 'vue-router'
import { trail } from './menu'

/** 상세 화면은 메뉴에 없어 제목을 화면이 준다. 경로에는 부모 메뉴를 한 칸 더 넣는다 */
const props = defineProps<{ title?: string }>()
const route = useRoute()
const t = computed(() => trail(route.path))
const menuTitle = computed(() => t.value?.leaf?.label ?? t.value?.top.label ?? '화면')
const title = computed(() => props.title ?? menuTitle.value)

/** SB 화면이면 오른쪽 끝에 '명세' 버튼 — SbFrame이 내려준다 */
const sbFrame = inject(SB_FRAME, null)

// 원본의 "마이메뉴 등록" · "화면 잠금" 칩. 목업이라 상태만 뒤집는다
const fav = ref(false)
const locked = ref(false)
</script>

<template>
  <div class="ws-pgt">
    <h1 class="ws-pgt__tit">{{ title }}</h1>
    <div class="ws-pgt__tools">
      <button type="button" class="ws-chip" :aria-pressed="fav" @click="fav = !fav" v-tooltip.bottom="'마이메뉴 등록'">
        <span class="ws-chip__t">마이메뉴 등록</span>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" :fill="fav ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>
      </button>
      <button type="button" class="ws-chip" :aria-pressed="locked" @click="locked = !locked" v-tooltip.bottom="'화면 잠금'">
        <span class="ws-chip__t">화면 잠금</span>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path :d="locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'" /></svg>
      </button>
    </div>
    <ol class="ws-pgt__crumb" aria-label="현재 위치">
      <li>홈</li>
      <li v-if="t && t.leaf">{{ t.top.label }}</li>
      <li v-if="t?.detail">{{ menuTitle }}</li>
      <li aria-current="page">{{ title }}</li>
    </ol>
    <Button v-if="sbFrame" label="명세" size="small" severity="secondary" outlined aria-keyshortcuts="Shift+/" v-tooltip.bottom="'화면 명세 (?)'" @click="sbFrame.openSpec()" />
  </div>
</template>
