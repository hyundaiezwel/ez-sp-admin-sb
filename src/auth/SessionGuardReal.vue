<script setup lang="ts">
/**
 * 세션 만료 알림 — 실제 모드(SP-CMN-030P). 목업은 `src/app/SessionGuard.vue` 그대로다(Shell이 모드로 고른다).
 *
 *   기준 시각은 서버 `expiresAt`(complete · extend · GET /session). 화면 시계 차이는 api.ts가 보정한다.
 *   만료 `warnSec`초 전(기본 300, `VITE_SESSION_WARN_SEC`) M1 — 남은 시간 · 로그인 연장(기본 포커스) · 다시 로그인하기. 닫기 X 없음
 *   0이 되면 M2 — 확인을 누르면 로그인 화면
 *   GET /session은 60초마다(연장하지 않는다). 업무 API를 부르면 서버가 늘리므로 그 값을 따라간다.
 *   **자동 연장은 하지 않는다** — 마우스 · 키보드 활동 연장은 목업에만 있다.
 * 임시 비밀번호(403 AUTH_PASSWORD_CHANGE_REQUIRED · /me)면 닫을 수 없는 비밀번호 변경 모달도 여기서 띄운다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import SbCode from '../sb/SbCode.vue'
import { notify } from '../ws/notify'
import PasswordChangeModal from './PasswordChangeModal.vue'
import { useAuth } from './store'

const POLL_MS = 60_000
const auth = useAuth()
const now = ref(Date.now())
const expired = ref(false)
const busy = ref(false)
const left = computed(() => (auth.expiresAt ? Math.max(0, Math.round((auth.expiresAt - now.value) / 1000)) : -1))
const warn = computed(() => !expired.value && left.value > 0 && left.value <= auth.warnSec)
const mmss = computed(() => `${Math.floor(Math.max(left.value, 0) / 60)}:${String(Math.max(left.value, 0) % 60).padStart(2, '0')}`)

const quiet = () => auth.refresh().catch(() => { /* 세션이 없으면 api.ts가 로그인 화면으로 보낸다 */ })
let tick: number | undefined
let poll: number | undefined
onMounted(() => {
  tick = window.setInterval(() => (now.value = Date.now()), 1000)
  poll = window.setInterval(() => { if (!expired.value) quiet() }, POLL_MS)
})
onBeforeUnmount(() => { window.clearInterval(tick); window.clearInterval(poll) })

/* 예고에 들어서는 순간 한 번 서버에 묻는다 — 업무 API로 서버 쪽 만료가 늦춰졌으면 예고를 띄우지 않는다 */
watch(warn, (w) => { if (w) quiet() })
watch(left, (s, prev) => { if (s === 0 && prev > 0) expired.value = true })
/* 다른 탭에서 연장하면 expiresAt이 늦춰져 M1이 저절로 닫힌다. 만료 뒤라도 늦춰졌으면 M2를 거둔다 */
watch(() => auth.expiresAt, (v) => { if (v > Date.now()) expired.value = false })

async function keep() {
  busy.value = true
  try { await auth.extend(); notify('로그인을 연장했습니다.', 'success') }
  catch { /* 세션 없음 · 사용중지는 api.ts가 사유와 함께 로그인 화면으로 */ }
  finally { busy.value = false }
}
const confirmExpired = () => { expired.value = false; auth.logout('IDLE', '세션이 만료되었습니다.') }
</script>

<template>
  <Dialog :visible="warn" modal header="세션 만료 예고" :closable="false" :close-on-escape="false" :draggable="false" :style="{ width: '380px' }" role="alertdialog">
    <p>비활동으로 곧 로그아웃됩니다.</p>
    <p class="sr__t" role="timer" aria-live="off">{{ mmss }}</p>
    <template #footer>
      <SbCode code="SP-CMN-030P-M1" />
      <Button label="다시 로그인하기" severity="secondary" outlined @click="auth.logout('MANUAL')" />
      <Button label="로그인 연장" autofocus :loading="busy" @click="keep" />
    </template>
  </Dialog>

  <Dialog :visible="expired" modal header="세션 만료됨" :closable="false" :close-on-escape="false" :draggable="false" :style="{ width: '360px' }" role="alertdialog">
    <p>세션이 만료되었습니다. 진행 중이던 요청은 처리되지 않았습니다.</p>
    <template #footer>
      <SbCode code="SP-CMN-030P-M2" />
      <Button label="확인" autofocus @click="confirmExpired" />
    </template>
  </Dialog>

  <PasswordChangeModal v-if="auth.user && auth.mustChangePassword" />
</template>

<style scoped>
.sr__t { margin: 10px 0; font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; text-align: center; color: var(--ws-text-danger); }
</style>
