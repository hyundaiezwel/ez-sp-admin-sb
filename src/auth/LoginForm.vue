<script setup lang="ts">
/**
 * 실제 로그인 — LoginPage 카드 안쪽(실제 모드에서만 싣는다). docs/dev/login.md 4 · 5 · 7 · 11절.
 *
 *   1단계 아이디 · 비밀번호(보기 토글 · 아이디 저장) → POST /login. 실패 문구는 서버 `error.message` 그대로
 *   2단계 본인인증 → POST /identity/start
 *     LOCAL  이름 · 생년월일 · 휴대폰 입력 → /identity/local-verify → /identity/complete
 *     PASS   팝업(폼이 오면 POST) → 결과 페이지가 postMessage({type:'vs-identity', challengeId, ok}) → /identity/complete
 *   성공 → 임시 비밀번호면 비밀번호 변경(M1), 아니면 메인
 * 화면 글자에 "관리자/Admin"을 쓰지 않는다(RFP MPR-008).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { ApiError } from './api'
import { useAuth, type IdentityStart } from './store'
import { getSavedId, setSavedId } from './tokenStore'
import PasswordChangeModal from './PasswordChangeModal.vue'

const MAIN = '/sb/s/SP-CMN-050P'
/** 이 코드면 1단계부터 다시 */
const RESTART = new Set(['AUTH_IDENTITY_TOO_MANY_ATTEMPTS', 'AUTH_CHALLENGE_EXPIRED'])
const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE ?? '/', location.href).origin

const router = useRouter()
const auth = useAuth()
const saved = getSavedId()
const step = ref<1 | 2>(1)
const f = ref({ id: saved, pw: '' })
const saveId = ref(!!saved)
const v = ref({ name: '', birth: '', mobile: '' })
const mode = ref<IdentityStart['mode'] | ''>('')
let pending: IdentityStart | null = null
const waiting = ref(false)
const busy = ref(false)
const err = ref('')
const link = ref('')

function show(e: unknown) {
  const x = e instanceof ApiError ? e : new ApiError('UNKNOWN', '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.')
  const remaining = x.fields?.remaining
  err.value = remaining != null ? `${x.message} (남은 횟수 ${remaining}회)` : x.message
  const url = x.data?.redirectUrl
  link.value = x.code === 'AUTH_CHANNEL_DENIED' && typeof url === 'string' && /^(https?:\/\/|\/)/.test(url) ? url : ''
  if (RESTART.has(x.code)) restart()
}
function restart() {
  step.value = 1
  mode.value = ''
  pending = null
  waiting.value = false
  v.value = { name: '', birth: '', mobile: '' }
  auth.challenge = null
}
async function run(fn: () => Promise<unknown>) {
  err.value = ''
  link.value = ''
  busy.value = true
  try { await fn() } catch (e) { show(e) } finally { busy.value = false }
}

const submit1 = () => {
  const id = f.value.id.trim()
  if (!id || !f.value.pw) { err.value = '아이디 · 비밀번호를 모두 입력하세요.'; return }
  return run(async () => {
    await auth.login(id, f.value.pw)
    setSavedId(saveId.value ? id : null)
    f.value.pw = ''
    step.value = 2
    pending = await auth.startIdentity()
    mode.value = pending.mode
  })
}

async function finish() {
  await auth.completeIdentity()
  if (!auth.mustChangePassword) router.push(MAIN)
}

const submitLocal = () => {
  const name = v.value.name.trim()
  const birth = v.value.birth.replace(/\D/g, '')
  const mobile = v.value.mobile.replace(/\D/g, '')
  if (!name || birth.length !== 8 || mobile.length < 10) { err.value = '이름 · 생년월일(8자리) · 휴대폰 번호를 확인하세요.'; return }
  return run(async () => { await auth.localVerify(name, birth, mobile); await finish() })
}

/** 팝업은 누른 순간 열어야 막히지 않는다 — 빈 창을 먼저 열고 요청값을 채운다 */
function openPass() {
  err.value = ''
  const w = window.open('', 'vs-pass', 'width=480,height=720')
  if (!w) { err.value = '팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 누르세요.'; return }
  return run(async () => {
    const s = pending ?? (await auth.startIdentity())
    pending = null
    if (!s.popupUrl) throw new ApiError('AUTH_IDENTITY_PROVIDER_ERROR', '본인인증 창을 열지 못했습니다. 잠시 후 다시 시도하세요.')
    if (s.form) {
      const form = Object.assign(document.createElement('form'), { method: 'POST', action: s.popupUrl, target: 'vs-pass' })
      for (const [name, value] of Object.entries(s.form)) form.append(Object.assign(document.createElement('input'), { type: 'hidden', name, value }))
      document.body.append(form)
      form.submit()
      form.remove()
    } else w.location.href = s.popupUrl
    waiting.value = true
  }).then(() => { if (!waiting.value) w.close() })
}
function onMessage(e: MessageEvent) {
  if (e.origin !== location.origin && e.origin !== API_ORIGIN) return
  const d = e.data as { type?: string; challengeId?: string; ok?: boolean } | null
  if (d?.type !== 'vs-identity' || !auth.challenge || d.challengeId !== auth.challenge.id) return
  waiting.value = false
  if (d.ok) run(finish)
  else err.value = '본인인증에 실패했습니다. 다시 시도하세요.'
}
onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <h1 class="lf__tit">지원 사업 관리 로그인</h1>

  <form v-if="step === 1" novalidate @submit.prevent="submit1">
    <ul class="lf__fields">
      <li>
        <label class="ws-sr-only" for="lg-id">아이디</label>
        <InputText id="lg-id" v-model="f.id" size="large" fluid placeholder="아이디 입력" autocomplete="username" />
      </li>
      <li>
        <label class="ws-sr-only" for="lg-pw">비밀번호</label>
        <Password v-model="f.pw" input-id="lg-pw" :feedback="false" toggle-mask fluid size="large" placeholder="비밀번호 입력" :input-props="{ autocomplete: 'current-password' }" />
      </li>
      <li class="ws-check">
        <Checkbox v-model="saveId" input-id="lg-save" binary />
        <label for="lg-save">아이디 저장</label>
      </li>
      <li>
        <p v-if="auth.reason && !err" class="lf__note" role="status">{{ auth.reason }}</p>
        <p v-if="err" class="ws-err lf__err" role="alert">
          {{ err }}
          <a v-if="link" :href="link" class="lf__link">기업 담당자 로그인으로 이동</a>
        </p>
        <Button type="submit" :label="busy ? '로그인 중…' : '로그인'" size="large" fluid :loading="busy" class="lf__btn" />
      </li>
    </ul>
  </form>

  <div v-else class="lf__fields">
    <p class="lf__note">
      본인인증을 마쳐야 로그인됩니다.<template v-if="auth.challenge?.maskedMobile"> 등록된 휴대폰 <b>{{ auth.challenge.maskedMobile }}</b>과 같은 정보로 인증하세요.</template>
    </p>

    <form v-if="mode === 'LOCAL'" class="lf__fields" novalidate @submit.prevent="submitLocal">
      <p class="ws-desc">로컬 본인인증 — 계정에 등록된 이름 · 생년월일 · 휴대폰을 입력합니다.</p>
      <div class="lf__row">
        <label for="lg-nm" class="ws-req">이름</label>
        <InputText id="lg-nm" v-model="v.name" fluid autocomplete="off" />
      </div>
      <div class="lf__row">
        <label for="lg-br" class="ws-req">생년월일</label>
        <InputText id="lg-br" v-model="v.birth" fluid inputmode="numeric" maxlength="8" placeholder="yyyymmdd" autocomplete="off" />
      </div>
      <div class="lf__row">
        <label for="lg-mb" class="ws-req">휴대폰 번호</label>
        <InputText id="lg-mb" v-model="v.mobile" fluid inputmode="numeric" maxlength="13" placeholder="숫자만" autocomplete="off" />
      </div>
      <p v-if="err" class="ws-err lf__err" role="alert">{{ err }}</p>
      <Button type="submit" :label="busy ? '확인 중…' : '본인인증하고 로그인'" size="large" fluid :loading="busy" class="lf__btn" />
    </form>

    <template v-else-if="mode === 'PASS'">
      <p v-if="waiting" class="lf__note" role="status">본인인증 창에서 인증을 진행하세요. 창을 닫았다면 다시 누르세요.</p>
      <p v-if="err" class="ws-err lf__err" role="alert">{{ err }}</p>
      <Button type="button" label="휴대폰 본인인증" size="large" fluid :loading="busy" class="lf__btn" @click="openPass" />
    </template>

    <template v-else>
      <p v-if="err" class="ws-err lf__err" role="alert">{{ err }}</p>
      <p v-else class="lf__note" role="status">본인인증을 준비하고 있습니다…</p>
    </template>

    <button type="button" class="lf__link lf__back" @click="restart(); err = ''">처음으로</button>
  </div>

  <PasswordChangeModal v-if="auth.user && auth.mustChangePassword" @done="router.push(MAIN)" />
</template>

<style scoped>
/* LoginPage 목업 카드와 같은 치수(제목 20/700 · 칸 사이 20) */
.lf__tit { margin-bottom: 24px; font-size: 20px; line-height: 28px; font-weight: 700; text-align: center; }
.lf__fields { display: flex; flex-direction: column; gap: 20px; }
.lf__row { display: grid; gap: 6px; }
.lf__row label { color: var(--ws-text-sub); }
.lf__note { color: var(--ws-text-sub); line-height: 1.5; }
.lf__err { margin: 0 0 8px; }
.lf__link { margin-left: 4px; padding: 0; border: 0; background: none; color: var(--ws-text-link); font: inherit; text-decoration: underline; cursor: pointer; }
.lf__back { align-self: center; }
:deep(.lf__btn.p-button) { border-radius: 8px; }
</style>
