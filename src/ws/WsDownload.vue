<script setup lang="ts">
/**
 * 엑셀 내려받기 — 건수 상한 · 재인증 · 사유 등록 세 관문.
 *
 * AS-IS 전 화면 공통 모듈(C-001)을 버튼 하나로 싼다. 화면은 건수와 상한만 넘긴다.
 *   ① 0건이면 막는다               "다운로드할 목록이 없습니다."
 *   ② 상한을 넘으면 막는다          화면마다 1만 · 2만 · 5만 — 버튼 옆에 미리 적는다
 *   ③ 세션에서 처음이면 재인증
 *   ④ 개인정보 다운로드 사유 등록   선택 3 + 직접 입력(10~200자)
 * AS-IS는 ②를 누른 뒤에야 알린다. 상한은 버튼 옆 설명으로 먼저 보인다.
 */
import { ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import WsActionDialog, { type ActionPayload } from './WsActionDialog.vue'
import { notify } from './notify'

/** modalCode — SB 사유 모달 코드(푸터 왼쪽에 표시). 공통 사유 모달은 SP-CMN-040D, 화면 명세의 모달이면 `<CODE>-M1` */
const props = withDefaults(defineProps<{ total: number; limit?: number; label?: string; modalCode?: string }>(), { limit: 10_000, label: '엑셀 다운로드' })

/** 재인증은 세션 단위 — 모듈 상태로 둔다(화면을 옮겨도 다시 묻지 않는다) */
const authed = ref(sessionAuthed)
const authOpen = ref(false)
const reasonOpen = ref(false)
const code = ref('')

function start() {
  if (props.total === 0) return notify('다운로드할 목록이 없습니다.', 'warning')
  if (props.total > props.limit) return notify(`${props.limit.toLocaleString('ko-KR')}건을 넘으면 내려받을 수 없습니다. 조건을 좁혀 주세요.`, 'danger')
  if (!authed.value) { code.value = ''; authOpen.value = true; return }
  reasonOpen.value = true
}
function verify() {
  sessionAuthed = authed.value = true
  authOpen.value = false
  reasonOpen.value = true
}
function done(p: ActionPayload) {
  notify(`${props.total.toLocaleString('ko-KR')}건 내려받기를 요청했습니다 — 사유: ${p.option === '직접 입력' ? p.text : p.option}`, 'success')
}
</script>

<script lang="ts">
let sessionAuthed = false
</script>

<template>
  <span class="dl">
    <span class="ws-desc">최대 {{ limit.toLocaleString('ko-KR') }}건</span>
    <Button :label="label" severity="secondary" outlined class="ws-line" @click="start" />
  </span>

  <Dialog v-model:visible="authOpen" modal header="다운로드 인증" :style="{ width: '400px' }" :draggable="false">
    <p style="margin-bottom: 12px">개인정보가 담긴 파일이라 본인 확인이 필요합니다. 등록된 휴대폰으로 보낸 6자리를 입력하세요.</p>
    <label for="dl-code" class="ws-req" style="display: block; margin-bottom: 6px">인증번호</label>
    <InputText id="dl-code" v-model="code" inputmode="numeric" maxlength="6" fluid placeholder="아무 6자리(미리보기)" />
    <template #footer>
      <Button label="취소" severity="secondary" outlined @click="authOpen = false" />
      <Button label="확인" :disabled="code.length !== 6" @click="verify" />
    </template>
  </Dialog>

  <WsActionDialog
    v-model:visible="reasonOpen"
    header="개인정보 다운로드 사유 등록"
    :code="modalCode"
    :target="`${total.toLocaleString('ko-KR')}건 — 사유는 반출 기록에 남습니다`"
    :reason="{ label: '다운로드 사유', options: ['고객사관리자 업무요청', '내부 업무(정산·통계·CS)', '협력사 제공', '직접 입력'], other: '직접 입력', min: 10, max: 200, placeholder: '10자 이상' }"
    confirm-label="등록 후 내려받기"
    @confirm="done"
  />
</template>

<style scoped>
.dl { flex: none; display: inline-flex; align-items: center; gap: 8px; }
</style>
