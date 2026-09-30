<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CMN-010P 관리자로그인 — 1차(ID·비밀번호) + 2차 인증. 실제 인증 없음 — 아무 값이나 통과한다(미리보기).
 * 계정 상태(휴면·잠금·사용중지)에 따라 로그인을 막는 흐름을 버튼 세 개로 흉내 낸다.
 */
import { computed, ref } from 'vue'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'

type Demo = '정상' | '휴면' | '잠금' | '사용중지' | '임시 비밀번호'
const id = ref('op001')
const pw = ref('')
const saveId = ref(true)
const demo = ref<Demo>('정상')
const step = ref<'1차' | '2차'>('1차')
const code2 = ref('')
const findOpen = ref(false)
const pwChangeOpen = ref(false)
const failCount = ref(0)
const pw1 = ref('')
const pw2 = ref('')

const blockMsg: Record<Exclude<Demo, '정상' | '임시 비밀번호'>, string> = {
  휴면: '6개월 이상 접속이 없어 휴면 상태입니다 — 본인인증으로 해제하세요.',
  잠금: '비밀번호 5회 오류로 잠겼습니다 — 비밀번호 찾기로 해제하세요.',
  사용중지: '사용중지된 계정입니다 — 소속 마스터에게 문의하세요.',
}

function submit1() {
  if (demo.value === '휴면' || demo.value === '잠금' || demo.value === '사용중지') {
    return notify(blockMsg[demo.value], 'danger', 5000)
  }
  step.value = '2차'
  notify('등록된 이메일로 인증번호를 보냈습니다(미리보기 — 아무 값이나 입력).', 'info')
}
function submit2() {
  if (!code2.value.trim()) { failCount.value++; return notify('인증번호를 입력하세요.', 'danger') }
  if (demo.value === '임시 비밀번호') { pwChangeOpen.value = true; return }
  notify('로그인했습니다 — 메인(SP-CMN-050P)으로 이동합니다.', 'success')
  step.value = '1차'
}
const pwRuleOk = computed(() => pw1.value.length >= 8 && pw1.value === pw2.value)
function changePw() {
  if (!pwRuleOk.value) return notify('영문·숫자·특수문자 조합 8자 이상, 확인값이 같아야 합니다.', 'danger')
  pwChangeOpen.value = false
  notify('비밀번호를 바꿨습니다 — 메인으로 이동합니다.', 'success')
  step.value = '1차'
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <div class="cmn-login">
      <section class="cmn-login__card">
        <h2 class="ws-tit__h" style="margin-bottom: 4px">지원 사업 운영 어드민</h2>
        <p class="ws-desc" style="margin-bottom: 18px">지원기관 · 운영사 운영 계정으로 로그인합니다. 관리 기능을 시사하는 이름은 쓰지 않습니다(REQ-14).</p>

        <template v-if="step === '1차'">
          <div class="cmn-login__row">
            <label for="l-id" class="ws-req">아이디</label>
            <InputText id="l-id" v-model="id" fluid />
          </div>
          <div class="cmn-login__row">
            <label for="l-pw" class="ws-req">비밀번호</label>
            <Password id="l-pw" v-model="pw" fluid :feedback="false" toggle-mask />
          </div>
          <div class="cmn-login__chk">
            <Checkbox v-model="saveId" input-id="l-save" binary />
            <label for="l-save">아이디 저장</label>
          </div>
          <Button label="로그인" fluid @click="submit1" />
          <div class="cmn-login__links">
            <button type="button" class="ws-link" @click="findOpen = true">비밀번호 찾기</button>
          </div>
        </template>

        <template v-else>
          <p class="ws-desc" style="margin-bottom: 10px">등록된 이메일 · 휴대폰으로 인증번호를 보냈습니다(미리보기).</p>
          <div class="cmn-login__row">
            <label for="l-code" class="ws-req">인증번호</label>
            <InputText id="l-code" v-model="code2" fluid placeholder="아무 값이나(미리보기)" />
          </div>
          <Button label="인증하고 로그인" fluid @click="submit2" />
          <div class="cmn-login__links">
            <button type="button" class="ws-link" @click="step = '1차'">뒤로</button>
          </div>
        </template>

        <div class="cmn-login__demo">
          <p class="ws-desc">계정 상태 미리보기(FN-07) — 눌러서 로그인 결과를 바꿔 본다</p>
          <div class="cmn-login__opts">
            <div v-for="d in ['정상', '임시 비밀번호', '휴면', '잠금', '사용중지'] as Demo[]" :key="d" class="ws-radio">
              <RadioButton v-model="demo" :input-id="`l-demo-${d}`" name="l-demo" :value="d" />
              <label :for="`l-demo-${d}`">{{ d }}</label>
            </div>
          </div>
        </div>
      </section>
    </div>

    <Dialog v-model:visible="findOpen" modal header="비밀번호 찾기" :style="{ width: '420px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 10px">본인인증(휴대폰 본인확인)으로 본인을 확인한 뒤 새 비밀번호를 정합니다.</p>
      <label for="f-id" class="ws-req">아이디</label>
      <InputText id="f-id" fluid placeholder="아이디" style="margin-top: 6px" />
      <template #footer>
        <SbCode code="SP-CMN-010P-M2" />
        <Button label="취소" severity="secondary" outlined @click="findOpen = false" />
        <Button label="본인인증(미리보기)" @click="() => { findOpen = false; pwChangeOpen = true }" />
      </template>
    </Dialog>

    <Dialog v-model:visible="pwChangeOpen" modal header="비밀번호 변경" :closable="demo !== '임시 비밀번호'" :style="{ width: '420px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 10px">2종 조합 10자 이상 또는 3종 조합 8자 이상. 임시 · 직전 비밀번호는 다시 쓸 수 없습니다.</p>
      <div class="cmn-login__row">
        <label for="p-1" class="ws-req">새 비밀번호</label>
        <Password id="p-1" v-model="pw1" fluid toggle-mask />
      </div>
      <div class="cmn-login__row">
        <label for="p-2" class="ws-req">새 비밀번호 확인</label>
        <Password id="p-2" v-model="pw2" fluid toggle-mask :feedback="false" />
      </div>
      <p v-if="pw1 && !pwRuleOk" class="ws-err">규칙을 확인하세요 — 8자 이상, 두 값이 같아야 합니다.</p>
      <template #footer>
        <SbCode code="SP-CMN-010P-M1" />
        <Button label="변경" @click="changePw" />
      </template>
    </Dialog>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>이 화면은 미리보기입니다 — 실제 인증 서버가 없어 값을 검사하지 않습니다.</li>
        <li>계정 상태 미리보기로 휴면 · 잠금 · 사용중지 거부 문구(REQ-03)를 확인할 수 있습니다.</li>
        <li>로그인 성공 · 실패는 접속이력(SP-SYS-020P)에 남는 것으로 본다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cmn-login { display: grid; place-items: center; padding: 40px 0; }
.cmn-login__card {
  width: 360px; padding: 28px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius);
  background: var(--ws-surface); display: grid; gap: 14px;
}
.cmn-login__row { display: grid; gap: 6px; }
.cmn-login__row label { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
.cmn-login__chk { display: flex; align-items: center; gap: 8px; }
.cmn-login__links { display: flex; justify-content: center; }
.ws-link { background: none; border: 0; color: var(--ws-text-link); cursor: pointer; font-size: var(--ws-font-size-sm); }
.cmn-login__demo { margin-top: 8px; padding-top: 14px; border-top: 1px dashed var(--ws-border); display: grid; gap: 8px; }
.cmn-login__opts { display: flex; flex-wrap: wrap; gap: 10px 14px; }
</style>
