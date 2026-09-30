<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-080P 일괄참여취소 — 기한 안에 보완 · 명단등록 · 분담금 납부를 하지 않은 참여 건을
 * 조건으로 모아 한 번에 참여취소한다. 예외 처리 기업을 뺀 뒤 드라이런 → 건수 직접 입력 → 실행.
 */
import { computed, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import PageHead from '../../app/PageHead.vue'
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

const cond = ref('')
const biz = ref(BIZ[0].code)
const done = ref(false)
const searched = ref(false)

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
  searched.value = true
  done.value = false
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
  dryDone.value = true
  inputCountText.value = ''
}
const canExecute = computed(() => dryDone.value && inputCount.value === included.value.length)
const result = ref<{ open: boolean; ok: number; fails: ResultItem[] }>({ open: false, ok: 0, fails: [] })
function execute() {
  const toCode = CONDS.find((c) => c.v === cond.value)!.to
  included.value.forEach(() => {})
  result.value = { open: true, ok: included.value.length, fails: [] }
  dryOpen.value = false
  done.value = true
  target.value = []
  exceptions.value = []
  dryDone.value = false
  notify(`${included.value.length}건을 ${stateOf(toCode)?.label}(으)로 처리했습니다.`, 'success')
}
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><h2 class="ws-tit__h">취소 조건 조회</h2></div>
      <div class="ws-form">
        <div class="ws-form__row"><span class="ws-form__l">사업</span><Select v-model="biz" :options="BIZ" option-label="label" option-value="code" style="width: 260px" /></div>
        <div class="ws-form__row">
          <span class="ws-form__l">취소 조건</span>
          <Select v-model="cond" :options="CONDS" option-label="l" option-value="v" placeholder="조건을 고르세요" style="width: 260px" />
        </div>
      </div>
      <p v-if="cond" class="ws-desc">{{ CONDS.find((c) => c.v === cond)?.desc }}</p>
      <SbCan action="view"><Button label="조회" style="margin-top: 8px" @click="search" /></SbCan>
    </section>

    <template v-if="searched">
      <section class="ws-sec">
        <div class="ws-tit">
          <h2 class="ws-tit__h">조회 결과</h2>
          <span class="ws-total">총<strong>{{ fmt(target.length) }}</strong>건 · 예외 {{ exceptions.length }}건 · 취소 대상 {{ included.length }}건</span>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">신청·건번호</th><th scope="col">기준일</th><th scope="col">예외</th></tr></thead>
          <tbody>
            <tr v-for="r in target" :key="r.id">
              <td>{{ r.name }}</td><td>{{ r.bizNo }}</td><td>{{ r.no }}</td><td>{{ r.date }}</td>
              <td>
                <SbCan action="status">
                  <label style="display: flex; align-items: center; gap: 4px">
                    <input type="checkbox" :checked="exceptions.some((e) => e.row.id === r.id)" @change="toggleException(r)" /> 예외
                  </label>
                </SbCan>
              </td>
            </tr>
            <tr v-if="!target.length"><td colspan="5" class="ws-desc" style="text-align: center">대상이 없습니다.</td></tr>
          </tbody>
        </table>
      </section>

      <section v-if="exceptions.length" class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">예외 처리 기업</h2></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">기업명</th><th scope="col">사유</th></tr></thead>
          <tbody><tr v-for="e in exceptions" :key="e.row.id"><td>{{ e.row.name }}</td><td>{{ e.reason }}</td></tr></tbody>
        </table>
        <SbCan action="status"><Button label="예외 기업 직접 등록" severity="secondary" outlined size="small" style="margin-top: 8px" @click="excOpen = true" /></SbCan>
      </section>

      <div style="margin: 16px 0">
        <SbCan action="bulk"><SbCan action="status"><Button label="드라이런" @click="dryOpen = true; dryRun()" /></SbCan></SbCan>
      </div>
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
      <div class="ws-form">
        <div class="ws-form__row"><span class="ws-form__l">조건</span><span>{{ CONDS.find((c) => c.v === cond)?.l }}</span></div>
        <div class="ws-form__row"><span class="ws-form__l">취소 건수</span><span>{{ included.length }}건</span></div>
        <div class="ws-form__row"><span class="ws-form__l">결과 상태</span><span>{{ stateOf(CONDS.find((c) => c.v === cond)?.to ?? '')?.label }}</span></div>
        <div class="ws-form__row"><span class="ws-form__l">예외 건수</span><span>{{ exceptions.length }}건</span></div>
      </div>
      <label for="dry-cnt" class="ws-req" style="display: block; margin-top: 12px">취소 건수 직접 입력 — 드라이런 건수({{ included.length }})와 같아야 실행됩니다</label>
      <InputText id="dry-cnt" v-model="inputCountText" inputmode="numeric" fluid />
      <p v-if="inputCount !== null && inputCount !== included.length" class="ws-err" role="alert">드라이런 건수({{ included.length }})와 같게 입력하세요.</p>
      <template #footer>
        <SbCode code="SP-PRT-080P-M2" />
        <Button label="취소" severity="secondary" outlined @click="dryOpen = false" />
        <Button label="실행" severity="danger" :disabled="!canExecute" @click="execute" />
      </template>
    </Dialog>

    <WsResultDialog v-model:visible="result.open" header="일괄참여취소 실행 결과" :ok="result.ok" :fails="result.fails" />
    <SbCode code="SP-PRT-080P-M3" style="display: none" />
  </div>
</template>
