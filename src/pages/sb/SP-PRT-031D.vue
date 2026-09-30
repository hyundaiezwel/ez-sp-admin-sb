<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-031D 참여노동자관리 인원추가심사상세.
 * 611 등록완료 → 613 입금중(승인) / 612 보완필요 → 611(기업 재제출) / 611·612 → 615 추가취소
 * 613 → 614 입금확인 → 616 추가완료. 613 → 615 승인취소(미입금), 613 입금기한 변경(613 유지).
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsMasked from '../../ws/WsMasked.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { EXTRA_REQUESTS, EXTRA_LABEL, extraOf, type ExtraSts } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-031D'
const route = useRoute()
const current = computed(() => extraOf(String(route.query.id ?? '')) ?? EXTRA_REQUESTS[0])
const hasBlocked = computed(() => current.value.candidates.some((c) => c.blocked))

function pushHist(action: string, note: string) {
  current.value.history.push({ at: new Date().toLocaleString('ko-KR'), by: '나(미리보기)', action, note })
}

/* --- M1 인원추가 승인(입금기한 지정) ---------------------------------------- */
const approveOpen = ref(false)
const approveDue = ref<Date | null>(null)
function openApprove() {
  if (hasBlocked.value) { warnOpen.value = true; return }
  approveDue.value = null
  approveOpen.value = true
}
function doApprove() {
  if (!approveDue.value) return notify('입금기한을 선택하세요.', 'danger')
  current.value.sts = '613'
  current.value.depositDue = approveDue.value.toLocaleString('ko-KR')
  pushHist('인원추가 승인', `입금기한 ${current.value.depositDue}`)
  notify('인원추가를 승인했습니다 — 기업 담당자에게 입금 요청 LMS · E-Mail이 발송됩니다.', 'success')
  approveOpen.value = false
}

/* --- M5 참여불가 회원 경고 ------------------------------------------------- */
const warnOpen = ref(false)
function warnContinue() {
  warnOpen.value = false
  pushHist('참여불가 회원 경고 확인', '계속 진행')
  approveDue.value = null
  approveOpen.value = true
}

/* --- M2 보완필요 ------------------------------------------------------------ */
const holdOpen = ref(false)
function doHold(p: ActionPayload) {
  current.value.sts = '612'
  pushHist('보완필요', p.text)
  notify('보완필요로 처리했습니다 — 보완 요청 LMS · E-Mail이 발송됩니다.', 'success')
}

/* --- M3 취소 · 승인취소 ------------------------------------------------------ */
const cancelOpen = ref(false)
const cancelLabel = computed(() => (current.value.sts === '613' ? '승인취소' : '취소'))
function doCancel(p: ActionPayload) {
  current.value.sts = '615'
  pushHist(cancelLabel.value, p.text)
  notify(`${cancelLabel.value} 처리했습니다 — 되돌릴 수 없고 같은 창구로 재신청할 수 없습니다. 안내가 발송됩니다.`, 'success')
}

/* --- M4 입금기한 변경 -------------------------------------------------------- */
const dueOpen = ref(false)
const newDue = ref<Date | null>(null)
function doDue() {
  if (!newDue.value) return notify('새 입금기한을 선택하세요.', 'danger')
  current.value.depositDue = newDue.value.toLocaleString('ko-KR')
  pushHist('입금기한 변경', current.value.depositDue)
  notify('입금기한을 바꿨습니다 — 입금 요청이 다시 발송됩니다.', 'success')
  dueOpen.value = false
}

/* --- 입금 확인 · 추가완료(내부 처리, 사유 없음) ------------------------------- */
function confirmDeposit() { current.value.sts = '614'; pushHist('추가분 입금 확인', ''); notify('입금을 확인했습니다.', 'success') }
function complete() { current.value.sts = '616'; pushHist('추가완료(포인트 배정)', ''); notify('추가완료로 처리했습니다 — 추가 노동자 가입 안내가 나갑니다.', 'success') }

const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l">
        <h2 class="ws-tit__h">{{ current.company }}</h2>
        <span class="ws-badge ws-badge--info">{{ EXTRA_LABEL[current.sts] }}</span>
        <span class="ws-desc">{{ current.bizNo }} · 신청 {{ current.appliedAt }}</span>
      </div>
      <div class="ws-tit__r">
        <SbCan action="status"><Button v-if="current.sts === '611'" label="보완필요" severity="secondary" outlined @click="holdOpen = true" /></SbCan>
        <SbCan action="status"><Button v-if="current.sts === '613'" label="입금기한 변경" severity="secondary" outlined @click="dueOpen = true" /></SbCan>
        <SbCan action="status"><Button v-if="current.sts === '613'" label="추가분 입금 확인" severity="secondary" outlined @click="confirmDeposit" /></SbCan>
        <SbCan action="status"><Button v-if="current.sts === '614'" label="추가완료 처리" severity="contrast" @click="complete" /></SbCan>
        <SbCan action="approve"><Button v-if="['611', '612', '613'].includes(current.sts)" :label="cancelLabel" severity="danger" outlined @click="cancelOpen = true" /></SbCan>
        <SbCan action="approve"><Button v-if="current.sts === '611'" label="승인" severity="contrast" @click="openApprove" /></SbCan>
      </div>
    </div>
    <p v-if="!can(CODE, 'approve')" class="ws-desc">{{ denyTip(CODE, 'approve') }}</p>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">기본정보</h2></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 160px" /><col /></colgroup>
        <tbody>
          <tr><th scope="row">기업명</th><td>{{ current.company }}</td></tr>
          <tr><th scope="row">사업자등록번호</th><td>{{ current.bizNo }}</td></tr>
          <tr><th scope="row">신청일시</th><td>{{ current.appliedAt }}</td></tr>
          <tr><th scope="row">추가 인원 · 추가 분담금</th><td>{{ current.count }}명 · {{ fmt(current.count * current.unitCost) }}원(1인 {{ fmt(current.unitCost) }}원)</td></tr>
          <tr><th scope="row">가상계좌</th><td class="ws-desc">VA-{{ current.id }}-0000000 (미리보기)</td></tr>
          <tr><th scope="row">입금기한</th><td>{{ current.depositDue || '-' }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">추가 노동자 명단</h2></div>
        <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="current.candidates.length" :limit="1000" label="명단 다운로드" modal-code="SP-PRT-031D-M6" /></SbCan></div>
      </div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">성명</th><th scope="col">생년월일</th><th scope="col">휴대폰</th><th scope="col">참여불가 일치</th></tr></thead>
        <tbody>
          <tr v-for="c in current.candidates" :key="c.name + c.phone">
            <td><WsMasked :value="c.name" kind="name" label="성명" /></td>
            <td><WsMasked :value="c.birth" kind="birth" label="생년월일" /></td>
            <td><WsMasked :value="c.phone" kind="phone" label="휴대폰" /></td>
            <td><span v-if="c.blocked" class="ws-badge ws-badge--danger">일치</span><span v-else class="ws-desc">—</span></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">처리 이력</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">일시</th><th scope="col">처리자</th><th scope="col">처리</th><th scope="col">비고</th></tr></thead>
        <tbody>
          <tr v-for="(h, i) in [...current.history].reverse()" :key="i"><td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.action }}</td><td>{{ h.note || '—' }}</td></tr>
        </tbody>
      </table>
    </section>

    <!-- M1 -->
    <Dialog v-model:visible="approveOpen" modal header="인원추가 승인(입금기한 지정)" :style="{ width: '420px' }" :draggable="false">
      <div class="ad">
        <p class="ws-desc">추가 {{ current.count }}명 · 추가 분담금 {{ fmt(current.count * current.unitCost) }}원 · 가상계좌 VA-{{ current.id }}-0000000</p>
        <label class="ws-req" for="ap-due">입금기한</label>
        <DatePicker id="ap-due" v-model="approveDue" date-format="yy.mm.dd" show-icon icon-display="input" />
        <p class="ad__notice"><b>대외 통지</b>기업 담당자에게 입금 요청 LMS · E-Mail이 발송됩니다.</p>
      </div>
      <template #footer>
        <SbCode code="SP-PRT-031D-M1" />
        <Button label="취소" severity="secondary" outlined @click="approveOpen = false" />
        <Button label="승인" severity="contrast" @click="doApprove" />
      </template>
    </Dialog>

    <!-- M5 -->
    <Dialog v-model:visible="warnOpen" modal header="참여불가 회원 포함 경고" :style="{ width: '440px' }" :draggable="false">
      <p class="ad__warn" role="note">명단 중 참여불가 회원과 일치하는 후보가 있습니다. 계속 진행하면 확인 기록이 남습니다.</p>
      <table class="ws-gtb">
        <thead><tr><th scope="col">성명</th><th scope="col">생년월일</th></tr></thead>
        <tbody><tr v-for="c in current.candidates.filter((c) => c.blocked)" :key="c.name"><td><WsMasked :value="c.name" kind="name" label="성명" /></td><td><WsMasked :value="c.birth" kind="birth" label="생년월일" /></td></tr></tbody>
      </table>
      <template #footer>
        <SbCode code="SP-PRT-031D-M5" />
        <Button label="닫기" severity="secondary" outlined @click="warnOpen = false" />
        <Button label="계속 진행" severity="danger" @click="warnContinue" />
      </template>
    </Dialog>

    <!-- M2 -->
    <WsActionDialog
      v-model:visible="holdOpen" code="SP-PRT-031D-M2" header="보완필요 사유 입력"
      :reason="{ label: '보완 사유', required: true, min: 1, max: 50 }"
      notice="기업 담당자에게 보완 요청 LMS · E-Mail이 발송됩니다." confirm-label="보완필요" @confirm="doHold"
    />

    <!-- M3 -->
    <WsActionDialog
      v-model:visible="cancelOpen" :code="'SP-PRT-031D-M3'" :header="`${cancelLabel} 사유 입력`"
      warn="되돌릴 수 없고, 같은 창구로 다시 신청할 수 없습니다."
      :reason="{ label: '사유', required: true, min: 1, max: 100 }"
      :notice="`기업 담당자에게 ${cancelLabel} 안내 LMS · E-Mail이 발송됩니다.`" :confirm-label="cancelLabel" danger @confirm="doCancel"
    />

    <!-- M4 -->
    <Dialog v-model:visible="dueOpen" modal header="입금기한 변경" :style="{ width: '380px' }" :draggable="false">
      <div class="ad">
        <label class="ws-req" for="du-new">새 입금기한</label>
        <DatePicker id="du-new" v-model="newDue" date-format="yy.mm.dd" show-icon icon-display="input" />
        <p class="ad__notice"><b>대외 통지</b>입금 요청이 재발송됩니다.</p>
      </div>
      <template #footer>
        <SbCode code="SP-PRT-031D-M4" />
        <Button label="취소" severity="secondary" outlined @click="dueOpen = false" />
        <Button label="변경" @click="doDue" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.ad { display: grid; gap: 8px; }
.ad__notice { display: flex; gap: 8px; padding: 10px 12px; border-radius: var(--ws-radius); background: var(--ws-surface-info); color: var(--ws-text); }
.ad__notice b { color: var(--ws-text-link); }
.ad__warn { padding: 10px 12px; margin-bottom: 8px; border-left: 3px solid var(--ws-text-danger); border-radius: var(--ws-radius-sm); background: var(--ws-surface-danger); color: var(--ws-text); line-height: 1.5; }
</style>
