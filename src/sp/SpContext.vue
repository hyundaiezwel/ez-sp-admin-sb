<script setup lang="ts">
/**
 * 전역 조건 선택기 — 상단바(D6 A).
 *
 * 셸에 두는 이유: 조건은 **열린 탭 전부**에 걸린다. 화면 안(조회 영역)에 두면 탭마다
 * 다른 값을 가진 것처럼 읽힌다. 상단바의 어두운 면에 맞춘 색은 TopBar가 덮는다. 접힌 상태에서도 지금 조건이 글자로 보여야 한다 —
 * 아이콘만 두면 "지금 어느 사업을 보고 있나"를 열어 봐야 안다.
 */
import { computed, ref } from 'vue'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { BIZ, ROLES, YEARS, bizLabel } from './codes'
import { ctx } from './context'

/** SB 시스템은 자체 역할 스위처를 쓴다 — 여기 역할은 숨긴다 */
defineProps<{ hideRole?: boolean }>()
const pop = ref<InstanceType<typeof Popover> | null>(null)
const role = computed(() => ROLES.find((r) => r.code === ctx.role)?.label)
const years = YEARS.map((y) => ({ label: `${y}년`, value: y }))
</script>

<template>
  <button type="button" class="cx" aria-haspopup="dialog" :aria-label="`전역 조건 — ${ctx.year}년, ${bizLabel(ctx.biz)}, 역할 ${role}. 바꾸기`" @click="(e) => pop?.toggle(e)">
    <span class="cx__k">참여년도</span><b>{{ ctx.year }}</b>
    <span class="cx__k">사업</span><b class="cx__biz">{{ bizLabel(ctx.biz) }}</b>
    <span v-if="!hideRole" class="cx__role">{{ role }}</span>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  </button>
  <Popover ref="pop">
    <div class="cx-pop">
      <p class="cx-pop__h">전역 조건 — 열린 화면 전부에 적용</p>
      <label for="cx-y">참여년도</label>
      <Select v-model="ctx.year" input-id="cx-y" :options="years" option-label="label" option-value="value" fluid />
      <label for="cx-b">사업</label>
      <Select v-model="ctx.biz" input-id="cx-b" :options="BIZ" option-label="label" option-value="code" fluid />
      <template v-if="!hideRole">
      <label for="cx-r">역할 <small>(미리보기용)</small></label>
      <Select v-model="ctx.role" input-id="cx-r" :options="ROLES" option-label="label" option-value="code" fluid />
      <p class="ws-desc">역할을 바꾸면 버튼 권한이 달라진다. 역할별 권한 범위는 AS-IS에서 확인하지 못한 가정이다.</p>
      </template>
      <div class="cx-pop__f"><Button label="닫기" severity="secondary" outlined size="small" @click="pop?.hide()" /></div>
    </div>
  </Popover>
</template>

<style scoped>
.cx {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; max-width: 460px; padding: 0 10px;
  border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius); background: var(--ws-surface);
  color: var(--ws-text); font: inherit; font-size: var(--ws-font-size-md); cursor: pointer; white-space: nowrap;
}
.cx:hover { border-color: var(--ws-text-muted); }
.cx:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
.cx__k { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.cx__k + b { margin-right: 6px; }
.cx__biz { overflow: hidden; text-overflow: ellipsis; }
.cx__role { padding: 0 6px; border-radius: var(--ws-radius-xs); background: var(--ws-surface-badge); color: var(--ws-text-badge); font-size: var(--ws-font-size-sm); }
.cx-pop { display: grid; gap: 6px; width: 300px; }
.cx-pop label { margin-top: 6px; color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.cx-pop__h { font-weight: 700; }
.cx-pop__f { display: flex; justify-content: flex-end; margin-top: 6px; }
</style>
