<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-050L 가상계좌목록 — 전체 참여 기업의 가상계좌와 분담금 입금 상태를 조회한다.
 * AS-IS 입금확인 화면이 TO-BE에서 빠져, 입금확인 · 취소와 가상계좌 발급을 이 목록이 받는다(추정).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { participations, type SbParticipation } from '@fixtures/sb/B3'

const CODE = 'SP-PRT-050L'
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const DEP_STATES = [
  { v: '', l: '전체' }, { v: 'none', l: '미발급' }, { v: 'ing', l: '입금중' }, { v: 'part', l: '부분입금' }, { v: 'done', l: '입금완료' },
]
function depState(r: SbParticipation): string {
  if (!r.vAccount.no) return 'none'
  if (r.vAccount.paid <= 0) return 'ing'
  if (r.vAccount.paid < r.vAccount.target) return 'part'
  return 'done'
}

const blank = () => ({ range: presetRange(PRESETS[4]) as Range, name: '', bizNo: '', vacct: '', dep: '', dueOnly: false })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => participations(ctx.biz))
const day = (s: string) => { const [y, m, d] = s.split('.').map(Number); return new Date(y, m - 1, d) }
const hit = (r: SbParticipation) => {
  const a = applied.value
  const at = r.regApprovedAt ? day(r.regApprovedAt.slice(0, 10)) : null
  return (!a.name.trim() || r.name.includes(a.name.trim())) &&
    (!a.bizNo.trim() || r.bizNo.replace(/-/g, '').includes(a.bizNo.replace(/-/g, '').trim())) &&
    (!a.vacct.trim() || (r.vAccount.no ?? '').includes(a.vacct.trim())) &&
    (!a.dep || depState(r) === a.dep) && (!a.dueOnly || r.vAccount.dueUnpaid) &&
    (!a.range[0] || !at || at >= a.range[0]) && (!a.range[1] || !at || at <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => ctx.biz, () => requery())
function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요 — 최대 4년까지 조회할 수 있습니다.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

const columns = computed(() => [
  { title: '기업명', field: 'name', minWidth: 150 },
  { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '가상계좌번호', field: 'vAccount', width: 160, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue().no ?? '미발급' },
  { title: '발급일', field: 'vAccount', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue().issuedAt ?? '—').slice(0, 10) },
  { title: '납부대상', field: 'vAccount', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => won(c.getValue().target) },
  { title: '입금액', field: 'vAccount', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => won(c.getValue().paid) },
  { title: '미납액', field: 'vAccount', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const v = c.getValue(); return v.target > v.paid ? `<span style="color:var(--ws-text-danger)">${won(v.target - v.paid)}</span>` : '완납' } },
  { title: '입금기한', field: 'depositDeadline', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() ?? '—' },
  { title: '등록승인일', field: 'regApprovedAt', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ?? '—').slice(0, 10) },
  { title: '입금 상태', field: 'id', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const s = depState(c.getRow().getData()); return DEP_STATES.find((x) => x.v === s)?.l ?? s } },
  {
    title: '처리', field: 'id', width: 130, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: (c: any) => {
      const r: SbParticipation = c.getRow().getData()
      const ok = can(CODE, 'money'), tip = denyTip(CODE, 'money')
      if (!r.vAccount.no) return `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>계좌발급</button>`
      if (r.vAccount.paid < r.vAccount.target) return `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>입금확인</button>`
      return `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>확인취소</button>`
    },
    cellClick: (_: any, c: any) => { const ok = can(CODE, 'money'); if (ok) openAction(c.getRow().getData()) },
  },
])
const openDetail = (r: SbParticipation) => {
  // 가상계좌 상세(M1)를 목업에서는 기업상세로 바로 연다
  router.push({ path: routeOf('SP-PRT-020D'), query: { id: r.id } })
}

/* --- 가상계좌 발급(M3) / 입금확인·취소(M2) ------------------------------------- */
const issueOpen = ref(false)
const confirmOpen = ref(false)
const current = ref<SbParticipation | null>(null)
function openAction(r: SbParticipation) {
  current.value = r
  if (!r.vAccount.no) issueOpen.value = true
  else confirmOpen.value = true
}
function doIssue() {
  const r = current.value!
  if (r.vAccount.no) return notify('이미 발급된 가상계좌가 있습니다 — ' + r.vAccount.no, 'warning')
  r.vAccount = { no: `822-8888-${Math.floor(Math.random() * 9000 + 1000)}`, issuedAt: '2026.09.20 09:00', target: r.participants.final * 200_000, paid: 0, dueUnpaid: false, rows: [] }
  notify('가상계좌를 발급했습니다.', 'success')
}
const isCancelConfirm = computed(() => !!current.value && current.value.vAccount.paid >= current.value.vAccount.target)
function doConfirm(p: ActionPayload) {
  const r = current.value!
  if (!p.text.trim()) return notify('사유를 입력하세요.', 'danger')
  if (isCancelConfirm.value) {
    r.vAccount.paid = 0
    r.vAccount.rows.unshift({ seq: r.vAccount.rows.length + 1, amount: 0, at: '2026.09.20 09:30', by: '(취소)', note: p.text })
    notify('입금확인을 취소했습니다.', 'success')
  } else {
    const amount = r.vAccount.target - r.vAccount.paid
    r.vAccount.rows.unshift({ seq: r.vAccount.rows.length + 1, amount, at: '2026.09.20 09:30', by: '(수동확인)', note: p.text })
    r.vAccount.paid = r.vAccount.target
    notify('입금완료로 처리했습니다.', 'success')
  }
}
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="v-from">등록승인일</label></th>
        <td colspan="3"><WsPeriod id="v-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="v-name">기업명</label></th>
        <td><InputText id="v-name" v-model="f.name" fluid placeholder="기업명 일부" /></td>
        <th scope="row"><label for="v-biz">사업자등록번호</label></th>
        <td><InputText id="v-biz" v-model="f.bizNo" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="v-vacct">가상계좌번호</label></th>
        <td><InputText id="v-vacct" v-model="f.vacct" fluid /></td>
        <th scope="row"><label for="v-dep">입금 상태</label></th>
        <td><Select v-model="f.dep" input-id="v-dep" :options="DEP_STATES" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">가상계좌 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">{{ bizLabel(ctx.biz) }} · 등록승인일 최신순 · 행을 누르면 기업상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="20000" modal-code="SP-PRT-050L-M4" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>가상계좌 발급 · 입금확인 · 취소는 <b>금전 처리</b> 권한(총괄 이상)이 있어야 켜진다. 담당자 · 조회 전용은 조회만 한다.</li>
        <li>차수별 입금이력은 행을 눌러 기업상세 분담금관리 탭에서 본다.</li>
      </ul>
    </div>

    <Dialog v-model:visible="issueOpen" modal header="가상계좌 발급" :style="{ width: '420px' }" :draggable="false">
      <p>{{ current?.name }} — 납부대상 {{ current ? won(current.participants.final * 200_000) : '' }}</p>
      <template #footer>
        <SbCode code="SP-PRT-050L-M3" />
        <Button label="취소" severity="secondary" outlined @click="issueOpen = false" />
        <Button label="발급" @click="doIssue(); issueOpen = false" />
      </template>
    </Dialog>

    <WsActionDialog
      v-model:visible="confirmOpen" code="SP-PRT-050L-M2" :header="isCancelConfirm ? '입금확인 취소' : '입금확인'"
      :target="current ? `${current.name} — 미납액 ${won(Math.max(0, current.vAccount.target - current.vAccount.paid))}` : ''"
      :reason="{ label: isCancelConfirm ? '취소 사유' : '확인 근거 · 사유', required: true, min: 2, max: 200 }"
      confirm-label="확정" @confirm="doConfirm"
    />
    <SbCode code="SP-PRT-050L-M1" style="display: none" />
  </div>
</template>
