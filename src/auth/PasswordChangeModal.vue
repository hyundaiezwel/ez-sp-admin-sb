<script setup lang="ts">
/**
 * SP-CMN-010P-M1 비밀번호 변경 — 임시 비밀번호 계정. **닫을 수 없다**(닫기 X · Esc 없음).
 * 서버도 변경 전에는 다른 API를 403 `AUTH_PASSWORD_CHANGE_REQUIRED`로 막는다(login.md 8절).
 * 규칙 검사는 미리 알려 주는 용도다 — 판정(재사용 · 아이디와 같음 포함)은 서버가 한다.
 */
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import SbCode from '../sb/SbCode.vue'
import { notify } from '../ws/notify'
import { ApiError } from './api'
import { useAuth } from './store'

const emit = defineEmits<{ done: [] }>()
const auth = useAuth()
const f = ref({ cur: '', n1: '', n2: '' })
const err = ref('')
const busy = ref(false)

/** 영대 · 영소 · 숫자 · 특수 중 2종 10자 이상 또는 3종 8자 이상(SER-001) */
const policyOk = (pw: string) => {
  const kinds = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  return (kinds >= 2 && pw.length >= 10) || (kinds >= 3 && pw.length >= 8)
}
const hint = computed(() => {
  const { cur, n1, n2 } = f.value
  if (n1 && !policyOk(n1)) return '규칙에 맞지 않습니다 — 2종 조합 10자 이상 또는 3종 조합 8자 이상.'
  if (n1 && n1 === cur) return '현재 비밀번호와 다른 값을 입력하세요.'
  if (n2 && n1 !== n2) return '새 비밀번호 확인 값이 다릅니다.'
  return ''
})

async function submit() {
  err.value = ''
  const { cur, n1, n2 } = f.value
  if (!cur || !n1 || !n2) { err.value = '세 칸을 모두 입력하세요.'; return }
  if (hint.value) { err.value = hint.value; return }
  busy.value = true
  try {
    await auth.changePassword(cur, n1)
    notify('비밀번호를 바꿨습니다.', 'success')
    emit('done')
  } catch (e) {
    err.value = e instanceof ApiError ? e.message : '비밀번호를 바꾸지 못했습니다.'
  } finally { busy.value = false }
}
</script>

<template>
  <Dialog :visible="true" modal header="비밀번호 변경" :closable="false" :close-on-escape="false" :draggable="false" :style="{ width: '440px' }" role="alertdialog">
    <form class="pc" novalidate @submit.prevent="submit">
      <p class="ws-desc">임시 비밀번호로 로그인했습니다. 새 비밀번호를 정해야 계속 쓸 수 있습니다.</p>
      <p class="ws-desc">규칙: 영문 대문자 · 소문자 · 숫자 · 특수문자 중 2종 조합 10자 이상 또는 3종 조합 8자 이상. 아이디 · 현재 · 직전 비밀번호는 쓸 수 없습니다.</p>
      <div class="pc__row">
        <label for="pc-cur" class="ws-req">현재(임시) 비밀번호</label>
        <Password v-model="f.cur" input-id="pc-cur" :feedback="false" toggle-mask fluid :input-props="{ autocomplete: 'current-password' }" />
      </div>
      <div class="pc__row">
        <label for="pc-n1" class="ws-req">새 비밀번호</label>
        <Password v-model="f.n1" input-id="pc-n1" :feedback="false" toggle-mask fluid :input-props="{ autocomplete: 'new-password' }" />
      </div>
      <div class="pc__row">
        <label for="pc-n2" class="ws-req">새 비밀번호 확인</label>
        <Password v-model="f.n2" input-id="pc-n2" :feedback="false" toggle-mask fluid :input-props="{ autocomplete: 'new-password' }" />
      </div>
      <p v-if="err || hint" class="ws-err" role="alert">{{ err || hint }}</p>
      <button type="submit" hidden />
    </form>
    <template #footer>
      <SbCode code="SP-CMN-010P-M1" />
      <Button label="로그아웃" severity="secondary" outlined @click="auth.logout('MANUAL')" />
      <Button label="변경" :loading="busy" @click="submit" />
    </template>
  </Dialog>
</template>

<style scoped>
.pc { display: grid; gap: 12px; }
.pc__row { display: grid; gap: 6px; }
.pc__row label { color: var(--ws-text-sub); }
</style>
