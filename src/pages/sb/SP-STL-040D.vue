<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-040D 환불내역 상세 — 한 기업의 한 환불 차수에 들어간 노동자별 환불 건.
 * 금전 처리 권한(총괄 이상)이 계좌 · 수단을 고치고(M1 · M2) 환불실패 건을 재처리한다(bulk 가능).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { refundRoundOf, type RefundItem } from '@fixtures/sb/B5'

const route = useRoute()
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const companyId = ref(''); const ym = ref(''); const round = ref(1)
watch(() => [route.query.companyId, route.query.ym, route.query.round], ([c, y, r]) => {
  companyId.value = String(c ?? ''); ym.value = String(y ?? ''); round.value = Number(r ?? 1)
}, { immediate: true })
const company = computed(() => COMPANIES.find((c) => c.id === companyId.value) ?? null)
const roundData = computed(() => refundRoundOf(companyId.value, ym.value, round.value))
const totals = computed(() => (roundData.value ? roundData.value.items.reduce((s, i) => ({
  req: s.req + i.amtPerson + i.amtCompany, org: s.org + i.orgRecall,
  done: s.done + (i.status === '환불완료' ? i.amtPerson + i.amtCompany : 0),
  fail: s.fail + (i.status === '환불실패' ? i.amtPerson + i.amtCompany : 0),
}), { req: 0, org: 0, done: 0, fail: 0 }) : { req: 0, org: 0, done: 0, fail: 0 }))

/* --- 계좌 변경(M1) --------------------------------------------------------- */
const acctOpen = ref(false)
const acctTarget = ref<RefundItem | null>(null)
const acctBank = ref(''); const acctHolder = ref(''); const acctNo = ref(''); const acctVerified = ref(false)
function openAcct(i: RefundItem) { acctTarget.value = i; acctBank.value = ''; acctHolder.value = ''; acctNo.value = ''; acctVerified.value = false; acctOpen.value = true }
function verifyAcct() { if (!acctBank.value || !acctHolder.value || !acctNo.value) return notify('은행 · 예금주 · 계좌번호를 모두 입력하세요.', 'danger'); acctVerified.value = true; notify('계좌 인증에 성공했습니다(미리보기).', 'success') }
function doAcct(p: ActionPayload) {
  if (acctHolder.value.length > 8) return notify('예금주는 8자를 넘을 수 없습니다.', 'danger')
  if (!/^\d{1,20}$/.test(acctNo.value)) return notify('계좌번호는 숫자만 입력하세요.', 'danger')
  if (!acctVerified.value) return notify('계좌 인증을 통과해야 저장할 수 있습니다.', 'danger')
  const i = acctTarget.value!
  i.history.unshift({ at: '2026.09.30 15:00', by: '박*현(지원총괄)', before: '(가림)', after: '(가림)', reason: p.text })
  i.changed = true
  notify('환불계좌를 저장했습니다.', 'success')
}

/* --- 수단 변경(M2) --------------------------------------------------------- */
const methodOpen = ref(false)
const methodTarget = ref<RefundItem | null>(null)
function openMethod(i: RefundItem) { methodTarget.value = i; methodOpen.value = true }
function doMethod(p: ActionPayload) {
  const i = methodTarget.value!
  if (p.option === '기업' && !i.canSwitchToCompany) return notify('개인에서 기업으로 환불대상 변경 불가건이 포함되어 있습니다.', 'danger')
  const before = i.method
  i.method = p.option as RefundItem['method']
  i.history.unshift({ at: '2026.09.30 15:00', by: '박*현(지원총괄)', before, after: i.method, reason: p.text })
  i.changed = true
  notify('환불수단을 저장했습니다.', 'success')
}

/* --- 재처리(단건 · 일괄) ---------------------------------------------------- */
const selected = ref<Set<string>>(new Set())
function toggle(id: string) { selected.value.has(id) ? selected.value.delete(id) : selected.value.add(id); selected.value = new Set(selected.value) }
const reprocessOpen = ref(false)
const reprocessIds = ref<string[]>([])
function openReprocess(ids: string[]) { reprocessIds.value = ids; reprocessOpen.value = true }
function doReprocess(p: ActionPayload) {
  const items = roundData.value!.items.filter((i) => reprocessIds.value.includes(i.id))
  items.forEach((i) => { i.status = '환불대상'; i.history.unshift({ at: '2026.09.30 15:00', by: '박*현(지원총괄)', before: '환불실패', after: '환불대상', reason: p.text }) })
  selected.value = new Set()
  notify(`${items.length}건을 다음 차수 환불대상으로 올렸습니다.`, 'success')
}

function statusTone(s: RefundItem['status']) { return s === '환불완료' ? 'success' : s === '환불실패' ? 'danger' : s === '환불요청' ? 'warning' : 'info' }
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="company && roundData">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ company.name }} ({{ company.bizNo }})</h2>
            <span class="ws-desc">{{ roundData.ym }} {{ roundData.round }}차 · 기업계좌 {{ mask(roundData.acctNo, 'account') }}</span>
          </div>
          <div class="ws-tit__r">
            <SbCan action="money"><SbCan action="bulk"><Button v-if="selected.size" :label="`선택 ${selected.size}건 재처리`" severity="secondary" outlined @click="openReprocess([...selected])" /></SbCan></SbCan>
          </div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">환불청구</th><th scope="col">지원기관 회수</th><th scope="col">환불완료</th><th scope="col">환불실패</th></tr></thead>
          <tbody><tr><td class="ws-num">{{ won(totals.req) }}</td><td class="ws-num">{{ won(totals.org) }}</td><td class="ws-num">{{ won(totals.done) }}</td><td class="ws-num">{{ won(totals.fail) }}</td></tr></tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">노동자별 환불</h2><span class="ws-total">총<strong>{{ roundData.items.length }}</strong>건</span></div>
          <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="roundData.items.length" :limit="50000" label="노동자별 내려받기" modal-code="SP-STL-040D-M3" /></SbCan></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col"></th><th scope="col">이름</th><th scope="col">ID</th><th scope="col">이용정지일</th><th scope="col">환불수단</th><th scope="col">환불액(개인+기업)</th><th scope="col">지원기관 회수</th><th scope="col">상태</th><th scope="col">변경</th><th scope="col">처리</th></tr></thead>
          <tbody>
            <tr v-for="i in roundData.items" :key="i.id">
              <td><input v-if="i.status === '환불실패'" type="checkbox" :checked="selected.has(i.id)" aria-label="선택" @change="toggle(i.id)" /></td>
              <td>{{ mask(i.name, 'name') }}</td><td>{{ mask(i.workerId, 'id') }}</td><td>{{ i.suspendAt }}</td>
              <td>{{ i.method }}</td>
              <td class="ws-num">{{ won(i.amtPerson + i.amtCompany) }}</td>
              <td class="ws-num">{{ won(i.orgRecall) }}</td>
              <td><span :class="`ws-badge ws-badge--${statusTone(i.status)}`">{{ i.status }}</span></td>
              <td>{{ i.changed ? '변경' : '—' }}</td>
              <td>
                <SbCan action="money">
                  <Button v-if="i.status !== '환불완료'" label="계좌 변경" size="small" severity="secondary" text @click="openAcct(i)" />
                  <Button v-if="i.status !== '환불완료'" label="수단 변경" size="small" severity="secondary" text @click="openMethod(i)" />
                  <Button v-if="i.status === '환불실패'" label="재처리" size="small" severity="secondary" text @click="openReprocess([i.id])" />
                </SbCan>
                <span v-if="i.status === '환불완료'" class="ws-desc">환불완료 건은 바꿀 수 없습니다.</span>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="ws-gtb" style="margin-top:12px">
          <caption class="ws-desc" style="caption-side:top; text-align:left; padding-bottom:6px">변경 · 처리 이력</caption>
          <thead><tr><th scope="col">이름</th><th scope="col">처리일시</th><th scope="col">처리자</th><th scope="col">변경 전</th><th scope="col">변경 후</th><th scope="col">사유</th></tr></thead>
          <tbody>
            <template v-for="i in roundData.items" :key="'h' + i.id">
              <tr v-for="(h, idx) in i.history" :key="idx"><td>{{ mask(i.name, 'name') }}</td><td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.before }}</td><td>{{ h.after }}</td><td>{{ h.reason }}</td></tr>
            </template>
          </tbody>
        </table>
      </section>
    </template>
    <div v-else class="ws-empty">
      <p>환불 차수를 찾을 수 없습니다.</p>
      <Button label="환불내역 목록으로" severity="secondary" outlined @click="router.push(routeOf('SP-STL-040L'))" />
    </div>

    <WsActionDialog v-model:visible="acctOpen" code="SP-STL-040D-M1" header="환불계좌 변경" :target="acctTarget ? mask(acctTarget.name, 'name') : ''" :reason="{ label: '변경 사유', required: true, min: 2, max: 200 }" confirm-label="저장" @confirm="doAcct">
      <div class="ws-form">
        <div class="ws-form__row"><span class="ws-form__l">은행</span><Select v-model="acctBank" :options="['국민', '신한', '우리', '하나', '농협']" fluid /></div>
        <div class="ws-form__row"><span class="ws-form__l">예금주(최대 8자)</span><InputText v-model="acctHolder" maxlength="8" fluid /></div>
        <div class="ws-form__row"><span class="ws-form__l">계좌번호(숫자만)</span><InputText v-model="acctNo" maxlength="20" fluid /></div>
      </div>
      <Button label="계좌 인증" size="small" severity="secondary" outlined style="margin-top:8px" @click="verifyAcct" />
      <span v-if="acctVerified" class="ws-badge ws-badge--success" style="margin-left:8px">인증 완료</span>
    </WsActionDialog>

    <WsActionDialog v-model:visible="methodOpen" code="SP-STL-040D-M2" header="환불수단 변경" :target="methodTarget ? mask(methodTarget.name, 'name') : ''" :reason="{ label: '환불수단', options: ['기업', '개인', '기업+개인'] }" notice="메모(최대 200자)와 근거 문서 첨부가 필요합니다(미리보기 생략)." confirm-label="저장" @confirm="doMethod" />

    <WsActionDialog v-model:visible="reprocessOpen" header="환불실패 재처리" :target="`선택 ${reprocessIds.length}건`" warn="계좌를 바꾸지 않았으면 실패가 반복될 수 있습니다." :reason="{ label: '처리 사유', required: true, min: 2, max: 200 }" confirm-label="재처리" @confirm="doReprocess" />
  </div>
</template>
