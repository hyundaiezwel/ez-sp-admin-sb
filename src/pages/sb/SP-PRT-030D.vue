<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-030D 참여노동자관리 노동자상세. 탭: 기본정보 · 제출서류 · 포인트현황 · 이용내역 · 상태관리.
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsFileView, { type ViewFile } from '../../ws/WsFileView.vue'
import WsMasked from '../../ws/WsMasked.vue'
import WsDownload from '../../ws/WsDownload.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import { SUSPEND_REASONS } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { WORKERS_B4, MEMBER_LABEL, workerOf } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-030D'
const route = useRoute()
const current = computed(() => workerOf(String(route.query.id ?? '')) ?? WORKERS_B4[0])
const tab = ref('basic')
watch(() => route.query.id, () => { tab.value = 'basic' })

/* --- M1 이용정지 --------------------------------------------------------- */
const suspendOpen = ref(false)
function doSuspend(p: ActionPayload) {
  const w = current.value
  w.memberSts = '710'
  w.suspendedAt = new Date().toLocaleString('ko-KR')
  w.suspendReason = p.option === '기타' ? p.text : (p.option ?? '')
  notify('이용정지로 바꿨습니다 · 복지몰 사용 차단을 요청했습니다 · 안내가 발송됩니다.', 'success')
}

/* --- M2 이용정지 해제 ------------------------------------------------------ */
const releaseOpen = ref(false)
function doRelease(p: ActionPayload) {
  const w = current.value
  w.memberSts = ''
  w.suspendedAt = ''
  w.suspendReason = ''
  notify(`이용정지를 해제했습니다 — 사유: ${p.text} · 이용 재개 안내가 발송됩니다.`, 'success')
}

/* --- M3 서류 심사보류 ------------------------------------------------------ */
const holdOpen = ref(false)
function doHold(p: ActionPayload) { notify(`서류를 심사보류로 처리했습니다 — 사유: ${p.text} · 기업 담당자에게 보완 요청이 발송됩니다.`, 'success') }

/* --- M4 환불계좌 · 환불수단 변경 ------------------------------------------- */
const acctOpen = ref(false)
const acctForm = ref({ method: '개인', bank: '', holder: '', no: '', memo: '' })
function openAcct() {
  const a = current.value.refundAccount
  acctForm.value = { method: '개인', bank: a?.bank ?? '', holder: a?.holder ?? '', no: a?.no ?? '', memo: '' }
  acctOpen.value = true
}
function saveAcct() {
  if (!acctForm.value.bank || !acctForm.value.holder.trim() || !acctForm.value.no.trim()) return notify('은행 · 예금주 · 계좌번호를 모두 입력하세요.', 'danger')
  current.value.refundAccount = { bank: acctForm.value.bank, holder: acctForm.value.holder, no: acctForm.value.no }
  notify('환불계좌 · 환불수단을 바꿨습니다.', 'success')
  acctOpen.value = false
}

/* --- M5 포인트 사용기한 변경 ------------------------------------------------ */
const untilOpen = ref(false)
const untilDate = ref<Date | null>(null)
const untilReason = ref('')
function saveUntil() {
  if (!untilDate.value) return notify('사용종료일을 선택하세요.', 'danger')
  if (!untilReason.value.trim()) return notify('변경 사유를 입력하세요.', 'danger')
  current.value.useUntil = untilDate.value.toLocaleDateString('ko-KR')
  notify('포인트 사용기한을 바꿨습니다 — 복지몰 회신 뒤 반영됩니다.', 'success')
  untilOpen.value = false
}

/* --- M6 서류 보기 ---------------------------------------------------------- */
const fileOpen = ref(false)
const files = computed<ViewFile[]>(() => current.value.docs)

const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l">
        <h2 class="ws-tit__h"><WsMasked :value="current.name" kind="name" label="성명" /></h2>
        <span class="ws-badge" :class="current.memberSts === '' ? 'ws-badge--success' : current.memberSts === '710' ? 'ws-badge--danger' : 'ws-badge--warning'">{{ MEMBER_LABEL[current.memberSts] }}</span>
        <span class="ws-desc">{{ current.company }} · {{ current.empNo }}</span>
      </div>
      <div class="ws-tit__r">
        <SbCan action="download-pii"><WsDownload :total="1" :limit="1" label="원본 다운로드" modal-code="SP-PRT-030D-M6" /></SbCan>
      </div>
    </div>

    <Tabs v-model:value="tab">
      <TabList>
        <Tab value="basic">기본정보</Tab>
        <Tab value="docs">제출서류</Tab>
        <Tab value="point">포인트현황</Tab>
        <Tab value="usage">이용내역</Tab>
        <Tab value="status">상태관리</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="basic">
          <table class="ws-tb">
            <colgroup><col style="width: 160px" /><col /></colgroup>
            <tbody>
              <tr><th scope="row">성명</th><td><WsMasked :value="current.name" kind="name" label="성명" /></td></tr>
              <tr><th scope="row">생년월일</th><td><WsMasked :value="current.birth" kind="birth" label="생년월일" /></td></tr>
              <tr><th scope="row">휴대폰</th><td><WsMasked :value="current.phone" kind="phone" label="휴대폰" /></td></tr>
              <tr><th scope="row">이메일</th><td><WsMasked :value="current.email" kind="email" label="이메일" /></td></tr>
              <tr><th scope="row">소속 기업</th><td>{{ current.company }} · {{ current.bizNo }}</td></tr>
              <tr><th scope="row">사번</th><td>{{ current.empNo }}</td></tr>
              <tr><th scope="row">복지몰 가입 여부</th><td>{{ current.joined ? '가입' : '미가입' }} <span class="ws-desc">— 복지몰 조회 결과(연계 O)</span></td></tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="docs">
          <div class="ws-tit" style="margin-bottom: 8px">
            <div class="ws-tit__l"><h2 class="ws-tit__h">제출 서류</h2></div>
            <div class="ws-tit__r">
              <SbCan action="update"><Button label="심사보류" severity="secondary" outlined @click="holdOpen = true" /></SbCan>
              <Button label="미리보기" severity="secondary" outlined @click="fileOpen = true" />
            </div>
          </div>
          <table class="ws-gtb">
            <thead><tr><th scope="col">파일명</th><th scope="col">종류</th><th scope="col">크기</th></tr></thead>
            <tbody><tr v-for="d in current.docs" :key="d.name"><td>{{ d.name }}</td><td>{{ d.kind }}</td><td>{{ d.size }}</td></tr></tbody>
          </table>
        </TabPanel>

        <TabPanel value="point">
          <table class="ws-tb">
            <colgroup><col style="width: 160px" /><col /></colgroup>
            <tbody>
              <tr><th scope="row">배정금액</th><td>{{ fmt(current.assigned) }}원</td></tr>
              <tr><th scope="row">사용금액</th><td>{{ fmt(current.used) }}원</td></tr>
              <tr><th scope="row">포인트 잔액</th><td>{{ fmt(current.assigned - current.used) }}원</td></tr>
              <tr>
                <th scope="row">사용기한</th>
                <td>{{ current.useUntil }} <SbCan action="update"><Button label="변경" size="small" severity="secondary" outlined style="margin-left: 8px" @click="untilOpen = true" /></SbCan></td>
              </tr>
              <tr>
                <th scope="row">환불계좌</th>
                <td>
                  <span v-if="current.refundAccount">{{ current.refundAccount.bank }} · <WsMasked :value="current.refundAccount.no" kind="account" label="계좌번호" /> · {{ current.refundAccount.holder }}</span>
                  <span v-else class="ws-desc">등록된 계좌 없음</span>
                  <SbCan action="money"><Button label="계좌 · 수단 변경" size="small" severity="secondary" outlined style="margin-left: 8px" @click="openAcct" /></SbCan>
                </td>
              </tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="usage">
          <table class="ws-gtb">
            <thead><tr><th scope="col">이용일시</th><th scope="col">가맹점</th><th scope="col">이용금액</th></tr></thead>
            <tbody>
              <tr v-if="current.usage.length === 0"><td colspan="3" class="ws-desc" style="text-align: center">이용 내역이 없습니다.</td></tr>
              <tr v-for="(u, i) in current.usage" :key="i"><td>{{ u.at }}</td><td>{{ u.place }}</td><td>{{ fmt(u.amount) }}원</td></tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="status">
          <p class="ws-desc" style="margin-bottom: 12px">현재 회원 상태 — <b>{{ MEMBER_LABEL[current.memberSts] }}</b><span v-if="current.suspendedAt"> · {{ current.suspendedAt }} · {{ current.suspendReason }}</span></p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <SbCan action="status">
              <Button v-if="current.memberSts === ''" label="이용정지" severity="danger" @click="suspendOpen = true" />
              <Button v-else-if="current.memberSts === '710'" label="이용정지 해제" @click="releaseOpen = true" />
              <span v-else class="ws-desc">환불 단계로 넘어간 건은 목록의 이용정지 처리만 가능합니다.</span>
            </SbCan>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <WsActionDialog
      v-model:visible="suspendOpen" code="SP-PRT-030D-M1" header="이용정지 사유 선택"
      :reason="{ label: '사유', options: [...SUSPEND_REASONS], other: '기타', min: 5, max: 33, placeholder: '기타 내용(33자 이내)' }"
      notice="노동자에게 이용정지 안내 LMS · E-Mail이 발송됩니다." confirm-label="이용정지" @confirm="doSuspend"
    />
    <WsActionDialog
      v-model:visible="releaseOpen" code="SP-PRT-030D-M2" header="이용정지 해제"
      :reason="{ label: '해제 사유', required: true, min: 5, max: 200 }"
      notice="노동자에게 이용 재개 안내 LMS가 발송됩니다." confirm-label="해제" @confirm="doRelease"
    />
    <WsActionDialog
      v-model:visible="holdOpen" code="SP-PRT-030D-M3" header="서류 심사보류 사유"
      :reason="{ label: '보완 사유', required: true, min: 5, max: 200 }"
      notice="기업 담당자에게 보완 요청 LMS · E-Mail이 발송됩니다." confirm-label="심사보류" @confirm="doHold"
    />

    <Dialog v-model:visible="acctOpen" modal header="환불계좌 · 환불수단 변경" :style="{ width: '460px' }" :draggable="false">
      <div class="ad">
        <label class="ws-req" for="am-method">환불수단</label>
        <Select id="am-method" v-model="acctForm.method" :options="['기업', '개인', '기업+개인']" fluid />
        <label class="ws-req" for="am-bank">은행</label>
        <Select id="am-bank" v-model="acctForm.bank" :options="['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행']" fluid placeholder="은행 선택" />
        <label class="ws-req" for="am-holder">예금주</label>
        <InputText id="am-holder" v-model="acctForm.holder" fluid maxlength="20" />
        <label class="ws-req" for="am-no">계좌번호</label>
        <InputText id="am-no" v-model="acctForm.no" fluid maxlength="20" />
        <label for="am-memo">변경 메모</label>
        <InputText id="am-memo" v-model="acctForm.memo" fluid maxlength="200" />
      </div>
      <template #footer>
        <SbCode code="SP-PRT-030D-M4" />
        <Button label="취소" severity="secondary" outlined @click="acctOpen = false" />
        <Button label="저장" @click="saveAcct" />
      </template>
    </Dialog>

    <Dialog v-model:visible="untilOpen" modal header="포인트 사용기한 변경" :style="{ width: '420px' }" :draggable="false">
      <div class="ad">
        <label class="ws-req" for="uu-date">사용종료일</label>
        <DatePicker id="uu-date" v-model="untilDate" date-format="yy.mm.dd" show-icon icon-display="input" />
        <label class="ws-req" for="uu-reason">변경 사유</label>
        <InputText id="uu-reason" v-model="untilReason" fluid maxlength="200" />
        <p class="ws-desc">사업 설정 종료일을 넘기면 경고가 뜬다(미리보기는 생략). 복지몰 회신 뒤 반영된다.</p>
      </div>
      <template #footer>
        <SbCode code="SP-PRT-030D-M5" />
        <Button label="취소" severity="secondary" outlined @click="untilOpen = false" />
        <Button label="저장" @click="saveUntil" />
      </template>
    </Dialog>

    <WsFileView v-model:visible="fileOpen" title="제출 서류 미리보기" :files="files" />
  </div>
</template>

<style scoped>
.ad { display: grid; gap: 8px; }
</style>
