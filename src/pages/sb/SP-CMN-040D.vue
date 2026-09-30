<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CMN-040D 엑셀 다운로드 사유 등록 — 개인정보 다운로드 공통 틀(WsDownload가 이미 쓰는 모달) 자체를 보여 준다.
 * 건수 · 업무시간 · 상한을 바꿔 가며 사유 확인 대상 경고(REQ-08) · 상한 초과(REQ-09)를 재현한다.
 */
import { computed, ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import PageHead from '../../app/PageHead.vue'
import WsDownload from '../../ws/WsDownload.vue'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { PII_LOGS } from '@fixtures/sb/B1'

const CODE = 'SP-CMN-040D'
const total = ref(1200)
const outOfHours = ref(false)
const limit = 20_000
const flagged = computed(() => outOfHours.value || total.value > 1000)

/** 최근 이 공통 모달을 거친 기록 — 개인정보 접근이력(SP-SYS-021P)에서 다운로드 행만 */
const recent = computed(() => PII_LOGS.filter((p) => p.action === '다운로드').slice(0, 8))
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">다운로드 사유 등록 — 미리보기</h2></div></div>
      <p class="ws-desc" style="margin-bottom: 14px">
        각 목록 화면의 <b>개인정보 다운로드</b> 버튼이 부르는 공통 모달이다(WsDownload). 건수를 바꿔 세 관문(상한 · 재인증 · 사유)을 확인한다.
      </p>

      <div class="cmn-dl__demo">
        <div class="cmn-dl__row">
          <label for="d-total" class="ws-req">가정 건수</label>
          <InputNumber id="d-total" v-model="total" :min="0" :max="30000" show-buttons />
        </div>
        <div class="cmn-dl__row">
          <Checkbox v-model="outOfHours" input-id="d-oh" binary />
          <label for="d-oh">업무시간 밖(사유 확인 대상 가정, REQ-08)</label>
        </div>
        <p v-if="flagged" class="ws-desc" style="color: var(--ws-text-warning)">사유 확인 대상 — 개인정보 접근이력에 표시가 남고 마스터가 나중에 확인한다(SP-SYS-021P).</p>
        <p v-if="total > limit" class="ws-err">{{ limit.toLocaleString('ko-KR') }}건을 넘으면 파일을 만들지 않는다(REQ-09) — 조건을 좁혀야 한다.</p>

        <SbCan action="download-pii" :code="CODE">
          <WsDownload :total="total" :limit="limit" modal-code="SP-CMN-040D-M1" />
        </SbCan>
        <span v-if="!can(CODE, 'download-pii')" class="ws-desc">{{ denyTip(CODE, 'download-pii') }}</span>
        <p class="ws-desc cmn-dl__m2">세션에서 처음 내려받을 때는 재인증 모달이 먼저 뜬다 — <SbCode code="SP-CMN-040D-M2" /> (WsDownload 내장, 코드를 표시할 자리가 없어 여기 적는다)</p>
      </div>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">최근 다운로드 이력</h2><span class="ws-desc">개인정보 접근이력(SP-SYS-021P)과 같은 기록</span></div></div>
      <table class="cmn-dl__tbl">
        <thead><tr><th>일시</th><th>사용자</th><th>화면</th><th>사유</th><th>건수</th><th>확인 대상</th></tr></thead>
        <tbody>
          <tr v-for="p in recent" :key="p.id">
            <td>{{ p.at }}</td><td>{{ p.adminName }}</td><td>{{ p.screen }}</td><td>{{ p.reason }}</td>
            <td style="text-align:right">{{ p.count.toLocaleString('ko-KR') }}</td>
            <td>{{ p.flagged ? 'O' : '' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>재인증은 세션 단위 — 한 번 인증하면 다른 화면에서도 다시 묻지 않는다(미리보기 값도 그렇다).</li>
        <li>사유 등록 뒤에야 파일을 내려준다(REQ-05) — 이력 저장이 먼저다.</li>
        <li>이 계정에 개인정보 다운로드 권한이 없으면 버튼이 꺼지고 툴팁이 뜬다(REQ-10) — 상단 역할을 바꿔 확인한다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cmn-dl__demo { display: grid; gap: 12px; max-width: 480px; }
.cmn-dl__row { display: flex; align-items: center; gap: 10px; }
.cmn-dl__tbl { width: 100%; border-collapse: collapse; font-size: var(--ws-font-size-sm); }
.cmn-dl__tbl th, .cmn-dl__tbl td { padding: 8px 10px; border-bottom: 1px solid var(--ws-border); text-align: left; }
.cmn-dl__tbl th { color: var(--ws-text-sub); font-weight: 600; }
</style>
