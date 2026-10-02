/**
 * API 호출 — axios 인스턴스 하나. baseURL = `VITE_API_BASE`(로컬 `/api` → vite 프록시 → :8090).
 *
 * 응답 봉투 `{success, data}` / `{success:false, error:{code, message, fields}}`를 여기서 벗긴다.
 * 실패는 전부 `ApiError`(code · message · fields · data)로 던진다 — 화면은 code로 가르고 message를 그대로 보인다.
 *
 * 전역 처리(로그인 전 API 제외)
 *   AUTH_SESSION_EXPIRED · AUTH_SESSION_REPLACED · AUTH_STOPPED → 토큰을 지우고 사유와 함께 로그인 화면
 *   AUTH_PASSWORD_CHANGE_REQUIRED → 비밀번호 변경 모달
 * 처리는 store가 `setAuthHandlers`로 건다 — 여기서 store · router를 import하면 순환이 생긴다.
 */
import axios from 'axios'
import { getToken } from './tokenStore'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public fields: Record<string, unknown> | null = null,
    public data: Record<string, unknown> | null = null,
  ) { super(message) }
}

interface Envelope<T> { success: boolean; data?: T; error?: { code?: string; message?: string; fields?: Record<string, unknown> | null } }

export const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE, timeout: 15_000 })
http.interceptors.request.use((cfg) => {
  const t = getToken()
  if (t) cfg.headers.set('Authorization', `Bearer ${t}`)
  return cfg
})

/** 서버 시각 − 화면 시각(ms). 만료 시각을 화면 시계로 옮길 때 뺀다(SP-CMN-030P FN-01 "화면 시계를 믿지 않는다") */
export let clockSkew = 0

interface Handlers { kicked(message: string): void; mustChangePassword(): void }
let handlers: Handlers | null = null
export const setAuthHandlers = (h: Handlers) => { handlers = h }

/** 고정 문구 — null이면 서버 문구를 쓴다 */
const KICK: Record<string, string | null> = {
  AUTH_SESSION_EXPIRED: '세션이 만료되었습니다.',
  AUTH_SESSION_REPLACED: '다른 곳에서 로그인되어 종료되었습니다.',
  AUTH_STOPPED: null,
}
/** 로그인 전 API와 로그아웃은 화면이 직접 처리한다 */
const SELF_HANDLED = /^\/auth\/(login|identity\/|logout)/

function toError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as Envelope<Record<string, unknown>> | undefined
    if (body?.error?.code) {
      return new ApiError(body.error.code, body.error.message ?? '요청을 처리하지 못했습니다.', e.response!.status, body.error.fields ?? null, body.data ?? null)
    }
    if (e.response) return new ApiError('SERVER_ERROR', `일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요. (HTTP ${e.response.status})`, e.response.status)
    return new ApiError('NETWORK_ERROR', '서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.')
  }
  return new ApiError('UNKNOWN', '요청을 처리하지 못했습니다.')
}

export async function call<T>(method: 'get' | 'post' | 'put', url: string, data?: unknown): Promise<T> {
  try {
    const res = await http.request<Envelope<T>>({ method, url, data })
    const date = Date.parse(String(res.headers['date'] ?? ''))
    if (!Number.isNaN(date)) clockSkew = date - Date.now()
    const body = res.data
    if (!body?.success) throw new ApiError(body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? '요청을 처리하지 못했습니다.', res.status, body?.error?.fields ?? null)
    return body.data as T
  } catch (e) {
    const err = toError(e)
    if (!SELF_HANDLED.test(url)) {
      if (err.code in KICK) handlers?.kicked(KICK[err.code] ?? err.message)
      else if (err.code === 'AUTH_PASSWORD_CHANGE_REQUIRED') handlers?.mustChangePassword()
    }
    throw err
  }
}

/** 서버 시각(ISO 문자열 · epoch 초/밀리초)을 화면 시계 ms로 */
export function toLocalMs(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v)
  return Number.isNaN(n) ? 0 : n - clockSkew
}
