<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-070P 참여기업등록 — 누리집을 거치지 않은 참여 기업을 업로드 양식 엑셀로 일괄 등록한다.
 * 업로드 → 행별 검증(M1) → 등록 확정(M2). 시작 상태는 심사중 · 선정완료 둘로 좁힌다.
 */
import { ref } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
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

const cond = ref({ biz: BIZ[0].code, start: '110', path: PATHS[0] })
const fileName = ref<string | null>(null)
const verified = ref(false)
const input = ref<HTMLInputElement | null>(null)

function pick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  fileName.value = f.name
  verified.value = true
  notify(`${f.name}을(를) 검증했습니다.`, 'success')
}

const ok = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '정상').length
const warn = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '경고').length
const err = SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '오류').length
const warnChecked = ref(SAMPLE_UPLOAD_ROWS.filter((r) => r.result === '경고').map(() => false))

const confirmOpen = ref(false)
function openConfirm() {
  if (!verified.value) return notify('먼저 양식 파일을 올려 주세요.', 'warning')
  confirmOpen.value = true
}
function doRegister() {
  const included = ok + warnChecked.value.filter(Boolean).length
  notify(`${included}건을 등록했습니다 — 제외 ${SAMPLE_UPLOAD_ROWS.length - included}건`, 'success')
  confirmOpen.value = false
  verified.value = false
  fileName.value = null
  if (input.value) input.value.value = ''
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><h2 class="ws-tit__h">업로드 양식</h2></div>
      <p class="ws-desc">필수 칸이 표시된 양식을 내려받아 작성한 뒤 올린다. 개인정보가 없는 빈 양식이라 사유 등록 없이 내려받는다.</p>
      <Button label="업로드 양식 내려받기" severity="secondary" outlined @click="notify('업로드 양식을 내려받았습니다(미리보기).')" />
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><h2 class="ws-tit__h">업로드</h2></div>
      <div class="ws-form">
        <div class="ws-form__row"><span class="ws-form__l">대상 사업</span><Select v-model="cond.biz" :options="BIZ" option-label="label" option-value="code" style="width: 260px" /></div>
        <div class="ws-form__row"><span class="ws-form__l">등록 시작 상태</span><Select v-model="cond.start" :options="START_STATES" option-label="l" option-value="v" style="width: 220px" /></div>
        <div class="ws-form__row"><span class="ws-form__l">참여경로</span><Select v-model="cond.path" :options="PATHS" style="width: 200px" /></div>
      </div>
      <SbCan action="create">
        <div class="ws-form__row" style="gap: 8px; margin-top: 8px">
          <input ref="input" type="file" accept=".xls,.xlsx" aria-label="업로드 파일 선택" @change="pick" />
        </div>
      </SbCan>
      <p v-if="fileName" class="ws-desc">{{ fileName }} — 검증 결과는 아래 표를 본다(미리보기 고정 표본).</p>
    </section>

    <section v-if="verified" class="ws-sec">
      <div class="ws-tit">
        <h2 class="ws-tit__h">검증 결과 <SbCode code="SP-PRT-070P-M1" style="margin-left: 8px" /></h2>
        <span class="ws-desc">정상 {{ ok }} · 경고 {{ warn }} · 오류 {{ err }}</span>
      </div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">행</th><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">결과</th><th scope="col">사유</th><th scope="col">포함</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in SAMPLE_UPLOAD_ROWS" :key="r.no">
            <td>{{ r.no }}</td><td>{{ r.name }}</td><td>{{ r.bizNo }}</td>
            <td><span :class="`ws-badge ws-badge--${r.result === '정상' ? 'success' : r.result === '경고' ? 'warning' : 'danger'}`">{{ r.result }}</span></td>
            <td>{{ r.reason || '—' }}</td>
            <td>
              <span v-if="r.result === '정상'">포함</span>
              <span v-else-if="r.result === '오류'" class="ws-desc">제외</span>
              <label v-else style="display: flex; align-items: center; gap: 4px">
                <input type="checkbox" v-model="warnChecked[SAMPLE_UPLOAD_ROWS.filter((x) => x.result === '경고').indexOf(r)]" /> 포함
              </label>
            </td>
          </tr>
        </tbody>
      </table>
      <Button v-if="err" label="오류 행 엑셀 내려받기" severity="secondary" outlined size="small" style="margin-top: 8px" @click="notify('오류 행을 내려받았습니다(미리보기).')" />
      <div style="margin-top: 12px">
        <SbCan action="bulk"><SbCan action="create"><Button label="등록 확정" @click="openConfirm" /></SbCan></SbCan>
      </div>
    </section>

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
      :target="`대상 사업 ${cond.biz} · 시작 상태 ${START_STATES.find((s) => s.v === cond.start)?.l} · 등록 ${ok + warnChecked.filter(Boolean).length}건 · 제외 ${SAMPLE_UPLOAD_ROWS.length - ok - warnChecked.filter(Boolean).length}건`"
      confirm-label="등록" @confirm="doRegister"
    />
  </div>
</template>
