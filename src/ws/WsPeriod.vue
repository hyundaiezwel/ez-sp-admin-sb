<script setup lang="ts">
/**
 * 기간 입력 — 기준 선택 + 시작~종료 + 빠른 선택.
 *
 * AS-IS 검색 영역의 공통 문법이다(08 §3). 바꾼 것 셋:
 *   ① 날짜를 **타자로 칠 수 있다.** AS-IS는 `readonly`라 달력으로만 넣었다(08 §7)
 *   ② 범위 위반은 칸 아래에 바로 보인다 — `alert`가 아니다
 *   ③ 지금 값이 어느 빠른 선택과 같으면 그 버튼이 눌려 있다
 */
import { computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import { PRESETS, periodError, presetRange, samePreset, type PeriodLimit, type Range } from './period'

const props = defineProps<{
  id: string
  limit?: PeriodLimit
  /** 기간 기준(접수일 · 실행일 · 등록일). 하나뿐이면 넘기지 않는다 */
  bases?: string[]
}>()
const range = defineModel<Range>({ required: true })
const basis = defineModel<string>('basis')

const error = computed(() => periodError(range.value, props.limit))
const setFrom = (d: Date | Date[] | (Date | null)[] | null | undefined) => { range.value = [(d as Date) ?? null, range.value[1]] }
const setTo = (d: Date | Date[] | (Date | null)[] | null | undefined) => { range.value = [range.value[0], (d as Date) ?? null] }
</script>

<template>
  <div class="pd">
    <div class="pd__row">
      <Select v-if="bases?.length" v-model="basis" :options="bases" :aria-label="`${id} 기간 기준`" class="pd__basis" />
      <DatePicker
        :model-value="range[0]" :input-id="id" date-format="yy.mm.dd" placeholder="YYYY.MM.DD" show-icon icon-display="input"
        :invalid="!!error" class="pd__d" aria-label="시작일" @update:model-value="setFrom"
      />
      <span aria-hidden="true">~</span>
      <DatePicker
        :model-value="range[1]" date-format="yy.mm.dd" placeholder="YYYY.MM.DD" show-icon icon-display="input"
        :invalid="!!error" class="pd__d" aria-label="종료일" @update:model-value="setTo"
      />
      <div class="pd__pre" role="group" aria-label="빠른 기간 선택">
        <button
          v-for="p in PRESETS" :key="p.label" type="button" class="pd__p" :aria-pressed="samePreset(range, p)"
          @click="range = presetRange(p)"
        >{{ p.label }}</button>
      </div>
    </div>
    <p v-if="error" class="ws-err" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.pd__row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pd__basis { width: 104px; }
.pd__d { width: 136px; flex: none; }
.pd__pre { flex: none; display: inline-flex; margin-left: 6px; border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius); overflow: hidden; }
.pd__p {
  height: 30px; padding: 0 10px; border: 0; background: var(--ws-surface); color: var(--ws-text-sub);
  font: inherit; font-size: var(--ws-font-size-md); cursor: pointer; white-space: nowrap;
}
.pd__p + .pd__p { border-left: 1px solid var(--ws-border); }
.pd__p:hover { background: var(--ws-surface-hover); color: var(--ws-text); }
.pd__p[aria-pressed='true'] { background: var(--ws-action-primary); color: var(--ws-action-primary-fg); font-weight: 600; }
.pd__p:focus-visible { outline: none; box-shadow: inset var(--ws-focus-ring); }
</style>
