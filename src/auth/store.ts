/**
 * 로그인 상태 — Pinia. 실제 모드(`REAL`)에서만 싣는다(router · TopBar가 동적 import).
 *
 *   login → challenge(5분) → startIdentity → (LOCAL) localVerify | (PASS) 팝업 postMessage → completeIdentity → 세션
 *   restore: 새로고침 뒤 토큰이 남아 있으면 GET /me · GET /session
 *   extend: POST /session/extend — 사람이 누를 때만. 타이머는 GET /session(연장 안 함)만 부른다(login.md 6.2)
 *
 * 탭 동기화: BroadcastChannel('vs-auth') — 연장 · 로그아웃을 다른 탭에 알린다(SP-CMN-030P FN-05, 020P FN-05).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { router } from '../router'
import { ROLES } from '../sb/roles'
import { call, setAuthHandlers, toLocalMs } from './api'
import { getToken, setToken } from './tokenStore'

export interface AuthUser { mngrId: string; name: string; div: string; auth: string }
export interface IdentityStart { mode: 'PASS' | 'LOCAL'; popupUrl?: string; form?: Record<string, string> }
export type LogoutReason = 'MANUAL' | 'IDLE'
type ServerTime = string | number
interface Me extends AuthUser { deptNm?: string; jbpsNm?: string; lastLoginAt?: ServerTime; mustChangePassword?: boolean }
interface Complete { accessToken: string; expiresAt: ServerTime; absoluteExpiresAt?: ServerTime; mustChangePassword: boolean; user: AuthUser }
interface SessionInfo { expiresAt: ServerTime; absoluteExpiresAt?: ServerTime; warnBeforeSec?: number }
type Msg = { type: 'extend'; expiresAt: number } | { type: 'logout' }

const ENV_WARN = Number(import.meta.env.VITE_SESSION_WARN_SEC) || 0

export const useAuth = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const mustChangePassword = ref(false)
  /** 화면 시계 기준 ms. 0이면 세션 없음 */
  const expiresAt = ref(0)
  const warnSec = ref(ENV_WARN || 300)
  /** 로그인 화면에 보일 종료 사유 */
  const reason = ref('')
  const challenge = ref<{ id: string; maskedMobile: string } | null>(null)
  const roleLabel = computed(() => ROLES.find((r) => r.code === user.value?.auth)?.label ?? user.value?.auth ?? '')

  let bc: BroadcastChannel | null = null
  try { bc = new BroadcastChannel('vs-auth') } catch { /* 지원 안 하면 서버 응답(세션 없음)으로 판정 */ }
  if (bc) bc.onmessage = (e: MessageEvent<Msg>) => {
    if (!user.value) return
    if (e.data.type === 'extend') expiresAt.value = e.data.expiresAt
    else end('다른 탭에서 로그아웃했습니다.')
  }

  /** 화면 쪽 세션을 끝내고 로그인 화면으로 */
  function end(msg = '') {
    setToken(null)
    user.value = null
    mustChangePassword.value = false
    expiresAt.value = 0
    challenge.value = null
    reason.value = msg
    if (router.currentRoute.value.path !== '/login') router.push('/login')
  }
  setAuthHandlers({ kicked: (m) => { if (getToken()) end(m) }, mustChangePassword: () => { mustChangePassword.value = true } })

  function applySession(s: SessionInfo) {
    expiresAt.value = toLocalMs(s.expiresAt)
    if (!ENV_WARN && s.warnBeforeSec) warnSec.value = s.warnBeforeSec
  }

  async function login(loginId: string, password: string) {
    const d = await call<{ challengeId: string; maskedMobile: string }>('post', '/auth/login', { loginId, password, channel: 'ADMIN' })
    challenge.value = { id: d.challengeId, maskedMobile: d.maskedMobile }
    reason.value = ''
    return d
  }
  const startIdentity = () => call<IdentityStart>('post', '/auth/identity/start', { challengeId: challenge.value?.id })
  const localVerify = (name: string, birth: string, mobile: string) =>
    call<{ verified: boolean }>('post', '/auth/identity/local-verify', { challengeId: challenge.value?.id, name, birth, mobile })

  async function completeIdentity() {
    const d = await call<Complete>('post', '/auth/identity/complete', { challengeId: challenge.value?.id })
    setToken(d.accessToken)
    user.value = d.user
    mustChangePassword.value = d.mustChangePassword
    challenge.value = null
    applySession(d)
    return d
  }

  /** 라우터 가드용 — 로그인돼 있으면 true. 토큰만 남아 있으면(새로고침) 서버에 묻는다 */
  async function ensure() {
    if (user.value) return true
    if (!getToken()) return false
    try {
      const me = await call<Me>('get', '/auth/me')
      user.value = { mngrId: me.mngrId, name: me.name, div: me.div, auth: me.auth }
      mustChangePassword.value = !!me.mustChangePassword
      await refresh()
      return true
    } catch {
      setToken(null)
      user.value = null
      return false
    }
  }

  /** 표시용 조회 — 서버가 TTL을 늘리지 않는다 */
  async function refresh() { applySession(await call<SessionInfo>('get', '/auth/session')) }

  async function extend() {
    const d = await call<{ expiresAt: ServerTime }>('post', '/auth/session/extend')
    expiresAt.value = toLocalMs(d.expiresAt)
    bc?.postMessage({ type: 'extend', expiresAt: expiresAt.value } satisfies Msg)
  }

  async function logout(why: LogoutReason = 'MANUAL', msg = '') {
    try { if (getToken()) await call('post', '/auth/logout', { reason: why }) } catch { /* 이미 끊긴 세션 — 화면만 정리 */ }
    bc?.postMessage({ type: 'logout' } satisfies Msg)
    end(msg)
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await call('put', '/auth/password', { currentPassword, newPassword })
    mustChangePassword.value = false
  }

  return { user, mustChangePassword, expiresAt, warnSec, reason, challenge, roleLabel, login, startIdentity, localVerify, completeIdentity, ensure, refresh, extend, logout, changePassword }
})
