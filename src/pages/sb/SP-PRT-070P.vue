<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-070P 참여기업등록 — 누리집을 거치지 않은 참여 기업을 업로드 양식 엑셀로 일괄 등록한다.
 * 양식 · 조건 → 올리기 → 검증 결과(M1, 행별) → 등록 결과. 시작 상태는 심사중 · 선정완료 둘로 좁힌다.
 */
import { ref } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsUpload from '../../ws/WsUpload.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import { notify } from '../../ws/notify'
import { BIZ } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { SAMPLE_UPLOAD_ROWS, UPLOAD_RUNS } from '@fixtures/sb/B3'

const CODE = 'SP-PRT-070P'
const START_STATES = [{ v: '110', l: '심사중' }, { v: '220', l: '선정완료(외부 선정)' }]
const PATHS = ['기타', '지역 연계', '동반성장 협력']

const step = ref(0)
const cond = ref({ biz: BIZ[0].code, start: '110', path: PATHS[0] })
const file = ref<File | null>(null)
const checking = ref(false)

function runCheck() {
  checking.value = true
  setTimeout(() => { checking.value = false; step.value = 2 }, 400)
}

const ok = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '정상').length
const warn = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '경고').length
const err = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '오류').length
const warnRows = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '경고')
const warnChecked = ref(warnRows.map(() => false))
const included = () => ok + warnChecked.value.filter(Boolean).length

const confirmOpen = ref(false)
function openConfirm() { confirmOpen.value = true }

const done = ref(0)
function doRegister() {
  done.value = included()
  notify(`${done.value}건을 등록했습니다 — 제외 ${SAMPLE_UPLOAD_ROWS.length - done.value}건`, 'success')
  confirmOpen.value = false
  step.value = 3
}
function restart() {
  step.value = 0
  file.value = null
  checking.value = false
  warnChecked.value = warnRows.map(() => false)
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <WsStepTrack :steps="[{ label: '양식 · 조건' }, { label: '올리기' }, { label: '검증 결과', sub: '행별 결과' }, { label: '등록 결과' }]" :current="step" label="참여기업등록 단계" />
    </section>

    <template v-if="step === 0">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">업로드 양식과 등록 조건</h2></div>
          <div class="ws-tit__r"><Button label="업로드 양식 내려받기" severity="secondary" outlined class="ws-line" @click="notify('업로드 양식을 내려받았습니다(미리보기).')" /></div>
        </div>
        <p class="ws-desc">필수 칸이 표시된 양식을 내려받아 작성한 뒤 올린다. 개인정보가 없는 빈 양식이라 사유 등록 없이 내려받는다.</p>
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row" class="req"><label for="pf-biz">대상 사업</label></th><td><Select v-model="cond.biz" input-id="pf-biz" :options="BIZ" option-label="label" option-value="code" fluid /></td></tr>
            <tr><th scope="row" class="req"><label for="pf-start">등록 시작 상태</label></th><td><Select v-model="cond.start" input-id="pf-start" :options="START_STATES" option-label="l" option-value="v" fluid /></td></tr>
            <tr><th scope="row" class="req"><label for="pf-path">참여경로</label></th><td><Select v-model="cond.path" input-id="pf-path" :options="PATHS" fluid /></td></tr>
          </tbody>
        </table>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c"><Button label="다음 — 파일 올리기" @click="step = 1" /></div></div>
    </template>

    <template v-if="step === 1">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">파일 올리기</h2><span class="ws-desc">{{ START_STATES.find((s) => s.v === cond.start)?.l }} · {{ cond.path }}으로 등록</span></div></div>
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /></colgroup>
          <tbody>
            <tr>
              <th scope="row" class="req"><label for="pf-f">엑셀 파일</label></th>
              <td><SbCan action="create"><WsUpload id="pf-f" v-model="file" :accept="['xlsx', 'xls']" :max-kb="5120" /></SbCan></td>
            </tr>
          </tbody>
        </table>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="이전" severity="secondary" outlined @click="step = 0" />
        <Button :label="checking ? '검사 중…' : '검증하기'" :loading="checking" :disabled="!file" @click="runCheck" />
      </div></div>
    </template>

    <template v-if="step === 2">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">검증 결과 <SbCode code="SP-PRT-070P-M1" style="margin-left: 8px" /></h2><span class="ws-total">정상 {{ ok }} · 경고 {{ warn }} · 오류 {{ err }}</span></div>
          <div v-if="err" class="ws-tit__r"><Button label="오류 행 엑셀 내려받기" severity="secondary" outlined class="ws-line" @click="notify('오류 행을 내려받았습니다(미리보기).')" /></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">행</th><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">결과</th><th scope="col">사유</th><th scope="col">포함</th></tr></thead>
          <tbody>
            <tr v-for="r in SAMPLE_UPLOAD_ROWS" :key="r.no">
              <td class="ws-num">{{ r.no }}</td><td>{{ r.name }}</td><td>{{ r.bizNo }}</td>
              <td><span :class="`ws-badge ws-badge--${r.result === '정상' ? 'success' : r.result === '경고' ? 'warning' : 'danger'}`">{{ r.result }}</span></td>
              <td>{{ r.reason || '—' }}</td>
              <td>
                <span v-if="r.result === '정상'">포함</span>
                <span v-else-if="r.result === '오류'" class="ws-desc">제외</span>
                <label v-else class="ws-check"><input type="checkbox" v-model="warnChecked[warnRows.indexOf(r)]" /> 포함</label>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="고쳐서 다시 올리기" severity="secondary" outlined @click="step = 1; file = null" />
        <SbCan action="bulk"><SbCan action="create"><Button label="등록 확정" @click="openConfirm" /></SbCan></SbCan>
      </div></div>
    </template>

    <template v-if="step === 3">
      <section class="ws-sec">
        <p class="ws-callout"><b>완료</b> {{ done }}건을 등록했다. 제외 {{ SAMPLE_UPLOAD_ROWS.length - done }}건. 등록한 건은 신청목록(SP-PRT-010L)에서 이어서 심사한다.</p>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c"><Button label="새로 올리기" @click="restart" /></div></div>
    </template>

    <section class="ws-sec">
      <div class="ws-tit"><h2 class="ws-tit__h">최근 등록 실행 이력</h2></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">일시</th><th scope="col">실행자</th><th scope="col">파일</th><th scope="col">등록</th><th scope="col">제외</th></tr></thead>
        <tbody><tr v-for="r in UPLOAD_RUNS" :key="r.id"><td>{{ r.at }}</td><td>{{ r.by }}</td><td>{{ r.file }}</td><td>{{ r.ok }}</td><td>{{ r.excluded }}</td></tr></tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>업로드 · 확정은 <b>등록 + 일괄</b> 권한(총괄 이상)이 있어야 켜진다. {{ denyTip(CODE, 'create') || denyTip(CODE, 'bulk') }}</li>
        <li>오류 행은 등록하지 않는다 — 부분 등록만 한다. 경고 행(참여불가 기업 등)은 기본으로 제외되어 있다.</li>
        <li>등록된 건은 신청목록(SP-PRT-010L)에서 이어서 심사한다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="confirmOpen" code="SP-PRT-070P-M2" header="등록 확정"
      :target="`대상 사업 ${cond.biz} · 시작 상태 ${START_STATES.find((s) => s.v === cond.start)?.l} · 등록 ${included()}건 · 제외 ${SAMPLE_UPLOAD_ROWS.length - included()}건`"
      confirm-label="등록" @confirm="doRegister"
    />
  </div>
</template>
