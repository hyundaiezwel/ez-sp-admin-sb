<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-050P 일매출자료 — TO-BE에서는 독립 메뉴로 두지 않고 이용실적통계(SP-STA-031P)의
 * 일별 보기로 옮긴다(IA 메모). 이 화면은 조회일자 하루의 합계 한 줄과 이관 안내만 둔다.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import PageHead from '../../app/PageHead.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { dailySales } from '@fixtures/sb/B5'

const CODE = 'SP-STL-050P'
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
const at = ref<Date>(yesterday)
const applied = ref<Date | null>(yesterday)
const failed = ref(false)
const ymd = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

const data = computed(() => (applied.value ? dailySales(ymd(applied.value)) : null))
const mismatch = computed(() => (data.value ? Math.abs(data.value.amount - data.value.general - data.value.familyFriendly) : 0))

function search() {
  if (!at.value) return notify('조회일자를 정확히 입력해 주세요.', 'danger')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (at.value > today) return notify('조회일자를 정확히 입력해 주세요.', 'danger')
  failed.value = at.value.getDate() === 13
  applied.value = failed.value ? null : at.value
  if (failed.value) notify('조회에 실패했습니다.', 'danger')
}
function reset() { at.value = yesterday; search() }
function goStats() { if (applied.value) router.push({ path: routeOf('SP-STA-031P'), query: { date: ymd(applied.value) } }) }
function download() {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  notify('그날 집계 한 줄을 내려받았습니다(미리보기).', 'success')
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="ds-at">조회일자</label></th>
        <td colspan="3"><DatePicker v-model="at" input-id="ds-at" date-format="yy.mm.dd" show-icon icon-display="input" :max-date="new Date()" fluid /></td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">일별 이용유형별 매출 집계는 이용실적통계(SP-STA-031P)의 일별 보기로 옮긴다 — 이 화면은 이관 전까지 하루 합계와 연결만 둔다.</p>

    <section v-if="failed" class="ws-sec ws-card"><div class="ws-empty"><p>조회에 실패했습니다.</p><Button label="다시 조회" severity="secondary" outlined @click="search" /></div></section>

    <section v-else-if="data" class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">{{ data.date }} 일매출 합계</h2></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="내려받기" severity="secondary" outlined @click="download" /></SbCan></div>
      </div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">건수</th><th scope="col">사용액</th><th scope="col">일반</th><th scope="col">가정친화</th></tr></thead>
        <tbody><tr><td class="ws-num">{{ data.count.toLocaleString('ko-KR') }}건</td><td class="ws-num">{{ won(data.amount) }}</td><td class="ws-num">{{ won(data.general) }}</td><td class="ws-num">{{ won(data.familyFriendly) }}</td></tr></tbody>
      </table>
      <p v-if="mismatch > 0" class="ws-err" role="alert">사용액이 일반 + 가정친화와 {{ won(mismatch) }} 다릅니다.</p>
      <p class="ws-desc" style="margin-top:8px">집계 기준 — 적용일자 기준, 취소 반영. 통계 일일 리포트와 기준 · 날짜가 달라 직접 비교되지 않는다.</p>
      <Button label="이용실적통계에서 보기" severity="secondary" outlined style="margin-top:8px" @click="goStats" />
    </section>
  </div>
</template>
