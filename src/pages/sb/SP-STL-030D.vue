<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-030D 잔액현황 상세 — 한 기업의 입금 회차별 입금과 청구연월별 출금 · 환불을
 * 펼쳐 본다. 조회 전용 · 개인정보 없음 — 사유 없이 내려받는다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { balanceOf } from '@fixtures/sb/B5'

const CODE = 'SP-STL-030D'
const route = useRoute()
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const unit = ref<'원' | '천원' | '백만원'>('원')
const div = computed(() => (unit.value === '원' ? 1 : unit.value === '천원' ? 1_000 : 1_000_000))
const money = (n: number) => Math.round(n / div.value).toLocaleString('ko-KR') + (unit.value === '원' ? '원' : unit.value)

const companyId = ref('')
watch(() => route.query.companyId, (v) => { companyId.value = String(v ?? '') }, { immediate: true })
const company = computed(() => COMPANIES.find((c) => c.id === companyId.value) ?? null)
const balance = computed(() => balanceOf(companyId.value))
const calcRemainCoPerson = computed(() => (balance.value ? balance.value.initCoPerson - balance.value.withdrawCoPerson - balance.value.refundCoPerson : 0))
const diff = computed(() => (balance.value ? Math.abs(calcRemainCoPerson.value - balance.value.remainCoPerson) : 0))

function goBill(ym: string) { router.push({ path: routeOf('SP-STL-020D'), query: { companyId: companyId.value, ym } }) }
function goRefund(ym: string) { router.push({ path: routeOf('SP-STL-040D'), query: { companyId: companyId.value, ym, round: 1 } }) }
function download() {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  notify('청구연월별 표를 원 단위로 내려받았습니다(미리보기).', 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="company && balance">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ company.name }}</h2>
            <span class="ws-desc">신청번호 {{ balance.applyNo }} · 가상계좌 {{ mask(balance.vAccount, 'account') }}</span>
          </div>
          <div class="ws-tit__r"><Select v-model="unit" :options="['원', '천원', '백만원']" style="width:100px" /></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col"></th><th scope="col">기업+개인</th><th scope="col">지원기관</th><th scope="col">합계</th></tr></thead>
          <tbody>
            <tr><th scope="row">최초입금</th><td class="ws-num">{{ money(balance.initCoPerson) }}</td><td class="ws-num">{{ money(balance.initOrg) }}</td><td class="ws-num">{{ money(balance.initCoPerson + balance.initOrg) }}</td></tr>
            <tr><th scope="row">출금</th><td class="ws-num">{{ money(balance.withdrawCoPerson) }}</td><td class="ws-num">{{ money(balance.withdrawOrg) }}</td><td class="ws-num">{{ money(balance.withdrawCoPerson + balance.withdrawOrg) }}</td></tr>
            <tr><th scope="row">환불</th><td class="ws-num">{{ money(balance.refundCoPerson) }}</td><td class="ws-num">{{ money(balance.refundOrg) }}</td><td class="ws-num">{{ money(balance.refundCoPerson + balance.refundOrg) }}</td></tr>
            <tr class="is-total"><th scope="row">잔여</th><td class="ws-num">{{ money(balance.remainCoPerson) }}</td><td class="ws-num">{{ money(balance.remainOrg) }}</td><td class="ws-num">{{ money(balance.remainCoPerson + balance.remainOrg) }}</td></tr>
          </tbody>
        </table>
        <p v-if="diff > 0" class="ws-err" role="alert">잔여 금액이 계산값과 {{ won(diff) }} 다릅니다.</p>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">입금 회차</h2></div></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">회차</th><th scope="col">인원</th><th scope="col">입금액(기업+개인)</th><th scope="col">입금액(지원기관)</th><th scope="col">입금기한</th><th scope="col">입금완료일</th></tr></thead>
          <tbody>
            <tr v-for="d in balance.deposits" :key="d.seq">
              <td>{{ d.seq }}회 · {{ d.kind }}</td><td class="ws-num">{{ d.people }}명</td>
              <td class="ws-num">{{ money(d.coPersonAmt) }}</td><td class="ws-num">{{ money(d.orgAmt) }}</td>
              <td>{{ d.dueAt }}</td><td>{{ d.paidAt ?? '미완료' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">청구연월별 출금 · 환불</h2><span class="ws-desc">달 행을 누르면 청구내역서 상세, 환불액을 누르면 환불내역 상세</span></div>
          <div class="ws-tit__r"><SbCan action="download"><Button label="내려받기" severity="secondary" outlined @click="download" /></SbCan></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">청구연월</th><th scope="col">출금(기업+개인)</th><th scope="col">출금(지원기관)</th><th scope="col">환불(기업+개인)</th><th scope="col">환불(지원기관)</th><th scope="col">상태</th></tr></thead>
          <tbody>
            <tr v-for="m in [...balance.monthly].reverse()" :key="m.ym">
              <td><button type="button" class="ws-linklike" @click="goBill(m.ym)">{{ m.ym }}</button></td>
              <td class="ws-num">{{ money(m.withdrawCoPerson) }}</td><td class="ws-num">{{ money(m.withdrawOrg) }}</td>
              <td class="ws-num"><button type="button" class="ws-linklike" @click="goRefund(m.ym)">{{ money(m.refundCoPerson) }}</button></td>
              <td class="ws-num">{{ money(m.refundOrg) }}</td>
              <td><span v-if="!m.billApproved" class="ws-badge ws-badge--warning">잠정</span><span v-else class="ws-badge ws-badge--success">승인</span></td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
    <div v-else class="ws-empty">
      <p>이 기업은 지금 전역 조건에 없습니다.</p>
      <Button label="기업 목록" severity="secondary" outlined @click="router.push(routeOf('SP-STL-030L'))" />
    </div>
  </div>
</template>

<style scoped>
.ws-linklike { padding: 0; border: 0; background: none; color: var(--ws-text-link); cursor: pointer; font: inherit; text-decoration: underline; }
</style>
