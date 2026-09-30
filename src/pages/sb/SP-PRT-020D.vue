<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-020D 기업상세 — 참여 건 하나를 탭 8개로 보고, 등록승인부터 참여취소까지 건별로 처리한다.
 * AS-IS 기업관리 · 기초정보관리 상세의 상태 변경 모달을 이 화면이 모두 받는다(M1~M12).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsFileView from '../../ws/WsFileView.vue'
import WsMasked from '../../ws/WsMasked.vue'
import { notify } from '../../ws/notify'
import { statusHtml } from '../../sp/status'
import { stateOf, bizLabel, CO_FG } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { mask } from '../../ws/mask'
import { participationOf, type SbParticipation } from '@fixtures/sb/B3'
import { WORKERS } from '@fixtures/sb/common'

const CODE = 'SP-PRT-020D'
const route = useRoute()
const router = useRouter()
const labelOf = (c: string) => stateOf(c)?.label ?? c
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const tab = ref('basic')

const current = ref<SbParticipation | null>(null)
watch(() => route.query.id, (id) => { current.value = participationOf(String(id ?? '')) ?? null }, { immediate: true })
const workers = computed(() => (current.value ? WORKERS.filter((w) => w.companyId === current.value!.companyId) : []))

/* --- 등록승인(M1) ------------------------------------------------------------ */
const approveOpen = ref(false)
function doApprove(p: ActionPayload) {
  const c = current.value!
  if (!p.date) return notify('입금기한을 정하세요.', 'danger')
  const y = p.date.getFullYear(), m = String(p.date.getMonth() + 1).padStart(2, '0'), d = String(p.date.getDate()).padStart(2, '0')
  c.sts = '510'
  c.regApprovedAt = `${y}.${m}.${d} 09:00`
  c.depositDeadline = `${y}.${m}.${d}`
  c.vAccount = { no: `822-9999-${Math.floor(Math.random() * 9000 + 1000)}`, issuedAt: c.regApprovedAt, target: c.participants.final * 200_000, paid: 0, dueUnpaid: false, rows: [] }
  notify('등록승인 처리했습니다 — 가상계좌를 발급하고 입금 요청 안내를 보냈습니다.', 'success')
}

/* --- 입금기한 변경(M2) -------------------------------------------------------- */
const dueOpen = ref(false)
function doDue(p: ActionPayload) {
  if (!p.date) return notify('입금기한은 오늘 이후로 정하세요.', 'danger')
  const y = p.date.getFullYear(), m = String(p.date.getMonth() + 1).padStart(2, '0'), d = String(p.date.getDate()).padStart(2, '0')
  current.value!.depositDeadline = `${y}.${m}.${d}`
  notify('입금기한을 바꾸고 입금 요청 안내를 다시 보냈습니다.', 'success')
}

/* --- 수동 입금확인(M3) -------------------------------------------------------- */
const confirmOpen = ref(false)
function doConfirm(p: ActionPayload) {
  const c = current.value!
  const amount = c.vAccount.target - c.vAccount.paid
  c.vAccount.rows.unshift({ seq: c.vAccount.rows.length + 1, amount, at: '2026.09.20 10:00', by: '(수동확인)', note: p.text || '확인 근거 미기재' })
  c.vAccount.paid = c.vAccount.target
  c.sts = '520'
  notify('입금완료로 처리했습니다.', 'success')
}

/* --- 참여개시(M4) ------------------------------------------------------------- */
const startOpen = ref(false)
function doStart() {
  current.value!.sts = '611'
  notify('참여개시로 처리했습니다 — 복지몰 회원 생성 · 포인트 배정을 요청했습니다.', 'success')
}

/* --- 확인서 파기(M5) · 철회(M6) ------------------------------------------------ */
const breakOpen = ref(false)
const breakAckWarn = ref(false)
function doBreak(p: ActionPayload) {
  if (p.text.trim().length < 5) return notify('요청 사유를 5자 이상 입력하세요.', 'danger')
  if (current.value!.sts === '510' && current.value!.vAccount.paid > 0 && !breakAckWarn.value) return notify('입금 여부 경고를 확인하세요.', 'danger')
  current.value!.sts = '390'
  current.value!.cancelReason = p.text.trim()
  breakAckWarn.value = false
  notify('참여신청 절차를 중지했습니다.', 'success')
}
const revokeOpen = ref(false)
function doRevoke() { current.value!.sts = '410'; notify('확인서 파기를 철회했습니다.', 'success') }

/* --- 승인취소(M7) -------------------------------------------------------------- */
const apprCancelOpen = ref(false)
function doApprCancel(p: ActionPayload) {
  if (p.text.trim().length < 5) return notify('취소 사유를 입력하세요.', 'danger')
  current.value!.sts = '410'
  notify('등록승인을 취소해 최종제출로 되돌렸습니다.', 'success')
}

/* --- 참여취소 · 미체결(M8) ------------------------------------------------------ */
const cancelOpen = ref(false)
function doCancel(p: ActionPayload) {
  if (p.text.trim().length < 5) return notify('취소 사유를 입력하세요.', 'danger')
  const c = current.value!
  c.sts = p.option === '미체결' ? '320' : '590'
  c.cancelReason = p.text.trim()
  notify(`${p.option}으로 처리했습니다.`, 'success')
}

/* --- 미제출 사유(M9) ------------------------------------------------------------ */
const missingOpen = ref(false)
function doMissing(p: ActionPayload) {
  if (!p.text.trim()) return notify('미제출 사유를 입력하세요.', 'danger')
  notify('미제출 사유를 등록했습니다 — 누리집 결과 조회에 노출됩니다.', 'success')
}

/* --- 정보 수정 사유(M10) --------------------------------------------------------- */
const editOpen = ref(false)
function doEdit() { notify('기업정보를 수정했습니다.', 'success') }

/* --- 환불수단 · 계좌 변경(M12) ---------------------------------------------------- */
const refundOpen = ref(false)
const refundAcctOk = ref(false)
function doRefund(p: ActionPayload) {
  if (!refundAcctOk.value && p.option !== '개인') return notify('계좌인증을 통과해야 저장할 수 있습니다.', 'danger')
  if (p.option) current.value!.refundMethod = p.option as SbParticipation['refundMethod']
  refundAcctOk.value = false
  notify('환불수단을 저장했습니다.', 'success')
}

/* --- 가능한 처리 버튼 판정 --------------------------------------------------- */
const buttons = computed(() => {
  const c = current.value
  if (!c) return { approve: false, due: false, confirm: false, start: false, break: false, revoke: false, apprCancel: false, cancel: false, missing: false }
  return {
    approve: c.sts === '410',
    due: c.sts === '510' || c.sts === '613',
    confirm: c.sts === '510' && c.vAccount.paid < c.vAccount.target,
    start: c.sts === '520',
    break: c.sts === '410' || c.sts === '510',
    revoke: c.sts === '390',
    apprCancel: c.sts === '510',
    cancel: c.sts === '220' || c.sts === '520',
    missing: c.sts === '220',
  }
})

/* --- 메모 · 재발송 --------------------------------------------------------- */
const memoText = ref('')
function addMemo() { if (memoText.value.trim()) { current.value!.memos.unshift({ id: `M${Date.now()}`, at: '2026.09.20 15:00', by: '김*수', text: memoText.value.trim() }); memoText.value = '' } }
function resend(n: { result: '성공' | '실패' }) { if (n.result === '실패') { n.result = '성공'; notify('재발송했습니다.', 'success') } }
const fileOpen = ref(false)
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="current">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ current.name }}</h2>
            <span v-html="statusHtml(current.sts)" />
            <span class="ws-desc">{{ bizLabel(current.biz) }} · 참여인원 최초 {{ current.participants.initial }} / 추가 {{ current.participants.extra }} / 최종 {{ current.participants.final }} · 입금기한 {{ current.depositDeadline ?? '—' }}</span>
          </div>
          <div class="ws-tit__r">
            <SbCan action="approve"><Button v-if="buttons.approve" label="등록승인" @click="approveOpen = true" /></SbCan>
            <SbCan action="status"><Button v-if="buttons.due" label="입금기한 변경" severity="secondary" outlined @click="dueOpen = true" /></SbCan>
            <SbCan action="money"><Button v-if="buttons.confirm" label="입금확인" severity="secondary" outlined @click="confirmOpen = true" /></SbCan>
            <SbCan action="status"><Button v-if="buttons.start" label="참여개시" @click="startOpen = true" /></SbCan>
            <SbCan action="status"><Button v-if="buttons.break" label="확인서 파기" severity="danger" outlined @click="breakOpen = true" /></SbCan>
            <SbCan action="approve"><Button v-if="buttons.revoke" label="파기 철회" severity="secondary" outlined @click="revokeOpen = true" /></SbCan>
            <SbCan action="approve"><Button v-if="buttons.apprCancel" label="승인취소" severity="secondary" outlined @click="apprCancelOpen = true" /></SbCan>
            <SbCan action="approve"><Button v-if="buttons.cancel" label="참여취소" severity="danger" outlined @click="cancelOpen = true" /></SbCan>
            <SbCan action="status"><Button v-if="buttons.missing" label="미제출 사유" severity="secondary" outlined @click="missingOpen = true" /></SbCan>
          </div>
        </div>
      </section>

      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="basic">기본정보</Tab>
          <Tab value="docs">제출서류</Tab>
          <Tab value="money">분담금관리</Tab>
          <Tab value="status">참여현황</Tab>
          <Tab value="point">포인트관리</Tab>
          <Tab value="use">이용내역</Tab>
          <Tab value="refund">환불관리</Tab>
          <Tab value="notice">발송이력</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="basic">
            <div class="ws-form">
              <div class="ws-form__row"><span class="ws-form__l">사업자등록번호</span><span>{{ current.bizNo }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">기업구분</span><span>{{ CO_FG.find((x) => x.code === current?.coFg)?.label }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">담당자명</span><span>{{ mask(current.manager, 'name') }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">담당자 연락처</span><SbCan action="download-pii"><WsMasked :value="current.phone" kind="phone" label="담당자 연락처" /></SbCan></div>
              <div class="ws-form__row"><span class="ws-form__l">환불수단</span><span>{{ current.refundMethod }}</span></div>
            </div>
            <SbCan action="update"><Button label="정보 수정" severity="secondary" outlined size="small" @click="editOpen = true" /></SbCan>
            <h3 class="ws-tit__h" style="margin-top: 16px; font-size: var(--ws-font-size-md)">관리자 메모</h3>
            <SbCan action="create">
              <div class="ws-form__row" style="gap: 8px"><InputText v-model="memoText" fluid maxlength="200" placeholder="내부 메모" @keyup.enter="addMemo" /><Button label="등록" @click="addMemo" /></div>
            </SbCan>
            <ul class="ws-list"><li v-for="m in current.memos" :key="m.id" class="ws-desc">{{ m.at }} · {{ m.by }} — {{ m.text }}</li></ul>
            <h3 class="ws-tit__h" style="margin-top: 16px; font-size: var(--ws-font-size-md)">처리이력</h3>
            <table class="ws-gtb">
              <thead><tr><th scope="col">일시</th><th scope="col">처리자</th><th scope="col">처리</th></tr></thead>
              <tbody><tr v-for="h in current.history" :key="h.id"><td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.action }}</td></tr></tbody>
            </table>
          </TabPanel>

          <TabPanel value="docs">
            <p class="ws-desc">최종제출 시점 원본을 차수별로 보관한다. 통장사본 · 취소공문 등록 여부를 함께 표시한다.</p>
            <table class="ws-gtb">
              <thead><tr><th scope="col">서류</th><th scope="col">제출차수</th><th scope="col"></th></tr></thead>
              <tbody>
                <tr><td>명단·서류 일체</td><td>1차</td><td><Button label="미리보기" size="small" severity="secondary" text @click="fileOpen = true" /></td></tr>
                <tr><td>통장사본</td><td>1차</td><td><span class="ws-badge ws-badge--success">등록</span></td></tr>
              </tbody>
            </table>
            <SbCan action="download-pii"><Button label="원본 내려받기" severity="secondary" outlined size="small" style="margin-top: 8px" @click="notify('사유 등록 뒤 내려받습니다(미리보기).')" /></SbCan>
          </TabPanel>

          <TabPanel value="money">
            <div class="ws-form">
              <div class="ws-form__row"><span class="ws-form__l">가상계좌번호</span><span>{{ current.vAccount.no ?? '미발급' }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">발급일</span><span>{{ current.vAccount.issuedAt ?? '—' }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">마감기한</span><span>{{ current.depositDeadline ?? '—' }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">납부대상 금액</span><span>{{ won(current.vAccount.target) }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">미납액</span><span>{{ won(Math.max(0, current.vAccount.target - current.vAccount.paid)) }}</span></div>
            </div>
            <h3 class="ws-tit__h" style="margin-top: 12px; font-size: var(--ws-font-size-md)">입금이력</h3>
            <table class="ws-gtb">
              <thead><tr><th scope="col">차수</th><th scope="col">입금액</th><th scope="col">입금일시</th><th scope="col">처리자</th><th scope="col">비고</th></tr></thead>
              <tbody>
                <tr v-for="r in current.vAccount.rows" :key="r.seq"><td>{{ r.seq }}차</td><td>{{ won(r.amount) }}</td><td>{{ r.at }}</td><td>{{ r.by }}</td><td>{{ r.note }}</td></tr>
                <tr v-if="!current.vAccount.rows.length"><td colspan="5" class="ws-desc" style="text-align: center">입금이력이 없습니다.</td></tr>
              </tbody>
            </table>
          </TabPanel>

          <TabPanel value="status">
            <p class="ws-desc">사업연도 {{ current.biz }} 기준 임직원 신청 · 가입 현황. 이름은 가려 보이며 노동자상세로 이동할 수 있다(연계 화면).</p>
            <table class="ws-gtb">
              <thead><tr><th scope="col">이름</th><th scope="col">사번</th><th scope="col">상태</th></tr></thead>
              <tbody><tr v-for="w in workers.slice(0, 8)" :key="w.id"><td>{{ mask(w.name, 'name') }}</td><td>{{ w.empNo }}</td><td>{{ w.sts }}</td></tr></tbody>
            </table>
          </TabPanel>

          <TabPanel value="point">
            <p class="ws-desc">복지몰 조회 데이터 — 조회 시각 2026.09.20 15:00. 지원기관 · 기업 · 개인 포인트를 따로 본다.</p>
            <div class="ws-form">
              <div class="ws-form__row"><span class="ws-form__l">지원기관 포인트 배정</span><span>{{ won(current.participants.final * 50_000) }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">기업 포인트 배정</span><span>{{ won(current.participants.final * 150_000) }}</span></div>
              <div class="ws-form__row"><span class="ws-form__l">개인 포인트 배정</span><span>{{ won(current.participants.final * 200_000) }}</span></div>
            </div>
          </TabPanel>

          <TabPanel value="use">
            <p class="ws-desc">복지몰 이용 거래 — 기업 단위 집계(조회 데이터).</p>
            <table class="ws-gtb"><thead><tr><th scope="col">이용자</th><th scope="col">사용액</th><th scope="col">잔여</th></tr></thead>
              <tbody><tr v-for="w in workers.slice(0, 5)" :key="w.id"><td>{{ mask(w.name, 'name') }}</td><td>{{ won(w.point) }}</td><td>{{ won(Math.max(0, 400_000 - w.point)) }}</td></tr></tbody>
            </table>
          </TabPanel>

          <TabPanel value="refund">
            <div class="ws-form"><div class="ws-form__row"><span class="ws-form__l">환불수단</span><span>{{ current.refundMethod }}</span></div></div>
            <SbCan action="money"><Button label="환불수단 · 계좌 변경" severity="secondary" outlined size="small" style="margin-top: 8px" @click="refundOpen = true" /></SbCan>
          </TabPanel>

          <TabPanel value="notice">
            <table class="ws-gtb">
              <thead><tr><th scope="col">안내</th><th scope="col">채널</th><th scope="col">일시</th><th scope="col">결과</th><th scope="col"></th></tr></thead>
              <tbody>
                <tr v-for="n in current.notices" :key="n.id">
                  <td>{{ n.trigger }}</td><td>{{ n.channel }}</td><td>{{ n.at }}</td>
                  <td><span :class="n.result === '성공' ? 'ws-badge ws-badge--success' : 'ws-badge ws-badge--danger'">{{ n.result }}</span></td>
                  <td><SbCan action="send"><Button v-if="n.result === '실패'" label="재발송" size="small" severity="secondary" text @click="resend(n)" /></SbCan></td>
                </tr>
                <tr v-if="!current.notices.length"><td colspan="5" class="ws-desc" style="text-align: center">발송이력이 없습니다.</td></tr>
              </tbody>
            </table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
    <div v-else class="ws-empty">
      <p>id가 없습니다 — 기업목록에서 행을 눌러 들어와 주세요.</p>
      <Button label="기업목록으로" severity="secondary" outlined @click="router.push(routeOf('SP-PRT-020L'))" />
    </div>

    <WsActionDialog v-model:visible="approveOpen" code="SP-PRT-020D-M1" header="등록승인" :target="current ? `${current.name} — 납부대상 ${won(current.participants.final * 200_000)}` : ''" :date="{ label: '입금기한' }" notice="입금 요청 안내 LMS · E-Mail(가상계좌번호 포함)이 발송됩니다." confirm-label="승인" @confirm="doApprove" />
    <WsActionDialog v-model:visible="dueOpen" code="SP-PRT-020D-M2" header="입금기한 변경" :target="current ? `현재 입금기한 ${current.depositDeadline}` : ''" :date="{ label: '새 입금기한' }" notice="입금 요청 안내 LMS · E-Mail이 재발송됩니다." confirm-label="변경" @confirm="doDue" />
    <WsActionDialog v-model:visible="confirmOpen" code="SP-PRT-020D-M3" header="수동 입금확인" :target="current ? `미납액 ${won(current.vAccount.target - current.vAccount.paid)}` : ''" :reason="{ label: '확인 근거 · 사유', required: true, min: 2, max: 200 }" confirm-label="확인" @confirm="doConfirm" />
    <WsActionDialog v-model:visible="startOpen" code="SP-PRT-020D-M4" header="참여개시" :target="current ? `${current.name} — 대상 ${current.participants.final}명` : ''" notice="참여개시 안내 LMS · E-Mail이 발송되고 복지몰 회원 생성 · 포인트 배정이 요청됩니다." confirm-label="참여개시" @confirm="doStart" />
    <WsActionDialog v-model:visible="breakOpen" code="SP-PRT-020D-M5" header="확인서 파기" :target="current?.name" :warn="current?.sts === '510' && current.vAccount.paid > 0 ? `입금했으나 입금완료 전이면 환불을 수기로 처리해야 합니다 — 현재 입금액 ${won(current.vAccount.paid)}` : undefined" :reason="{ label: '요청 사유', required: true, min: 5, max: 200 }" notice="참여신청 절차 중지 안내가 발송됩니다." danger confirm-label="파기" @confirm="doBreak">
      <label v-if="current?.sts === '510' && current.vAccount.paid > 0" style="display: flex; gap: 6px; align-items: center">
        <input type="checkbox" v-model="breakAckWarn" /> 경고를 확인했습니다
      </label>
    </WsActionDialog>
    <WsActionDialog v-model:visible="revokeOpen" code="SP-PRT-020D-M6" header="확인서 파기 철회" :target="current?.name" :reason="{ label: '철회 사유', required: true, min: 2, max: 200 }" confirm-label="철회" @confirm="doRevoke" />
    <WsActionDialog v-model:visible="apprCancelOpen" code="SP-PRT-020D-M7" header="승인취소" :target="current?.name" :reason="{ label: '취소 사유', required: true, min: 5, max: 200 }" notice="승인취소 안내 LMS · E-Mail이 발송되고 최종제출로 되돌립니다." danger confirm-label="승인취소" @confirm="doApprCancel" />
    <WsActionDialog v-model:visible="cancelOpen" code="SP-PRT-020D-M8" header="참여취소 · 미체결" :target="current?.name" :reason="{ label: '취소 구분', options: ['미체결', '입금 후 참여취소'] }" notice="참여취소 안내가 발송됩니다." danger confirm-label="확정" @confirm="doCancel" />
    <WsActionDialog v-model:visible="missingOpen" code="SP-PRT-020D-M9" header="미제출 사유" :target="current?.name" :reason="{ label: '미제출 사유', required: true, max: 100 }" confirm-label="등록" @confirm="doMissing">
      <p class="ws-desc">입력한 내용이 누리집 결과 페이지에 노출됩니다.</p>
    </WsActionDialog>
    <WsActionDialog v-model:visible="editOpen" code="SP-PRT-020D-M10" header="정보 수정 사유" :target="current?.name" :reason="{ label: '수정 사유', required: true, min: 5, max: 200 }" confirm-label="저장" @confirm="doEdit" />
    <WsActionDialog v-model:visible="refundOpen" code="SP-PRT-020D-M12" header="환불수단 · 환불계좌 변경" :target="current?.name" :reason="{ label: '환불수단', options: ['기업', '개인', '기업+개인'] }" confirm-label="저장" @confirm="doRefund">
      <label style="display: flex; gap: 6px; align-items: center"><input type="checkbox" v-model="refundAcctOk" /> 계좌인증 통과(미리보기)</label>
    </WsActionDialog>

    <WsFileView v-model:visible="fileOpen" title="제출서류 미리보기" :files="[{ name: '명단·서류 일체', kind: 'PDF', size: '1.2MB' }]" />
    <SbCode code="SP-PRT-020D-M11" style="display: none" />
  </div>
</template>
