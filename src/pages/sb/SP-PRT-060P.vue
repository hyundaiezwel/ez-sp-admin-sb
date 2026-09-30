<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-060P 참여증서발급 — 참여개시 이후 기업에 지원기관 명의 참여증서를 건별 · 일괄 발급한다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsCountTabs, { type CountTab } from '../../ws/WsCountTabs.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { participations, type SbParticipation } from '@fixtures/sb/B3'

const CODE = 'SP-PRT-060P'
const ISSUABLE = ['610', '611', '612', '613', '614', '615', '616', '710', '810', '820', '830']
const won = (n: number) => n.toLocaleString('ko-KR')

const tab = ref('none')
const TABS = [
  { id: 'all', label: '전체', filter: () => true },
  { id: 'none', label: '미발급', filter: (r: SbParticipation) => ISSUABLE.includes(r.sts) && !r.cert.issued },
  { id: 'done', label: '발급완료', filter: (r: SbParticipation) => r.cert.issued },
]

const blank = () => ({ name: '', bizNo: '' })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => participations(ctx.biz))
const codesOf = () => TABS.find((t) => t.id === tab.value)!.filter
const hit = (r: SbParticipation) => codesOf()(r) &&
  (!applied.value.name.trim() || r.name.includes(applied.value.name.trim())) &&
  (!applied.value.bizNo.trim() || r.bizNo.replace(/-/g, '').includes(applied.value.bizNo.replace(/-/g, '').trim()))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => ctx.biz, () => requery())
watch(tab, () => requery())
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); tab.value = 'none'; search() }

const tabs = computed<CountTab[]>(() => TABS.map((t) => ({ id: t.id, label: t.label, count: all.value.filter(t.filter).length })))

const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const selCount = ref(0)
const sel = () => (grid.value?.selectedData() ?? []) as SbParticipation[]
const columns = computed(() => [
  { title: '기업명', field: 'name', minWidth: 150 },
  { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '참여인원(최종)', field: 'participants', width: 100, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().final },
  { title: '참여상태', field: 'sts', width: 130, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
  { title: '발급 여부', field: 'cert', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue().issued ? '<span class="ws-badge ws-badge--success">발급완료</span>' : '<span class="ws-badge ws-badge--mute">미발급</span>') },
  { title: '최근 발급일', field: 'cert', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue().issuedAt ?? '—').slice(0, 10) },
  {
    title: '처리', field: 'id', width: 80, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: (c: any) => {
      const r: SbParticipation = c.getRow().getData()
      const ok = can(CODE, 'create'), tip = denyTip(CODE, 'create')
      return ISSUABLE.includes(r.sts) ? `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>발급</button>` : '<span class="ws-desc">참여개시 후 발급할 수 있습니다</span>'
    },
    cellClick: (_: any, c: any) => { if (can(CODE, 'create')) openPreview([c.getRow().getData()]) },
  },
])

/* --- 미리보기 · 발급(M1) ------------------------------------------------- */
const previewOpen = ref(false)
const previewRows = ref<SbParticipation[]>([])
function openPreview(list: SbParticipation[]) { previewRows.value = list; previewOpen.value = true }
function doIssue() {
  previewRows.value.forEach((r) => { r.cert = { issued: true, no: `CERT-2026-${Math.floor(Math.random() * 90000 + 10000)}`, issuedAt: '2026.09.20 10:00', issuedBy: '김*수', people: r.participants.final, replaced: r.cert.issued } })
  notify(`${previewRows.value.length}건 증서를 발급했습니다.`, 'success')
  previewOpen.value = false
  grid.value?.clearSelection(); reload()
}

/* --- 일괄 발급(M2) ---------------------------------------------------------- */
const bulkOpen = ref(false)
const includeReissue = ref(false)
const bulkElig = computed(() => {
  const s = sel()
  const ok = s.filter((r) => ISSUABLE.includes(r.sts) && (includeReissue.value || !r.cert.issued))
  return { ok, no: s.filter((r) => !ok.includes(r)) }
})
const result = ref<{ open: boolean; ok: number; fails: ResultItem[]; skipped?: number }>({ open: false, ok: 0, fails: [] })
function doBulk() {
  bulkElig.value.ok.forEach((r) => { r.cert = { issued: true, no: `CERT-2026-${Math.floor(Math.random() * 90000 + 10000)}`, issuedAt: '2026.09.20 10:00', issuedBy: '김*수', people: r.participants.final, replaced: r.cert.issued } })
  result.value = { open: true, ok: bulkElig.value.ok.length, skipped: bulkElig.value.no.length, fails: [] }
  bulkOpen.value = false
  grid.value?.clearSelection(); reload()
}
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="ct-name">기업명</label></th>
        <td><InputText id="ct-name" v-model="f.name" fluid placeholder="기업명 일부" /></td>
        <th scope="row"><label for="ct-biz">사업자등록번호</label></th>
        <td><InputText id="ct-biz" v-model="f.bizNo" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <WsCountTabs v-model="tab" :tabs="tabs" label="발급 여부" />
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">참여증서 발급 대상</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">{{ bizLabel(ctx.biz) }} · 선택 {{ selCount }}건</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="bulk"><SbCan action="create"><Button label="일괄 발급" severity="secondary" outlined :disabled="!selCount" @click="bulkOpen = true" /></SbCan></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid ref="grid" :columns="columns" :rows="rows" height="auto" @selection-change="selCount = $event" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>참여개시(610~616) · 이용정지 · 환불 계열만 발급할 수 있다. 참여개시 전 건은 버튼이 꺼진다.</li>
        <li>일괄 발급은 <b>일괄 처리</b> 권한(총괄 이상)이 있어야 켜진다. {{ denyTip(CODE, 'bulk') }}</li>
        <li>PDF 내려받기는 개인정보가 없는 문서라 사유 등록 없이 받는다 — <b>다운로드</b> 권한만 있으면 된다.</li>
      </ul>
    </div>

    <Dialog v-model:visible="previewOpen" modal header="참여증서 미리보기 · 발급" :style="{ width: '460px' }" :draggable="false">
      <div v-if="previewRows[0]" class="ws-form">
        <div class="ws-form__row"><span class="ws-form__l">기업명</span><span>{{ previewRows[0].name }}</span></div>
        <div class="ws-form__row"><span class="ws-form__l">사업자등록번호</span><span>{{ previewRows[0].bizNo }}</span></div>
        <div class="ws-form__row"><span class="ws-form__l">사업</span><span>{{ bizLabel(previewRows[0].biz) }}</span></div>
        <div class="ws-form__row"><span class="ws-form__l">참여인원(최종)</span><span>{{ previewRows[0].participants.final }}명</span></div>
        <p v-if="previewRows[0].cert.issued" class="ws-desc">재발급 — 이전 증서({{ previewRows[0].cert.no }})는 '대체됨'으로 남습니다.</p>
      </div>
      <template #footer>
        <SbCode code="SP-PRT-060P-M1" />
        <Button label="취소" severity="secondary" outlined @click="previewOpen = false" />
        <Button label="발급" @click="doIssue" />
      </template>
    </Dialog>

    <WsActionDialog
      v-model:visible="bulkOpen" code="SP-PRT-060P-M2" header="일괄 발급"
      :target="`선택 ${selCount}건 — 발급 가능 ${bulkElig.ok.length}건 · 불가 ${bulkElig.no.length}건`"
      confirm-label="발급" @confirm="doBulk"
    >
      <label style="display: flex; gap: 6px; align-items: center"><input type="checkbox" v-model="includeReissue" /> 이미 발급된 건도 포함(재발급)</label>
    </WsActionDialog>
    <WsResultDialog v-model:visible="result.open" header="일괄 발급 결과" :ok="result.ok" :fails="result.fails" :skipped="result.skipped" />
  </div>
</template>
