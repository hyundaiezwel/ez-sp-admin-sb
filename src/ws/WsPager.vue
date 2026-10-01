<script setup lang="ts">
/**
 * 서버 페이징 — 쪽 번호 가운데, 쪽당 건수 오른쪽(AS-IS 배치 그대로).
 *
 * 그리드(TabGrid)는 원래 전량을 받아 가상 스크롤한다. 회원 십만 단위 · 기업 만 단위를 한 번에
 * 내려받을 수는 없어서 **목록이 서버 쪽을 넘기는** 화면은 이것을 붙인다.
 * 쪽을 넘기면 선택이 풀린다 — 보이지 않는 쪽의 행이 선택된 채로 일괄 처리에 들어가면 안 된다.
 */
import Paginator from 'primevue/paginator'
import Select from 'primevue/select'

defineProps<{ total: number; sizes?: number[] }>()
const first = defineModel<number>('first', { required: true })
const rows = defineModel<number>('rows', { required: true })
</script>

<template>
  <div class="pg">
    <Paginator
      v-model:first="first" :rows="rows" :total-records="total" :page-link-size="10"
      template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink" class="pg__links"
    />
    <Select
      v-model="rows" :options="(sizes ?? [5, 10, 20, 50, 100]).map((n) => ({ label: `${n}건`, value: n }))"
      option-label="label" option-value="value" aria-label="쪽당 건수" class="pg__size" @change="first = 0"
    />
  </div>
</template>

<style scoped>
.pg { position: relative; display: flex; justify-content: center; align-items: center; min-height: 32px; margin-top: var(--ws-gap-inter); }
.pg__size { position: absolute; right: 0; width: 96px; }
.pg :deep(.p-paginator-page) { font-size: var(--ws-font-size-md); font-variant-numeric: tabular-nums; width: auto; min-width: 32px; padding-inline: 6px; white-space: nowrap; } /* 두 자리 쪽 번호가 32px 정사각에서 꺾이던 문제 */
</style>
