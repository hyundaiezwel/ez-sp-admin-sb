/**
 * 토큰 · 저장 ID 보관.
 * - accessToken: 메모리 + sessionStorage `vs.accessToken` — 탭을 닫으면 사라지고, 새로고침에는 남는다.
 * - 저장 ID: localStorage `vs.savedLoginId` — 비밀번호는 저장하지 않는다(SP-CMN-010P FN-05).
 * 저장소를 못 쓰면(사생활 보호 모드 등) 조용히 메모리만 쓴다.
 */
const TOKEN = 'vs.accessToken'
const SAVED_ID = 'vs.savedLoginId'

function read(s: () => Storage, k: string): string | null {
  try { return s().getItem(k) } catch { return null }
}
function write(s: () => Storage, k: string, v: string | null) {
  try { v == null ? s().removeItem(k) : s().setItem(k, v) } catch { /* 이번 탭 메모리만 */ }
}

let token = read(() => sessionStorage, TOKEN)
export const getToken = () => token
export function setToken(t: string | null) { token = t; write(() => sessionStorage, TOKEN, t) }

export const getSavedId = () => read(() => localStorage, SAVED_ID) ?? ''
export const setSavedId = (id: string | null) => write(() => localStorage, SAVED_ID, id || null)
