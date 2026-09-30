<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-010D 전자청구서 상세 — 청구문서(공문) · 항목내역 · 상세내역 · 사용자별내역 네 탭.
 * 상세내역 · 사용자별내역은 노동자 단위라 쪽 단위로 나누고 이름을 가린다(D-38 교훈).
 * 승인 권한이 있으면 여기서도 청구 승인 · 반려(M1)를 한다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsPager from '../../ws/WsPager.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { billOf, billItems, billDetail, billUserSummary } from '@fixtures/sb/B5'

const CODE = 'SP-STL-010D'
const route = useRoute()
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const tab = ref('doc')

const ym = ref('')
watch(() => route.query.ym, (v) => { ym.value = String(v ?? '') }, { immediate: true })
const bill = computed(() => billOf(ym.value))
const items = computed(() => (ym.value ? billItems(ym.value) : []))
const itemTarget = computed(() => items.value.reduce((s, i) => s + i.target, 0))
const mismatch = computed(() => (bill.value ? Math.abs(itemTarget.value - bill.value.total) : 0))

const detail = computed(() => (ym.value ? billDetail(ym.value) : []))
const dFirst = ref(0); const dSize = ref(50)
const detailPage = computed(() => detail.value.slice(dFirst.value, dFirst.value + dSize.value))

const userSum = computed(() => (ym.value ? billUserSummary(ym.value) : []))
const uFirst = ref(0); const uSize = ref(50)
const userPage = computed(() => userSum.value.slice(uFirst.value, uFirst.value + uSize.value))

function downloadPlain(label: string) {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  notify(`${label}을 내려받았습니다(미리보기).`, 'success')
}

/* --- 승인 · 반려(M1) ------------------------------------------------------ */
const approveOpen = ref(false)
function doApprove(p: ActionPayload) {
  const b = bill.value!
  if (b.status === '승인') return notify('이미 승인된 청구서입니다.', 'danger')
  if (p.option === '반려' && p.text.trim().length < 10) return notify('반려 사유를 10자 이상 입력하세요.', 'danger')
  if (p.option === '반려') { b.status = '반려'; b.rejectReason = p.text.trim(); notify('반려했습니다.', 'success') }
  else { b.status = '승인'; b.approver = '박*현(지원총괄)'; b.approvedAt = '2026.09.30 15:00'; notify('승인했습니다.', 'success') }
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="bill">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ bill.ym }} 전자청구서</h2>
            <span :class="`ws-badge ${bill.status === '승인' ? 'ws-badge--success' : bill.status === '반려' ? 'ws-badge--danger' : 'ws-badge--warning'}`">{{ bill.status }}</span>
            <span class="ws-desc">{{ bill.target }} · 문서번호 {{ bill.docNo }}</span>
          </div>
          <div class="ws-tit__r">
            <SbCan action="approve"><Button v-if="bill.status === '발행(미승인)'" label="승인 · 반려" severity="contrast" @click="approveOpen = true" /></SbCan>
          </div>
        </div>
        <p v-if="bill.status === '반려'" class="ws-desc">반려 사유 — {{ bill.rejectReason }}</p>
        <p v-if="mismatch > 0" class="ws-err" role="alert">탭 합계가 {{ won(mismatch) }} 다릅니다 — 승인 전에 확인하세요.</p>
      </section>

      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="doc">청구문서</Tab>
          <Tab value="item">항목내역</Tab>
          <Tab value="detail">상세내역</Tab>
          <Tab value="user">사용자별내역</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="doc">
            <table class="ws-gtb">
              <thead><tr><th scope="col">구분</th><th scope="col">온라인</th><th scope="col">오프라인</th><th scope="col">합계</th></tr></thead>
              <tbody><tr><th scope="row">사용 포인트</th><td class="ws-num">{{ won(bill.online) }}</td><td class="ws-num">{{ won(bill.offline) }}</td><td class="ws-num">{{ won(bill.total) }}</td></tr></tbody>
            </table>
            <div style="margin-top:8px; text-align:right"><SbCan action="download"><Button label="공문 내려받기" severity="secondary" outlined size="small" @click="downloadPlain('청구문서(공문)')" /></SbCan></div>
          </TabPanel>

          <TabPanel value="item">
            <table class="ws-gtb">
              <thead><tr><th scope="col">콘텐츠분류</th><th scope="col">월 사용포인트</th><th scope="col">청구제외 포인트</th><th scope="col">청구대상 포인트</th></tr></thead>
              <tbody>
                <tr v-for="i in items" :key="i.category"><th scope="row">{{ i.category }}</th><td class="ws-num">{{ won(i.monthUsed) }}</td><td class="ws-num">{{ won(i.excluded) }}</td><td class="ws-num">{{ won(i.target) }}</td></tr>
                <tr class="is-total"><th scope="row">합계</th><td class="ws-num">{{ won(items.reduce((s,i)=>s+i.monthUsed,0)) }}</td><td class="ws-num">{{ won(items.reduce((s,i)=>s+i.excluded,0)) }}</td><td class="ws-num">{{ won(itemTarget) }}</td></tr>
              </tbody>
            </table>
            <div style="margin-top:8px; text-align:right"><SbCan action="download"><Button label="항목내역 내려받기" severity="secondary" outlined size="small" @click="downloadPlain('항목내역')" /></SbCan></div>
          </TabPanel>

          <TabPanel value="detail">
            <div class="ws-tit"><div class="ws-tit__l"><span class="ws-total">총<strong>{{ detail.length }}</strong>건</span></div><div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="detail.length" :limit="50000" label="상세내역 내려받기" modal-code="SP-STL-010D-M2" /></SbCan></div></div>
            <table class="ws-gtb">
              <thead><tr><th scope="col">고유번호</th><th scope="col">이름</th><th scope="col">기업명</th><th scope="col">직급</th><th scope="col">적용일자</th><th scope="col">내역</th><th scope="col">거래구분</th><th scope="col">노동자</th><th scope="col">기업</th></tr></thead>
              <tbody>
                <tr v-for="d in detailPage" :key="d.id">
                  <td>{{ d.id }}</td><td>{{ mask(d.name, 'name') }}</td><td>{{ d.company }}</td><td>{{ d.rank }}</td><td>{{ d.appliedAt }}</td><td>{{ d.desc }}</td>
                  <td><span :class="d.kind === '취소' ? 'ws-badge ws-badge--danger' : 'ws-badge ws-badge--success'">{{ d.kind }}</span></td>
                  <td class="ws-num">{{ won(d.workerAmt) }}</td><td class="ws-num">{{ won(d.coAmt) }}</td>
                </tr>
                <tr v-if="!detailPage.length"><td colspan="9" class="ws-desc" style="text-align:center">상세내역이 없습니다.</td></tr>
              </tbody>
            </table>
            <WsPager v-model:first="dFirst" v-model:rows="dSize" :total="detail.length" :sizes="[50, 100]" />
          </TabPanel>

          <TabPanel value="user">
            <div class="ws-tit"><div class="ws-tit__l"><span class="ws-total">총<strong>{{ userSum.length }}</strong>건</span></div><div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="userSum.length" :limit="50000" label="사용자별내역 내려받기" modal-code="SP-STL-010D-M2" /></SbCan></div></div>
            <table class="ws-gtb">
              <thead><tr><th scope="col">이름</th><th scope="col">기업명</th><th scope="col">건수</th><th scope="col">청구 합계</th></tr></thead>
              <tbody>
                <tr v-for="u in userPage" :key="u.workerId"><td>{{ mask(u.name, 'name') }}</td><td>{{ u.company }}</td><td class="ws-num">{{ u.count }}</td><td class="ws-num">{{ won(u.amount) }}</td></tr>
                <tr v-if="!userPage.length"><td colspan="4" class="ws-desc" style="text-align:center">사용자별내역이 없습니다.</td></tr>
              </tbody>
            </table>
            <WsPager v-model:first="uFirst" v-model:rows="uSize" :total="userSum.length" :sizes="[50, 100]" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
    <div v-else class="ws-empty">
      <p>청구서를 찾을 수 없습니다.</p>
      <Button label="전자청구서 목록으로" severity="secondary" outlined @click="router.push(routeOf('SP-STL-010L'))" />
    </div>

    <WsActionDialog
      v-model:visible="approveOpen" code="SP-STL-010D-M1" header="청구 승인 · 반려"
      :target="bill ? `${bill.ym} ${bill.target} — 기업+개인 ${won(bill.coPersonAmt)} · 지원기관 ${won(bill.orgAmt)}` : ''"
      :warn="mismatch > 0 ? `탭 합계가 ${won(mismatch)} 다릅니다 — 경고를 확인했습니다 체크 후 확정하세요.` : undefined"
      :reason="{ label: '처리', options: ['승인', '반려'], other: '반려', min: 10, max: 200, placeholder: '반려 사유 10자 이상' }"
      confirm-label="확정" @confirm="doApprove"
    />
  </div>
</template>
