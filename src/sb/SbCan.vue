<script setup lang="ts">
/**
 * 버튼 권한 울타리 — 권한이 없으면 안의 버튼을 **숨기지 않고 끈다** + 툴팁 '<역할>은 <동작> 권한 없음'.
 *
 *   <SbCan action="download"><WsDownload :total="total" /></SbCan>
 *   <SbCan action="approve"><Button label="승인" /></SbCan>
 *
 * `<fieldset disabled>`가 안의 button · input을 브라우저 차원에서 끈다 — 어떤 부품이든 감싸기만 하면 된다.
 * 꺼진 버튼은 마우스 이벤트를 받지 않아 툴팁은 울타리가 받는다(자식 pointer-events 끔).
 * code를 안 주면 SbFrame의 화면 코드를 쓴다.
 */
import { computed, inject } from 'vue'
import type { Action } from './roles'
import { denyTip } from './context'
import { SB_FRAME } from './frame'

const props = defineProps<{ action: Action; code?: string }>()
const frame = inject(SB_FRAME, null)
const tip = computed(() => denyTip(props.code ?? frame?.code ?? '', props.action))
</script>

<template>
  <fieldset class="sb-can" :disabled="!!tip" v-tooltip.top="tip || undefined">
    <slot />
    <span v-if="tip" class="ws-sr-only">{{ tip }}</span>
  </fieldset>
</template>

<style>
.sb-can { display: inline-flex; align-items: center; gap: var(--ws-gap-adjacent, 6px); min-inline-size: 0; margin: 0; padding: 0; border: 0; }
.sb-can:disabled > * { pointer-events: none; }
</style>
