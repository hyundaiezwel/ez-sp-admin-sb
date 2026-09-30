/**
 * B4(사업참여관리 B — 노동자 · 인원추가 · 담당자 · 참여불가) 전용 가짜 데이터.
 * SP-PRT-030L/D · 031L/D · 040L/D · 090L/D · 100L/D.
 * 공통 기업은 `fixtures/sb/common.ts`(COMPANIES)를 그대로 쓴다. 전부 지어낸 값이다.
 *
 * 상태 코드 — 공통 기반 계약 메모(commonIssues) 참고:
 *   노동자 회원상태(M0~M6 대응, DS3 member.ts와는 별개 목업)는 STATES 코드가 없어
 *   `''`(이용중) · `710`(이용정지) · `810~840`(환불요청~환불실패)을 재사용한다.
 *   담당자 계정상태(사용 · 휴면 · 잠금 · 사용중지)와 참여불가 적용상태(적용 · 해제 · 만료)는
 *   문자열 그대로 쓴다 — STATES 코드가 없다.
 */
import { BIZ, SUSPEND_REASONS } from '../../src/sp/codes'
import { COMPANIES, pad, pick, rand, ymd } from './common'
import { NAMES } from '../rng'

const hm = (d: Date) => `${ymd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const BANKS = ['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행']

/* ───────────────────── E09 참여 노동자 (030L · 030D) ───────────────────── */
export type MemberSts = '' | '710' | '810' | '820' | '830' | '840'
export const MEMBER_LABEL: Record<MemberSts, string> = { '': '이용중', '710': '이용정지', '810': '환불요청', '820': '환불대상', '830': '환불완료', '840': '환불실패' }
export interface SbUsage { at: string; place: string; amount: number }
export interface SbDoc { name: string; kind: string; size: string }
export interface SbWorkerB4 {
  id: string; name: string; companyId: string; company: string; bizNo: string; empNo: string
  birth: string; phone: string; email: string; biz: string
  joined: boolean
  memberSts: MemberSts
  assigned: number; used: number; useUntil: string
  suspendedAt: string; suspendReason: string
  refundAccount: { bank: string; holder: string; no: string } | null
  docs: SbDoc[]
  usage: SbUsage[]
}
const rw = rand('B4-worker')
const M_STS: MemberSts[] = ['', '', '', '', '', '710', '810', '840']
export const WORKERS_B4: SbWorkerB4[] = Array.from({ length: 130 }, (_, i) => {
  const c = COMPANIES[i % COMPANIES.length]
  const assigned = 300_000
  const sts = M_STS[i % M_STS.length]
  const used = sts === '' ? Math.round((rw() * assigned) / 1000) * 1000 : Math.round((rw() * assigned * 0.6) / 1000) * 1000
  const susAt = new Date(2026, 5 + (i % 4), 1 + (i % 26))
  return {
    id: `W4-${pad(i + 1, 5)}`, name: pick(rw, NAMES), companyId: c.id, company: c.name, bizNo: c.bizNo,
    empNo: `E${pad(1 + Math.floor(rw() * 99999), 5)}`,
    birth: `${1968 + Math.floor(rw() * 35)}.${pad(1 + Math.floor(rw() * 12), 2)}.${pad(1 + Math.floor(rw() * 28), 2)}`,
    phone: `010-0000-${pad(6000 + i, 4)}`, email: `worker${pad(i + 1, 4)}@example.com`, biz: c.biz,
    joined: i % 11 !== 10,
    memberSts: sts,
    assigned, used: Math.min(used, assigned), useUntil: `2026.12.31`,
    suspendedAt: sts === '710' || sts === '810' || sts === '840' ? hm(susAt) : '',
    suspendReason: sts === '710' || sts === '810' || sts === '840' ? pick(rw, SUSPEND_REASONS) : '',
    refundAccount: sts === '810' || sts === '820' || sts === '830' || sts === '840' ? { bank: pick(rw, BANKS), holder: pick(rw, NAMES), no: `${pad(100 + i, 3)}-${pad(i, 4)}-${pad(i * 3, 6)}` } : null,
    docs: [
      { name: '재직증빙서류.pdf', kind: 'PDF', size: '412KB' },
      { name: '개인정보동의서.pdf', kind: 'PDF', size: '188KB' },
    ],
    usage: Array.from({ length: sts === '' ? 1 + Math.floor(rw() * 4) : Math.floor(rw() * 3) }, (_, k) => ({
      at: hm(new Date(2026, Math.floor(rw() * 9), 1 + Math.floor(rw() * 27))),
      place: pick(rw, ['전용몰 결제', '복지몰 결제', '제휴 가맹점']), amount: Math.round((rw() * 80_000) / 1000) * 1000 + 5000,
    })).sort((a, b) => b.at.localeCompare(a.at)),
  }
})
export const workerOf = (id: string) => WORKERS_B4.find((w) => w.id === id)

/* ───────────────────── E06 추가 인원 신청 (031L · 031D) ───────────────────── */
export type ExtraSts = '611' | '612' | '613' | '614' | '615' | '616'
export const EXTRA_LABEL: Record<ExtraSts, string> = { '611': '등록완료', '612': '보완필요', '613': '입금중', '614': '입금완료', '615': '추가취소', '616': '추가완료' }
export interface SbExtraCandidate { name: string; birth: string; phone: string; blocked: boolean }
export interface SbExtraHist { at: string; by: string; action: string; note: string }
export interface SbExtraRequest {
  id: string; companyId: string; company: string; bizNo: string; biz: string
  appliedAt: string; count: number; unitCost: number
  depositDue: string; sts: ExtraSts
  candidates: SbExtraCandidate[]
  history: SbExtraHist[]
}
const re = rand('B4-extra')
const E_STS: ExtraSts[] = ['611', '611', '612', '613', '613', '614', '615', '616']
export const EXTRA_REQUESTS: SbExtraRequest[] = Array.from({ length: 34 }, (_, i) => {
  const c = COMPANIES[(i * 3) % COMPANIES.length]
  const count = 1 + Math.floor(re() * 5)
  const applied = new Date(2026, 3 + (i % 6), 1 + (i % 26))
  const hasBlocked = i % 9 === 0
  return {
    id: `X-${pad(i + 1, 4)}`, companyId: c.id, company: c.name, bizNo: c.bizNo, biz: c.biz,
    appliedAt: hm(applied), count, unitCost: 300_000,
    depositDue: hm(new Date(applied.getTime() + 10 * 86_400_000)),
    sts: E_STS[i % E_STS.length],
    candidates: Array.from({ length: count }, (_, k) => ({
      name: pick(re, NAMES), birth: `${1970 + Math.floor(re() * 30)}.${pad(1 + Math.floor(re() * 12), 2)}.${pad(1 + Math.floor(re() * 28), 2)}`,
      phone: `010-0000-${pad(7000 + i * 5 + k, 4)}`, blocked: hasBlocked && k === 0,
    })),
    history: [{ at: hm(applied), by: '기업 담당자', action: '인원추가 신청', note: '' }],
  }
})
export const extraOf = (id: string) => EXTRA_REQUESTS.find((x) => x.id === id)

/* ───────────────────── E07 기업 담당자 계정 (040L · 040D) ───────────────────── */
export type AcctSts = '사용' | '휴면' | '잠금' | '사용중지'
export interface SbManager {
  id: string; companyId: string; company: string; bizNo: string
  name: string; loginId: string; phone: string; email: string; position: string
  acctSts: AcctSts; lastLoginAt: string; createdAt: string; onlyManager: boolean
}
const rm = rand('B4-manager')
const A_STS: AcctSts[] = ['사용', '사용', '사용', '사용', '휴면', '잠금', '사용중지']
export const MANAGERS: SbManager[] = COMPANIES.flatMap((c, ci) =>
  Array.from({ length: 1 + (ci % 3 === 0 ? 1 : 0) }, (_, k) => {
    const i = ci * 2 + k
    return {
      id: `MG-${pad(i + 1, 4)}`, companyId: c.id, company: c.name, bizNo: c.bizNo,
      name: pick(rm, NAMES), loginId: `mgr${pad(i + 1, 4)}`, phone: `010-0000-${pad(8000 + i, 4)}`,
      email: `acct${pad(i + 1, 4)}@example.com`, position: pick(rm, ['담당자', '팀장', '인사담당']),
      acctSts: A_STS[i % A_STS.length], lastLoginAt: hm(new Date(2026, 8, 1 + (i % 28), 9 + (i % 8))),
      createdAt: hm(new Date(2026, 0, 5 + (i % 20))), onlyManager: k === 0 && ci % 3 !== 0,
    }
  }),
)
export const managerOf = (id: string) => MANAGERS.find((m) => m.id === id)
export const managersOfCompany = (companyId: string) => MANAGERS.filter((m) => m.companyId === companyId)

/* ───────────────────── E19 참여불가 기업 (090L · 090D) ───────────────────── */
export type ApplyState = '적용' | '해제' | '만료'
export interface SbBlockCo {
  id: string; companyId: string; company: string; bizNo: string
  reason: string; basis: '기업분류' | '부정행위'
  appliedAt: string; expireAt: string; applyState: ApplyState
  activeParticipations: { biz: string; sts: string; applyNo: string }[]
}
const rc = rand('B4-blockco')
export const BLOCKED_COMPANIES: SbBlockCo[] = Array.from({ length: 6 }, (_, i) => {
  const c = COMPANIES[(i * 7 + 3) % COMPANIES.length]
  return {
    id: `BC-${pad(i + 1, 3)}`, companyId: c.id, company: c.name, bizNo: c.bizNo,
    reason: pick(rc, ['부정 포인트 사용 적발', '허위 서류 제출', '기업분류 요건 미충족', '반복 미입금']),
    basis: i % 2 === 0 ? '부정행위' : '기업분류',
    appliedAt: '2026.06.01', expireAt: i % 3 === 0 ? '' : '2027.05.31',
    applyState: i % 4 === 3 ? '해제' : '적용',
    activeParticipations: i % 2 === 0 ? [{ biz: c.biz, sts: '610', applyNo: `2026${pad(i + 1, 4)}` }] : [],
  }
})
export const blockCoOf = (id: string) => BLOCKED_COMPANIES.find((b) => b.id === id)

/* ───────────────────── E20 참여불가 회원 (100L · 100D) ───────────────────── */
export interface SbBlockMember {
  id: string; workerName: string; birth: string; companyId: string; company: string
  detectPath: string; caseRef: string
  appliedAt: string; expireAt: string; applyState: ApplyState
}
const rb = rand('B4-blockmem')
export const BLOCKED_MEMBERS: SbBlockMember[] = Array.from({ length: 18 }, (_, i) => {
  const c = COMPANIES[(i * 5 + 1) % COMPANIES.length]
  return {
    id: `BM-${pad(i + 1, 3)}`, workerName: pick(rb, NAMES),
    birth: `${1970 + Math.floor(rb() * 30)}.${pad(1 + Math.floor(rb() * 12), 2)}.${pad(1 + Math.floor(rb() * 28), 2)}`,
    companyId: c.id, company: c.name,
    detectPath: pick(rb, ['중고거래 A 모니터링', '중고거래 B 모니터링', '기업 신고', '내부 감사']),
    caseRef: `FD-2026-${pad(i + 1, 4)}`,
    appliedAt: '2026.05.15', expireAt: i % 3 === 0 ? '' : '2027.05.14',
    applyState: i % 5 === 4 ? '만료' : i % 4 === 3 ? '해제' : '적용',
  }
})
export const blockMemberOf = (id: string) => BLOCKED_MEMBERS.find((b) => b.id === id)
export const BIZ_LABELS = BIZ
