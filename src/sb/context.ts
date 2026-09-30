import { reactive, watch } from 'vue'
import { ACTIONS, DEFAULT_MATRIX, ROLES, type Action } from './roles'
import { getSpec } from './spec'

/**
 * SB 전역 상태 — 미리보기 역할. 상단바 역할 스위처가 바꾸고, 화면 버튼 권한이 따라간다.
 * 실제 시스템에는 없는 스위치다(계정의 역할이 정한다).
 */
const KEY = 'sb-role'
const saved = (() => { try { return localStorage.getItem(KEY) } catch { return null } })()

export const sb = reactive<{ role: string }>({
  role: ROLES.some((r) => r.code === saved) ? saved! : (ROLES[0]?.code ?? ''),
})
watch(() => sb.role, (v) => { try { localStorage.setItem(KEY, v) } catch { /* 이번 방문만 */ } })

export const roleLabel = (code = sb.role) => ROLES.find((r) => r.code === code)?.label ?? code
export const actionLabel = (a: Action) => ACTIONS.find((x) => x.code === a)?.label ?? a

/**
 * 화면 × 역할 → 허용 동작. **명세가 있으면 명세 행이 이긴다** — 없으면 DEFAULT_MATRIX[화면], 그것도 없으면 DEFAULT_MATRIX['*'].
 */
export function allowed(code: string, role = sb.role): Action[] {
  const row = getSpec(code)?.permissions?.rows?.find((r) => r.role === role)
  return row?.actions ?? DEFAULT_MATRIX[code]?.[role] ?? DEFAULT_MATRIX['*']?.[role] ?? []
}
export const can = (code: string, action: Action, role = sb.role) => allowed(code, role).includes(action)
/** 권한 없을 때 툴팁 문구. 있으면 '' */
export const denyTip = (code: string, action: Action, role = sb.role) =>
  can(code, action, role) ? '' : `${topic(roleLabel(role))} ${actionLabel(action)} 권한 없음`
/** 받침이 있으면 '은', 없으면 '는' */
const topic = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c < 11172 && c % 28 ? '은' : '는') }

