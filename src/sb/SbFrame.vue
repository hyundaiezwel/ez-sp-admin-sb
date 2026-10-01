<script setup lang="ts">
/**
 * SB 화면 틀 — `/sb/s/:code`의 라우트 컴포넌트.
 *
 * `src/pages/sb/<CODE>.vue`가 있으면 그것을, 없으면 설계 카드(SbPending)를 그린다.
 * 배치는 파일만 더하면 된다 — 라우터를 고치지 않는다.
 * 모든 화면에 공통으로 얹는 것: 좌하단 화면 코드 배지 · PageHead 오른쪽 '명세' 버튼(? 키) → 명세 서랍.
 */
import { defineAsyncComponent, onActivated, onDeactivated, onMounted, onUnmounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import SbPending from './SbPending.vue'
import SpecDrawer from './SpecDrawer.vue'
import SbCode from './SbCode.vue'
import { SB_FRAME } from './frame'

const pages = import.meta.glob('/src/pages/sb/*.vue')
// KeepAlive 키가 경로라 인스턴스마다 코드가 고정이다 — 한 번만 푼다
const code = String(useRoute().params.code ?? '')
const loader = pages[`/src/pages/sb/${code}.vue`]
const Page = loader ? defineAsyncComponent(loader as () => Promise<any>) : SbPending

const open = ref(false)
provide(SB_FRAME, { code, openSpec: () => { open.value = true } })

/** Shift+/ (?) — 입력 중이 아니고 이 화면이 보일 때만. `/`는 통합 검색이 쓴다 */
function key(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (!(e.key === '?' || (e.key === '/' && e.shiftKey)) || e.isComposing || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return
  e.preventDefault()
  open.value = !open.value
}
const on = () => window.addEventListener('keydown', key)
const off = () => window.removeEventListener('keydown', key)
onMounted(on); onActivated(on); onDeactivated(off); onUnmounted(off)
</script>

<template>
  <div class="sbf">
    <component :is="Page" />
    <div class="sbf__code"><SbCode :code="code" /></div>
    <SpecDrawer v-model:visible="open" :code="code" />
  </div>
</template>

<style scoped>
.sbf { display: flex; flex-direction: column; min-height: 100%; }
.sbf > :first-child { flex: 1 0 auto; }
/* 본문 스크롤 영역의 좌하단에 붙는다 — sticky(높이 0) 안에서 절대 위치로 띄운다 */
.sbf__code { position: sticky; bottom: 0; left: 0; width: 0; height: 0; z-index: 5; } /* 가로 스크롤해도 좌하단에 남는다 */
.sbf__code :deep(.sb-code) { position: absolute; left: 8px; bottom: 8px; opacity: 0.85; }
.sbf__code :deep(.sb-code:hover) { opacity: 1; }
</style>
