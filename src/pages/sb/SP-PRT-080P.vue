<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-080P 일괄참여취소 — 기한 안에 보완 · 명단등록 · 분담금 납부를 하지 않은 참여 건을
 * 조건으로 모아 한 번에 참여취소한다. 조건 → 대상 확인 → 예외 지정 → 실행 결과.
 * 예외 처리 기업을 뺀 뒤 드라이런(M2) → 건수 직접 입력 → 실행.
 */
import { computed, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import PageHead from '../../app/PageHead.vue'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import { notify } from '../../ws/notify'
import { stateOf, BIZ } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { applications } from '@fixtures/sb/common'
import { participations, CANCEL_RUNS } from '@fixtures/sb/B3'

const CODE = 'SP-PRT-080P'
const CONDS = [
  { v: '130', l: '보완필요', desc: '보완요청을 받고도 기한 안에 보완 제출을 하지 않은 신청 건', to: '139' },
  { v: '220', l: '선정완료 참여회원 미등록', desc: '선정 뒤 참여 노동자 명단을 등록하지 않은 신청 건', to: '139' },
  { v: '510', l: '분담금 미입금', desc: '등록승인 뒤 입금기한이 지났는데 분담금을 넣지 않은 참여 건', to: '590' },
]
type Row = { id: string; name: string; bizNo: string; coFg: string; no: string; date: string; sts: string; paid: number }

const step = ref(0)
const cond = ref('')
const biz = ref(BIZ[0].code)

function rowsOf(): Row[] {
  if (cond.value === '130') return applications(biz.value).filter((a) => a.sts === '130').map((a) => ({ id: a.id, name: a.name, bizNo: a.bizNo, coFg: a.coFg, no: a.applyNo, date: a.appliedAt.slice(0, 10), sts: a.sts, paid: 0 }))
  if (cond.value === '220') return applications(biz.value).filter((a) => a.sts === '220').map((a) => ({ id: a.id, name: a.name, bizNo: a.bizNo, coFg: a.coFg, no: a.applyNo, date: a.appliedAt.slice(0, 10), sts: a.sts, paid: 0 }))
  if (cond.value === '510') return participations(biz.value).filter((p) => p.sts === '510').map((p) => ({ id: p.id, name: p.name, bizNo: p.bizNo, coFg: p.coFg, no: p.id, date: p.depositDeadline ?? '', sts: p.sts, paid: p.vAccount.paid }))
  return []
}
const target = ref<Row[]>([])
const exceptions = ref<{ row: Row; reason: string }[]>([])

function search() {
  if (!cond.value) return notify('취소 조건을 고르세요.', 'danger')
  target.value = rowsOf()
  exceptions.value = target.value.filter((r) => r.paid > 0).map((r) => ({ row: r, reason: '경고: 입금 내역 있음' }))
  step.value = 1
}
function toggleException(r: Row) {
  const i = exceptions.value.findIndex((e) => e.row.id === r.id)
  if (i >= 0) exceptions.value.splice(i, 1)
  else exceptions.value.push({ row: r, reason: '운영자 지정' })
}
const included = computed(() => target.value.filter((r) => !exceptions.value.some((e) => e.row.id === r.id)))

/* --- 예외 기업 직접 등록(M1) ------------------------------------------------- */
const excOpen = ref(false)
const excReason = ref('')
function addManualException() {
  if (!excReason.value.trim()) return notify('예외 사유를 입력하세요.', 'danger')
  notify('예외 처리 기업을 등록했습니다(미리보기 — 목록에 없는 기업은 조회 대상에 반영되지 않습니다).', 'success')
  excOpen.value = false
  excReason.value = ''
}

/* --- 드라이런 · 실행(M2) ----------------------------------------------------- */
const dryOpen = ref(false)
const dryDone = ref(false)
const inputCountText = ref('')
const inputCount = computed(() => (inputCountText.value.trim() === '' ? null : Number(inputCountText.value)))
function dryRun() {
  if (!included.value.length) return notify('취소 대상이 없습니다.', 'warning')
  dryOpen.value = true
  dryDone.value = true
  inputCountText.value = ''
}
const canExecute = computed(() => dryDone.value && inputCount.value === included.value.length)
const auditId = ref('')
const result = ref<{ open: boolean; ok: number; fails: ResultItem[] }>({ open: false, ok: 0, fails: [] })
function execute() {
  const toCode = CONDS.find((c) => c.v === cond.value)!.to
  included.value.forEach(() => {})
  auditId.value = `AUD-${Date.now().toString(36).toUpperCase()}`
  result.value = { open: true, ok: included.value.length, fails: [] }
  dryOpen.value = false
  notify(`${included.value.length}건을 ${stateOf(toCode)?.label}(으)로 처리했습니다.`, 'success')
  step.value = 3
  target.value = []
  exceptions.value = []
  dryDone.value = false
}
function restart() { step.value = 0; cond.value = ''; target.value = []; exceptions.value = [] }
const fmt = (n: number) => n.toLocaleString('ko-KR')
const condLabel = computed(() => CONDS.find((c) => c.v === cond.value)?.l ?? '')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <WsStepTrack :steps="[{ label: '조건' }, { label: '대상 확인' }, { label: '예외 지정' }, { label: '실행 결과' }]" :current="step" label="일괄참여취소 단계" />
    </section>

    <template v-if="step === 0">
      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">취소 조건 조회</h2></div>
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row" class="req"><label for="bc-biz">사업</label></th><td><Select v-model="biz" input-id="bc-biz" :options="BIZ" option-label="label" option-value="code" fluid /></td></tr>
            <tr>
              <th scope="row" class="req"><label for="bc-cond">취소 조건</label></th>
              <td>
                <Select v-model="cond" input-id="bc-cond" :options="CONDS" option-label="l" option-value="v" placeholder="조건을 고르세요" fluid />
                <span v-if="cond" class="ws-desc">{{ CONDS.find((c) => c.v === cond)?.desc }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c"><SbCan action="view"><Button label="조회" @click="search" /></SbCan></div></div>
    </template>

    <template v-if="step === 1">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">대상 확인</h2><span class="ws-total">총<strong>{{ fmt(target.length) }}</strong>건 · 자동 예외 {{ exceptions.length }}건</span></div></div>
        <p class="ws-desc">{{ condLabel }} — 입금 내역이 있는 건은 자동으로 예외에 올라간다(다음 단계에서 조정한다).</p>
        <table class="ws-gtb">
          <thead><tr><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">신청·건번호</th><th scope="col">기준일</th><th scope="col">자동 예외</th></tr></thead>
          <tbody>
            <tr v-for="r in target" :key="r.id">
              <td>{{ r.name }}</td><td>{{ r.bizNo }}</td><td>{{ r.no }}</td><td>{{ r.date }}</td>
              <td><span v-if="exceptions.some((e) => e.row.id === r.id)" class="ws-badge ws-badge--warning">예외</span></td>
            </tr>
            <tr v-if="!target.length"><td colspan="5" class="ws-desc" style="text-align: center">대상이 없습니다.</td></tr>
          </tbody>
        </table>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="조건 다시 고르기" severity="secondary" outlined @click="step = 0" />
        <Button label="다음 — 예외 지정" :disabled="!target.length" @click="step = 2" />
      </div></div>
    </template>

    <template v-if="step === 2">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">예외 지정</h2><span class="ws-total">예외 {{ exceptions.length }}건 · 취소 대상 {{ included.length }}건</span></div>
          <div class="ws-tit__r"><SbCan action="status"><Button label="예외 처리 기업 직접 등록" severity="secondary" outlined class="ws-line" @click="excOpen = true" /></SbCan></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">신청·건번호</th><th scope="col">기준일</th><th scope="col">예외</th></tr></thead>
          <tbody>
            <tr v-for="r in target" :key="r.id">
              <td>{{ r.name }}</td><td>{{ r.bizNo }}</td><td>{{ r.no }}</td><td>{{ r.date }}</td>
              <td>
                <SbCan action="status">
                  <label class="ws-check"><input type="checkbox" :checked="exceptions.some((e) => e.row.id === r.id)" @change="toggleException(r)" /> 예외</label>
                </SbCan>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="exceptions.length" class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">예외 처리 기업</h2></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">기업명</th><th scope="col">사유</th></tr></thead>
          <tbody><tr v-for="e in exceptions" :key="e.row.id"><td>{{ e.row.name }}</td><td>{{ e.reason }}</td></tr></tbody>
        </table>
      </section>

      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="이전" severity="secondary" outlined @click="step = 1" />
        <SbCan action="bulk"><SbCan action="status"><Button label="드라이런" :disabled="!included.length" @click="dryRun" /></SbCan></SbCan>
      </div></div>
    </template>

    <template v-if="step === 3">
      <section class="ws-sec">
        <p class="ws-callout"><b>완료</b> {{ fmt(result.ok) }}건을 취소했다. 감사 기록 <code>{{ auditId }}</code>.</p>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="결과 다시 보기" severity="secondary" outlined @click="result.open = true" />
        <Button label="새로 시작" @click="restart" />
      </div></div>
    </template>

    <section class="ws-sec">
      <div class="ws-tit"><h2 class="ws-tit__h">실행 기록</h2></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">일시</th><th scope="col">실행자</th><th scope="col">조건</th><th scope="col">취소</th><th scope="col">예외</th></tr></thead>
        <tbody><tr v-for="r in CANCEL_RUNS" :key="r.id"><td>{{ r.at }}</td><td>{{ r.by }}</td><td>{{ r.cond }}</td><td>{{ r.total }}</td><td>{{ r.excluded }}</td></tr></tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>드라이런 · 실행은 <b>상태 변경 + 일괄</b> 권한(마스터)만 켜진다. {{ denyTip(CODE, 'bulk') || denyTip(CODE, 'status') }}</li>
        <li>실행은 되돌릴 수 없다 — 취소된 건을 살리는 기능은 두지 않는다.</li>
        <li>입금액이 있는 분담금 미입금 대상은 기본으로 예외에 올라간다(경고).</li>
      </ul>
    </div>

    <Dialog v-model:visible="excOpen" modal header="예외 처리 기업 등록" :style="{ width: '420px' }" :draggable="false">
      <label for="ex-why" class="ws-req">예외 사유</label>
      <Textarea id="ex-why" v-model="excReason" rows="3" fluid maxlength="200" placeholder="예: 입금 확인 진행 중" />
      <template #footer>
        <SbCode code="SP-PRT-080P-M1" />
        <Button label="취소" severity="secondary" outlined @click="excOpen = false" />
        <Button label="등록" @click="addManualException" />
      </template>
    </Dialog>

    <Dialog v-model:visible="dryOpen" modal header="드라이런 · 실행 확인" :style="{ width: '460px' }" :draggable="false">
      <table class="ws-tb">
        <colgroup><col style="width: 120px" /><col /></colgroup>
        <tbody>
          <tr><th scope="row">조건</th><td>{{ CONDS.find((c) => c.v === cond)?.l }}</td></tr>
          <tr><th scope="row">취소 건수</th><td>{{ included.length }}건</td></tr>
          <tr><th scope="row">결과 상태</th><td>{{ stateOf(CONDS.find((c) => c.v === cond)?.to ?? '')?.label }}</td></tr>
          <tr><th scope="row">예외 건수</th><td>{{ exceptions.length }}건</td></tr>
        </tbody>
      </table>
      <label for="dry-cnt" class="ws-req" style="display: block; margin-top: 12px">취소 건수 직접 입력 — 드라이런 건수({{ included.length }})와 같아야 실행됩니다</label>
      <InputText id="dry-cnt" v-model="inputCountText" inputmode="numeric" fluid />
      <p v-if="inputCount !== null && inputCount !== included.length" class="ws-err" role="alert">드라이런 건수({{ included.length }})와 같게 입력하세요.</p>
      <template #footer>
        <SbCode code="SP-PRT-080P-M2" />
        <Button label="취소" severity="secondary" outlined @click="dryOpen = false" />
        <Button label="실행" severity="danger" :disabled="!canExecute" @click="execute" />
      </template>
    </Dialog>

    <WsResultDialog v-model:visible="result.open" header="일괄참여취소 실행 결과" :ok="result.ok" :fails="result.fails" :audit-id="auditId" />
    <SbCode code="SP-PRT-080P-M3" style="display: none" />
  </div>
</template>
