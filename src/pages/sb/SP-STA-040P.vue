<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-040P 전용몰통계 상품/카테고리 통계 — 명세 src/specs/SP-STA-040P.json */
import { computed, ref } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import EzChart from '../../app/EzChart.vue'
import { notify } from '../../ws/notify'
import { periodError, presetRange, PRESETS, type Range } from '../../ws/period'
import WsPeriod from '../../ws/WsPeriod.vue'
import { YEARS, BIZ } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { CATEGORY_SALES, PRODUCT_RANK, ORDER_TREND } from '@fixtures/sb/B8'

const CODE = 'SP-STA-040P'
const year = ref(ctx.year)
const biz = ref(ctx.biz)
const partner = ref('')
const range = ref(presetRange(PRESETS[1]) as Range)
const picked = ref<string | null>(null)
const won = (n: number) => n.toLocaleString('ko-KR')

function search() {
  if (periodError(range.value, { maxYears: 1 })) return notify('최대 12개월 이내로 설정해 주세요.', 'danger')
  notify('조건에 맞춰 상품 · 카테고리 통계를 다시 집계했습니다.', 'success')
}
function download() {
  if (!PRODUCT_RANK.length) return notify('다운로드할 목록이 없습니다.', 'warning')
  notify('카테고리 · 상품 집계를 내려받기를 요청했습니다.', 'success')
}
const products = computed(() => (picked.value ? PRODUCT_RANK.filter((p) => p.category === picked.value) : PRODUCT_RANK).slice(0, 20))

const catOption = {
  xAxis: { type: 'category', data: CATEGORY_SALES.map((c) => c.category) },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: CATEGORY_SALES.map((c) => c.amount) }],
}
const trendOption = {
  legend: { bottom: 0 },
  xAxis: { type: 'category', data: ORDER_TREND.map((d) => d.date.slice(5)) },
  yAxis: { type: 'value' },
  series: [
    { name: '주문건수', type: 'bar', data: ORDER_TREND.map((d) => d.orders) },
    { name: '취소건수', type: 'bar', data: ORDER_TREND.map((d) => -d.cancels) },
  ],
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 조건</h2></div></div>
      <div class="cond">
        <label for="y-y" class="ws-req">참여년도</label>
        <Select v-model="year" input-id="y-y" :options="YEARS" style="width:110px" />
        <label for="y-b">사업</label>
        <Select v-model="biz" input-id="y-b" :options="[{ l: '전체', v: '' }, ...BIZ.map((b) => ({ l: b.label, v: b.code }))]" option-label="l" option-value="v" style="width:190px" />
        <label for="y-p2" class="ws-req">기간</label>
        <WsPeriod id="y-p2" v-model="range" :limit="{ maxYears: 1 }" />
        <Button label="조회" @click="search" />
      </div>
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">카테고리별 판매현황</h2><span class="ws-desc">행을 누르면 아래 상품 순위가 좁혀진다</span></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="download" /></SbCan></div>
      </div>
      <EzChart :option="catOption" height="220px" />
      <table class="ws-gtb" style="margin-top:10px">
        <thead><tr><th>카테고리</th><th>주문건수</th><th>판매금액</th><th>지원금액</th></tr></thead>
        <tbody>
          <tr v-for="c in CATEGORY_SALES" :key="c.category" class="rowbtn" :class="{ active: picked === c.category }" @click="picked = picked === c.category ? null : c.category">
            <td>{{ c.category }}</td><td>{{ won(c.cnt) }}</td><td>{{ won(c.amount) }}</td><td>{{ won(c.support) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">상품 판매 순위</h2><span class="ws-desc">{{ picked || '전체' }} · 판매금액 내림차순</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th>상품코드</th><th>상품명</th><th>카테고리</th><th>제휴사</th><th>주문건수</th><th>수량</th><th>판매금액</th></tr></thead>
        <tbody>
          <tr v-for="p in products" :key="p.code"><td>{{ p.code }}</td><td>{{ p.name }}</td><td>{{ p.category }}</td><td>{{ p.partner }}</td><td>{{ p.orders }}</td><td>{{ p.qty }}</td><td>{{ won(p.amount) }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">주문건수 추이</h2></div></div>
      <EzChart :option="trendOption" height="200px" />
    </section>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>상품 · 거래 원장은 전용몰(복지몰) 데이터라 이 화면은 읽기만 한다.</li></ul></div>
  </div>
</template>

<style scoped>
.cond { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.rowbtn { cursor: pointer; }
.rowbtn:hover { background: var(--ws-surface-alt); }
.rowbtn.active { background: var(--ws-surface-alt); font-weight: 600; }
</style>
