<script setup lang="ts">
/**
 * 조회 영역 — 원본 `shbox`.
 *
 * 목록 화면 다섯 장이 똑같이 쓴다. 제목줄(초기화 · 조회(F2) · 상세조회) + 한 줄 폼 +
 * 아래 가운데 접기 손잡이. 화면은 `<tr>`만 넘긴다 — 라벨과 칸의 폭은 `cols`가 정한다.
 *
 * **조회 버튼만 초록이다.** 원본 `.shbox .titbox .btn_cm.pri` 규칙이다.
 * F2는 보이는 화면에서만 받는다(`useHotkey`).
 */
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import { useHotkey } from '../app/useHotkey'

const props = withDefaults(defineProps<{ cols?: string[]; title?: string }>(), {
  // 라벨 · 칸 × 3 — 원본 조회 영역은 한 줄에 셋이 기본이다
  cols: () => ['72px', '', '132px', '', '132px', ''],
  title: '조회',
})
const emit = defineEmits<{ search: []; reset: [] }>()
const detail = ref(false)
/**
 * 라벨 칸은 **글자에 맞춰 늘어난다**(width 1% + nowrap). 고정 폭이면 여백(좌 60 · 우 19)을 빼고
 * 3~4자밖에 안 들어가서 '사업자등록번호' 같은 라벨이 입력 칸 밑으로 들어갔다.
 * 같은 열의 라벨은 행이 달라도 가장 긴 라벨 폭으로 맞춰진다. 입력 칸은 남은 폭을 똑같이 나눈다.
 * `cols`의 라벨 폭(짝수 번째)은 이제 쓰지 않는다 — 입력 칸 폭(홀수 번째)만 화면이 정할 수 있다.
 */
const colStyles = computed(() => {
  const pairs = Math.max(1, Math.floor(props.cols.length / 2))
  return props.cols.map((w, i) => (i % 2 === 0 ? { width: '1%' } : { width: w || `${Math.floor(100 / pairs)}%` }))
})

useHotkey('F2', () => emit('search'))
</script>

<template>
  <form class="ws-sh" @submit.prevent="emit('search')">
    <div class="ws-tit">
      <div class="ws-tit__l"><h2 class="ws-tit__h">{{ title }}</h2></div>
      <div class="ws-tit__r">
        <Button type="button" severity="secondary" outlined aria-label="조건 초기화" v-tooltip.bottom="'초기화'" @click="emit('reset')">
          <template #icon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg></template>
        </Button>
        <Button type="submit" label="조회(F2)" />
        <Button v-if="$slots.detail" type="button" severity="secondary" outlined label="상세조회" :aria-expanded="detail" @click="detail = !detail" />
      </div>
    </div>
    <div class="ws-sh__body">
      <table class="ws-tb">
        <colgroup><col v-for="(st, i) in colStyles" :key="i" :style="st" /></colgroup>
        <tbody>
          <slot />
          <slot v-if="detail" name="detail" />
        </tbody>
      </table>
    </div>
    <button v-if="$slots.detail" type="button" class="ws-sh__fold" :aria-expanded="detail" :aria-label="detail ? '상세 조건 접기' : '상세 조건 펼치기'" @click="detail = !detail" />
  </form>
</template>
