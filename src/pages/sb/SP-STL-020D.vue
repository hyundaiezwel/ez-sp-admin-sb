<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-020D 청구내역서 상세 — 한 기업의 청구연월 기준 노동자별 월 사용 내역(재원별)을
 * 보여 준다. 노동자 합계가 목록의 기업 청구 금액과 맞는지 확인한다. 기업 합계는 사유 없이,
 * 노동자 단위 내역은 사유 등록(M1) 후 내려받는다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import PageHead from '../../app/PageHead.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsPager from '../../ws/WsPager.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { companyBillsOf, billDetail } from '@fixtures/sb/B5'

const CODE = 'SP-STL-020D'
const route = useRoute()
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const companyId = ref('')
const ym = ref('2026.08')
watch(() => [route.query.companyId, route.query.ym], ([c, y]) => { companyId.value = String(c ?? ''); ym.value = String(y ?? ym.value) }, { immediate: true })
const company = computed(() => COMPANIES.find((c) => c.id === companyId.value) ?? null)
const bill = computed(() => companyBillsOf(companyId.value).find((b) => b.ym === ym.value) ?? null)

const workerRows = computed(() => {
  if (!company.value) return []
  return billDetail(ym.value).filter((r) => r.company === company.value!.name)
})
const first = ref(0); const size = ref(50)
const page = computed(() => workerRows.value.slice(first.value, first.value + size.value))
const workerTotal = computed(() => workerRows.value.reduce((s, r) => s + r.workerAmt + r.coAmt, 0))
const diff = computed(() => (bill.value ? Math.abs(workerTotal.value - bill.value.coPersonAmt) : 0))

function changeYm(v: string) { ym.value = v }

function downloadCompany() {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  notify('기업 합계 파일을 내려받았습니다(미리보기).', 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="company">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ company.name }} ({{ company.bizNo }})</h2>
            <span class="ws-desc">가상계좌 {{ mask('123-45-' + companyId.slice(-6), 'account') }}</span>
          </div>
          <div class="ws-tit__r">
            <label for="ym-pick" class="ws-desc">청구연월</label>
            <InputText id="ym-pick" :model-value="ym" style="width:100px" @update:model-value="(v: any) => changeYm(String(v))" />
          </div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">청구(기업+개인)</th><th scope="col">청구(지원기관)</th></tr></thead>
          <tbody><tr><td class="ws-num">{{ won(bill?.coPersonAmt ?? 0) }}</td><td class="ws-num">{{ won(bill?.orgAmt ?? 0) }}</td></tr></tbody>
        </table>
        <p v-if="diff > 0" class="ws-err" role="alert">노동자 합계가 청구 금액과 {{ won(diff) }} 다릅니다.</p>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">노동자별 월 사용 내역</h2><span class="ws-total">총<strong>{{ workerRows.length }}</strong>건</span></div>
          <div class="ws-tit__r">
            <SbCan action="download"><Button label="기업 합계 내려받기" severity="secondary" outlined @click="downloadCompany" /></SbCan>
            <SbCan action="download-pii"><WsDownload :total="workerRows.length" :limit="50000" label="노동자별 내려받기" modal-code="SP-STL-020D-M1" /></SbCan>
          </div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">이름</th><th scope="col">적용일자</th><th scope="col">거래구분</th><th scope="col">노동자</th><th scope="col">기업</th></tr></thead>
          <tbody>
            <tr v-for="r in page" :key="r.id">
              <td>{{ mask(r.name, 'name') }}</td><td>{{ r.appliedAt }}</td>
              <td><span :class="r.kind === '취소' ? 'ws-badge ws-badge--danger' : 'ws-badge ws-badge--success'">{{ r.kind }}</span></td>
              <td class="ws-num">{{ won(r.workerAmt) }}</td><td class="ws-num">{{ won(r.coAmt) }}</td>
            </tr>
            <tr v-if="!page.length"><td colspan="5" class="ws-desc" style="text-align:center">사용 내역이 없습니다.</td></tr>
          </tbody>
        </table>
        <WsPager v-model:first="first" v-model:rows="size" :total="workerRows.length" :sizes="[50, 100]" />
      </section>
    </template>
    <div v-else class="ws-empty">
      <p>이 기업은 지금 전역 조건에 없습니다.</p>
      <Button label="청구내역서 목록으로" severity="secondary" outlined @click="router.push(routeOf('SP-STL-020L'))" />
    </div>
  </div>
</template>
