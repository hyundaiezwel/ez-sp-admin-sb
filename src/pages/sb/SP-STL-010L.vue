<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-STL-010L 전자청구서 목록 — 월별 전자청구서를 청구연도 · 승인 여부로 조회하고
 * 지원기관 총괄 이상이 승인 · 반려(M1)한다. 여러 건을 한 번에 승인(M2)할 수 있다.
 * 청구 공문에는 개인정보가 없어 다운로드는 사유 입력 없이 내려받는다(ponytail: WsDownload는
 * 언제나 사유 모달을 여는 공용 컴포넌트라, 사유 없는 다운로드는 이 화면에서 직접 버튼으로 구현했다 —
 * 공용 컴포넌트에 pii=false 같은 모드가 생기면 옮긴다).
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import { notify } from '../../ws/notify'
import { YEARS } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BILLS, type BillDoc } from '@fixtures/sb/B5'

const CODE = 'SP-STL-010L'
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const f = ref({ year: 2026, approved: '' })
const applied = ref({ ...f.value })
function search() { applied.value = { ...f.value } }
function reset() { f.value = { year: 2026, approved: '' } }
const rows = computed(() => BILLS.filter((b) =>
  (!applied.value.approved || (applied.value.approved === 'Y' ? b.status === '승인' : b.status !== '승인')),
))

const downloadRow = (b: BillDoc) => {
  if (!can(CODE, 'download')) return notify(denyTip(CODE, 'download'), 'danger')
  notify(`${b.ym} 청구서 공문을 내려받았습니다(미리보기).`, 'success')
}
const cellBtn = (label: string, ok: boolean, tip: string) =>
  `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}" aria-label="${label} — ${tip}"`}>${label}</button>`
const columns = computed(() => {
  const okApprove = can(CODE, 'approve'), tipApprove = denyTip(CODE, 'approve')
  const okDl = can(CODE, 'download'), tipDl = denyTip(CODE, 'download')
  return [
    { title: '청구년월', field: 'ym', width: 96, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '청구대상', field: 'target', minWidth: 100 },
    { title: '청구서명', field: 'docNo', minWidth: 120 },
    { title: '청구 금액(기업+개인)', field: 'coPersonAmt', width: 140, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
    { title: '청구 금액(지원기관)', field: 'orgAmt', width: 130, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
    { title: '승인 상태', field: 'status', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ${c.getValue() === '승인' ? 'ws-badge--success' : c.getValue() === '반려' ? 'ws-badge--danger' : 'ws-badge--warning'}">${c.getValue()}</span>` },
    { title: '발행일시', field: 'issuedAt', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '승인자 · 승인일시', field: 'approver', width: 160, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const d = c.getRow().getData(); return d.approver ? `${d.approver}<br>${d.approvedAt}` : '—' } },
    { title: '승인', field: 'no', width: 80, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => (c.getRow().getData().status === '발행(미승인)' ? cellBtn('승인', okApprove, tipApprove) : '<span class="ws-desc">—</span>'), cellClick: (_: any, c: any) => { if (okApprove && c.getRow().getData().status === '발행(미승인)') openApprove(c.getRow().getData()) } },
    { title: '다운로드', field: 'docNo', width: 90, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: () => cellBtn('다운로드', okDl, tipDl), cellClick: (_: any, c: any) => downloadRow(c.getRow().getData()) },
  ]
})
const openDetail = (r: BillDoc) => router.push({ path: routeOf('SP-STL-010D'), query: { ym: r.ym } })

/* --- 승인 · 반려(M1) ----------------------------------------------------- */
const approveOpen = ref(false)
const current = ref<BillDoc | null>(null)
function openApprove(b: BillDoc) { current.value = b; approveOpen.value = true }
function doApprove(p: ActionPayload) {
  const b = current.value!
  if (b.status === '승인') return notify('이미 승인된 청구서입니다.', 'danger')
  if (p.option === '반려' && p.text.trim().length < 10) return notify('반려 사유를 10자 이상 입력하세요.', 'danger')
  if (p.option === '반려') { b.status = '반려'; b.rejectReason = p.text.trim(); notify('반려했습니다 — 운영사 담당자에게 안내가 발송됩니다.', 'success') }
  else { b.status = '승인'; b.approver = '박*현(지원총괄)'; b.approvedAt = '2026.09.30 15:00'; notify('승인했습니다 — 복지몰 회신을 받아 확정했습니다.', 'success') }
}

/* --- 일괄 승인(M2) --------------------------------------------------------- */
const gridRef = ref<InstanceType<typeof TabGrid> | null>(null)
const selCount = ref(0)
const bulkResultOpen = ref(false)
const bulkOk = ref(0)
const bulkFails = ref<ResultItem[]>([])
function bulkApprove() {
  const picked = (gridRef.value?.selectedData() ?? []) as BillDoc[]
  const target = picked.filter((b) => b.status === '발행(미승인)')
  if (!target.length) return notify('미승인 청구서를 골라 주세요.', 'danger')
  let ok = 0
  const fails: ResultItem[] = []
  target.forEach((b, i) => {
    if (i === target.length - 1 && target.length > 1) { fails.push({ target: `${b.ym} ${b.target}`, reason: '복지몰 회신 실패', kind: 'process' }); return }
    b.status = '승인'; b.approver = '박*현(지원총괄)'; b.approvedAt = '2026.09.30 15:10'; ok++
  })
  bulkOk.value = ok; bulkFails.value = fails; bulkResultOpen.value = true
  gridRef.value?.clearSelection()
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '112px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="b-year">청구연도</label></th>
        <td><Select v-model="f.year" input-id="b-year" :options="YEARS" fluid /></td>
        <th scope="row"><label for="b-appr">승인 여부</label></th>
        <td><Select v-model="f.approved" input-id="b-appr" :options="[{ l: '전체', v: '' }, { l: '승인', v: 'Y' }, { l: '미승인', v: 'N' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">전자청구서 목록</h2><span class="ws-total">총<strong>{{ rows.length }}</strong>건</span><span class="ws-desc">행을 누르면 전자청구서 상세 · 선택 {{ selCount }}건</span></div>
        <div class="ws-tit__r"><SbCan action="approve"><SbCan action="bulk"><Button label="일괄 승인" severity="contrast" @click="bulkApprove" /></SbCan></SbCan></div>
      </div>
      <TabGrid ref="gridRef" :columns="columns" :rows="rows" height="auto" @row-click="openDetail" @selection-change="(n: number) => (selCount = n)" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>승인된 청구서는 되돌리지 않는다. 청구월이 끝나지 않았으면 승인 칸이 꺼진다.</li>
        <li>담당자 이하는 승인할 수 없다 — 조회 · 공문 다운로드는 된다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="approveOpen" code="SP-STL-010L-M1" header="청구 승인 · 반려"
      :target="current ? `${current.ym} ${current.target} — 기업+개인 ${won(current.coPersonAmt)} · 지원기관 ${won(current.orgAmt)}` : ''"
      :reason="{ label: '처리', options: ['승인', '반려'], other: '반려', min: 10, max: 200, placeholder: '반려 사유 10자 이상' }"
      notice="승인 · 반려 결과가 운영사 담당자에게 시스템 알림으로 갑니다." warn="승인은 되돌릴 수 없습니다." confirm-label="확정" @confirm="doApprove"
    />
    <WsResultDialog v-model:visible="bulkResultOpen" header="일괄 승인 결과" :ok="bulkOk" :fails="bulkFails" />
    <SbCode code="SP-STL-010L-M2" style="display: none" />
  </div>
</template>
