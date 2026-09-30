<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-030L 참여노동자관리 노동자목록.
 * 참여기업 소속 노동자를 조회하고, 이용중 건은 행에서 이용정지, 환불실패 건은 환불계좌를 다시 등록한다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { SUSPEND_REASONS, bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { mask } from '../../ws/mask'
import { WORKERS_B4, MEMBER_LABEL, type SbWorkerB4 } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-030L'
const router = useRouter()
const STS_OPTS = [
  { l: '이용중', v: '' as string }, { l: '이용정지', v: '710' }, { l: '환불요청', v: '810' }, { l: '환불대상', v: '820' }, { l: '환불완료', v: '830' }, { l: '환불실패', v: '840' },
]

/* --- 조회 --------------------------------------------------------------- */
const blank = () => ({ q: '', sts: '__ALL__', joined: '' })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => WORKERS_B4.filter((w) => w.biz === ctx.biz))
const hit = (r: SbWorkerB4) => {
  const a = applied.value
  return (a.sts === '__ALL__' || r.memberSts === a.sts) &&
    (!a.joined || (a.joined === 'Y') === r.joined) &&
    (!a.q.trim() || r.name.includes(a.q.trim()) || r.company.includes(a.q.trim()) || r.bizNo.replace(/-/g, '').includes(a.q.replace(/-/g, '').trim()) || r.empNo.includes(a.q.trim()))
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.q.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => ctx.biz, () => requery())

function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

/* --- 목록 --------------------------------------------------------------- */
const cellBtn = (label: string, ok: boolean, tip: string) =>
  `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}" aria-label="${label} — ${tip}"`}>${label}</button>`
const columns = computed(() => {
  const ok = can(CODE, 'status')
  const tip = denyTip(CODE, 'status')
  return [
    { title: '기업명', field: 'company', minWidth: 140 },
    { title: '성명', field: 'name', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
    { title: '휴대폰', field: 'phone', width: 112, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'phone') },
    { title: '가입상태', field: 'joined', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '가입' : '<span class="ws-desc">미가입</span>') },
    { title: '배정금액', field: 'assigned', width: 96, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
    { title: '포인트 잔액', field: 'id', width: 100, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => (c.getRow().getData().assigned - c.getRow().getData().used).toLocaleString('ko-KR') },
    { title: '사용금액', field: 'used', width: 96, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
    { title: '회원 상태', field: 'memberSts', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--${c.getValue() === '' ? 'success' : c.getValue() === '710' ? 'danger' : 'warning'}">${MEMBER_LABEL[c.getValue() as keyof typeof MEMBER_LABEL]}</span>` },
    { title: '이용정지일자', field: 'suspendedAt', width: 108, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '포인트 사용기한', field: 'useUntil', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    {
      title: '처리', field: 'memberSts', width: 92, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => {
        const r = c.getRow().getData() as SbWorkerB4
        if (r.memberSts === '') return cellBtn('이용정지', ok, tip)
        if (r.memberSts === '840') return cellBtn('계좌 재등록', ok, tip)
        return '<span class="ws-desc">—</span>'
      },
      cellClick: (_: any, c: any) => {
        if (!ok) return
        const r = c.getRow().getData() as SbWorkerB4
        if (r.memberSts === '') openSuspend(r)
        else if (r.memberSts === '840') openAccount(r)
      },
    },
  ]
})
const openDetail = (r: SbWorkerB4) => router.push({ path: routeOf('SP-PRT-030D'), query: { id: r.id } })

/* --- M1 이용정지 --------------------------------------------------------- */
const suspendOpen = ref(false)
const current = ref<SbWorkerB4 | null>(null)
function openSuspend(r: SbWorkerB4) { current.value = r; suspendOpen.value = true }
function doSuspend(p: ActionPayload) {
  if (!current.value) return
  current.value.memberSts = '710'
  current.value.suspendedAt = new Date().toLocaleString('ko-KR')
  current.value.suspendReason = p.option === '기타' ? p.text : (p.option ?? '')
  reload()
  notify(`${current.value.name} — 이용정지로 바꿨습니다 · 노동자에게 안내가 발송됩니다`, 'success')
}

/* --- M2 환불계좌 등록(환불실패 재등록) ------------------------------------- */
const acctOpen = ref(false)
const acct = ref({ bank: '', holder: '', no: '' })
function openAccount(r: SbWorkerB4) { current.value = r; acct.value = { bank: '', holder: '', no: '' }; acctOpen.value = true }
function saveAccount() {
  if (!current.value) return
  if (!acct.value.bank || !acct.value.holder.trim() || !acct.value.no.trim()) return notify('은행 · 예금주 · 계좌번호를 모두 입력하세요.', 'danger')
  current.value.refundAccount = { ...acct.value }
  current.value.memberSts = '810'
  reload()
  notify(`${current.value.name} — 환불계좌를 다시 등록했습니다 · 환불요청으로 되돌아갑니다`, 'success')
  acctOpen.value = false
}

const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="w-q">검색어</label></th>
        <td colspan="3"><InputText id="w-q" v-model="f.q" fluid placeholder="노동자명 · 기업명 · 사업자등록번호 · 사번" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="w-sts">회원 상태</label></th>
        <td><Select v-model="f.sts" input-id="w-sts" :options="[{ l: '전체', v: '__ALL__' }, ...STS_OPTS]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="w-join">가입 여부</label></th>
        <td><Select v-model="f.joined" input-id="w-join" :options="[{ l: '전체', v: '' }, { l: '가입', v: 'Y' }, { l: '미가입', v: 'N' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">노동자 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>명</span>
          <span class="ws-desc">{{ bizLabel(ctx.biz) }} · 행을 누르면 노동자상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="20000" modal-code="SP-PRT-030L-M3" /></SbCan>
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
        <li>가입상태 · 배정금액 · 포인트 잔액 · 사용금액은 복지몰 조회 결과다(연계 O).</li>
        <li>성명 · 휴대폰은 가려 보인다 — 원문은 노동자상세에서 열람 기록과 함께 연다.</li>
        <li>이용중 건은 행에서 바로 이용정지, 환불실패 건은 환불계좌를 다시 등록해 환불요청으로 되돌린다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="suspendOpen" code="SP-PRT-030L-M1" header="이용정지 사유 선택"
      :target="current ? `${current.name} (${current.company})` : ''"
      :reason="{ label: '사유', options: [...SUSPEND_REASONS], other: '기타', min: 5, max: 33, placeholder: '기타 내용(33자 이내)' }"
      notice="노동자에게 이용정지 안내 LMS · E-Mail이 발송됩니다."
      confirm-label="이용정지" @confirm="doSuspend"
    />

    <Dialog v-model:visible="acctOpen" modal header="환불계좌 등록" :style="{ width: '440px' }" :draggable="false">
      <div class="ad">
        <p class="ws-desc" style="margin-bottom: 4px">{{ current?.name }} — 환불실패 건. 저장하면 환불요청으로 되돌아갑니다.</p>
        <label class="ws-req" for="ac-bank">은행</label>
        <Select id="ac-bank" v-model="acct.bank" :options="['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행']" fluid placeholder="은행 선택" />
        <label class="ws-req" for="ac-holder">예금주</label>
        <InputText id="ac-holder" v-model="acct.holder" fluid maxlength="20" />
        <label class="ws-req" for="ac-no">계좌번호</label>
        <InputText id="ac-no" v-model="acct.no" fluid maxlength="20" placeholder="숫자와 -만" />
        <p class="ws-desc">예금주 확인은 미리보기라 통과한 것으로 처리한다.</p>
      </div>
      <template #footer>
        <SbCode code="SP-PRT-030L-M2" />
        <Button label="취소" severity="secondary" outlined @click="acctOpen = false" />
        <Button label="저장" @click="saveAccount" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.ad { display: grid; gap: 8px; }
</style>
