/**
 * B1(공통·시스템관리) 전용 가짜 데이터 — SP-CMN-010P~050P · SP-SYS-010L/D · 020P · 021P.
 * 공통 기업 · 노동자는 `fixtures/sb/common.ts`를 그대로 쓴다. 전부 지어낸 값이다. 이 파일은 B1 화면만 import 한다.
 */
import { NAMES } from '../rng'
import { pad, pick, rand, ymd } from './common'

const dt = (base: Date, days: number, h = 9, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, h, m)
const hm = (d: Date) => `${ymd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const NOW = new Date(2026, 8, 30, 14, 20)

/* --- E08 지원기관·운영사 운영 계정 ----------------------------------------- */
export type AcctStatus = '사용' | '임시 비밀번호' | '휴면' | '잠금' | '사용중지'
export interface SbAdmin {
  id: string; loginId: string; name: string
  org: '지원기관' | '운영사'
  role: 'AM' | 'AL' | 'AS' | 'AV' | 'OM' | 'OO'
  email: string; phone: string
  /** 사업 범위 — 빈 배열이면 전체 */
  bizScope: string[]
  /** 개별 조정 — 역할 기본값 위에 얹는 추가 허용(+) · 회수(-) 동작 코드 */
  grantAdd: string[]; grantRemove: string[]
  status: AcctStatus
  failCount: number
  lastLoginAt: string
  createdAt: string; createdBy: string
  pending: boolean
}
const r = rand('B1-admin')
const ROLE_ORG: Record<SbAdmin['role'], SbAdmin['org']> = { AM: '지원기관', AL: '지원기관', AS: '지원기관', AV: '지원기관', OM: '운영사', OO: '운영사' }
const ROLE_W: [SbAdmin['role'], number][] = [['AS', 10], ['AL', 4], ['AV', 3], ['AM', 2], ['OO', 6], ['OM', 2]]
const weighted = <T extends string>(rr: () => number, w: [T, number][]) => {
  let x = rr() * w.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of w) if ((x -= n) < 0) return k
  return w[0][0]
}
const STS_W: [AcctStatus, number][] = [['사용', 70], ['임시 비밀번호', 6], ['휴면', 10], ['잠금', 6], ['사용중지', 8]]
export const ADMINS: SbAdmin[] = Array.from({ length: 34 }, (_, i) => {
  const role = weighted(r, ROLE_W)
  const status = weighted(r, STS_W)
  const created = dt(NOW, -30 - Math.floor(r() * 700))
  return {
    id: `AD-${pad(i + 1, 4)}`, loginId: `op${pad(i + 1, 3)}`, name: pick(r, NAMES),
    org: ROLE_ORG[role], role, email: `op${pad(i + 1, 3)}@example.com`, phone: `010-0000-${pad(2000 + i, 4)}`,
    bizScope: role === 'AM' || role === 'OM' ? [] : r() > 0.6 ? ['BIZ-26-01'] : [],
    grantAdd: role === 'AS' && r() > 0.85 ? ['download-pii'] : [],
    grantRemove: role === 'AL' && r() > 0.9 ? ['money'] : [],
    status, failCount: status === '잠금' ? 5 : Math.floor(r() * 3),
    lastLoginAt: status === '휴면' ? hm(dt(NOW, -190 - Math.floor(r() * 60))) : hm(dt(NOW, -Math.floor(r() * 20))),
    createdAt: hm(created), createdBy: '김*수', pending: i % 11 === 0,
  }
})
export const adminOf = (id: string) => ADMINS.find((a) => a.id === id)

/* --- 접속이력(SP-SYS-020P) -------------------------------------------------- */
export type LoginResult = '로그인 성공' | '비밀번호 실패' | '2차 인증 실패' | '잠금 전환' | '수동 로그아웃' | '자동 로그아웃' | '중복 로그인 종료' | '계정 사용중지 로그아웃'
export interface SbAccessLog {
  id: string; at: string; adminId: string; adminName: string; org: SbAdmin['org']
  result: LoginResult; ip: string; browser: string; anomaly: boolean
}
const r2 = rand('B1-access')
const RESULT_W: [LoginResult, number][] = [
  ['로그인 성공', 40], ['수동 로그아웃', 30], ['자동 로그아웃', 10], ['비밀번호 실패', 8],
  ['2차 인증 실패', 4], ['잠금 전환', 2], ['중복 로그인 종료', 3], ['계정 사용중지 로그아웃', 1],
]
const BROWSERS = ['Chrome 128 · Windows', 'Chrome 128 · macOS', 'Edge 127 · Windows', 'Safari 17 · macOS', 'Whale 3 · Windows']
export const ACCESS_LOGS: SbAccessLog[] = Array.from({ length: 420 }, (_, i) => {
  const a = pick(r2, ADMINS)
  const result = weighted(r2, RESULT_W)
  return {
    id: `AL-${pad(i + 1, 5)}`, at: hm(dt(NOW, -Math.floor(r2() * 90), Math.floor(r2() * 24), Math.floor(r2() * 60))),
    adminId: a.id, adminName: a.name, org: a.org, result,
    ip: `211.${Math.floor(r2() * 255)}.${Math.floor(r2() * 255)}.${Math.floor(r2() * 255)}`,
    browser: pick(r2, BROWSERS),
    anomaly: result === '비밀번호 실패' || result === '2차 인증 실패' || result === '잠금 전환',
  }
}).sort((a, b) => b.at.localeCompare(a.at))

/* --- 개인정보 접근이력(SP-SYS-021P) ----------------------------------------- */
export type PiiAction = '조회' | '가림 해제' | '다운로드'
export type ReviewResult = '적정' | '소명 요청' | null
export interface SbPiiLog {
  id: string; at: string; adminId: string; adminName: string; org: SbAdmin['org']
  screen: string; action: PiiAction
  reason: string; count: number; fileName: string; queryCond: string
  flagged: boolean
  reviewResult: ReviewResult; reviewNote: string; reviewBy: string; reviewAt: string
}
const r3 = rand('B1-pii')
const SCREENS = ['SP-PRT-010L', 'SP-PRT-020L', 'SP-PRT-030L', 'SP-PRT-040L', 'SP-STL-010D']
const REASONS = ['기업 담당자 업무요청', '내부 업무(정산·통계·CS)', '협력사 제공', '직접 입력 — 감사 대응 자료 취합']
const ACTION_W: [PiiAction, number][] = [['조회', 55], ['다운로드', 35], ['가림 해제', 10]]
export const PII_LOGS: SbPiiLog[] = Array.from({ length: 260 }, (_, i) => {
  const a = pick(r3, ADMINS)
  const action = weighted(r3, ACTION_W)
  const at = dt(NOW, -Math.floor(r3() * 90), 8 + Math.floor(r3() * 12), Math.floor(r3() * 60))
  const outOfHours = at.getHours() < 9 || at.getHours() >= 18
  const count = action === '다운로드' ? 20 + Math.floor(r3() * 4000) : 1 + Math.floor(r3() * 5)
  const flagged = outOfHours || count > 1000
  const reviewed = flagged && r3() > 0.4
  return {
    id: `PL-${pad(i + 1, 5)}`, at: hm(at), adminId: a.id, adminName: a.name, org: a.org,
    screen: pick(r3, SCREENS), action,
    reason: pick(r3, REASONS), count, fileName: action === '다운로드' ? `export_${ymd(at).replace(/\./g, '')}_${pad(i, 3)}.xlsx` : '',
    queryCond: '신청상태=심사중 · 기간=2026.01.01~2026.09.30',
    flagged,
    reviewResult: (reviewed ? (r3() > 0.75 ? '소명 요청' : '적정') : null) as ReviewResult,
    reviewNote: reviewed ? '사유 확인함 — 정상 업무 범위' : '',
    reviewBy: reviewed ? '박*연' : '', reviewAt: reviewed ? hm(dt(at, 1)) : '',
  }
}).sort((a, b) => b.at.localeCompare(a.at))
