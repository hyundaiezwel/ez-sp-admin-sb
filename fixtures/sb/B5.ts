/**
 * B5(노동자 포인트관리 · 정산) 전용 가짜 데이터 — SP-PNT-010L/D · SP-PNT-020L ·
 * SP-STL-010L/D · 020L/D · 030L/D · 040L/D · 050P.
 * 기업 · 노동자는 `fixtures/sb/common.ts`를 그대로 쓴다. 전부 지어낸 값이다.
 * 이 파일은 B5 화면만 import 한다 — 다른 배치 파일을 import 하지 않는다.
 */
import { COMPANIES, WORKERS, pad, pick, rand, ymd, type SbWorker } from './common'

const hm = (d: Date) => `${ymd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const won = (n: number) => Math.round(n / 1000) * 1000

/* --- SP-PNT-010L/D · SP-PNT-020L — 포인트 배정 · 사용 ---------------------- */
export type PointKind = '지원기관 포인트' | '기업 포인트' | '개인 포인트'
export const POINT_KINDS: PointKind[] = ['지원기관 포인트', '기업 포인트', '개인 포인트']
export interface PointBand { kind: PointKind; initial: number; actual: number; usable: number; used: number; remain: number; startAt: string; endAt: string }
export interface UsageTx {
  id: string; workerId: string; appliedAt: string; approvedAt: string; boughtAt: string
  channel: '기본차감' | '온라인' | '복지카드' | '영수증'; affiliate: string; category: string; desc: string
  amount: number; status: '사용' | '취소'; byKind: Record<PointKind, number>
}
const AFFILIATES = ['전용몰', '한빛레저', '가온스테이', '누리푸드', '온결헬스', '바른교육', '미르뷰티', '다온가전']
const CATEGORIES = ['숙박', '레저', '건강', '문화', '교육', '생활', '식품']

const WORKER_STARTED = new Date(2026, 0, 20)
function assignsOf(w: SbWorker): PointBand[] {
  const r = rand('sb-b5-assign-' + w.id)
  const total = Math.max(300_000, w.point + Math.round(r() * 500_000))
  const shares: [PointKind, number][] = [['지원기관 포인트', 1], ['기업 포인트', 1], ['개인 포인트', 2]]
  const sum = shares.reduce((s, [, n]) => s + n, 0)
  return shares.map(([kind, n]) => {
    const initial = won((total * n) / sum)
    const adjust = r() < 0.15 ? won(initial * (r() * 0.1 - 0.05)) : 0
    const actual = initial + adjust
    const used = Math.min(actual, Math.round(w.point * (n / sum) * (0.6 + r() * 0.6)))
    return {
      kind, initial, actual, usable: actual, used, remain: actual - used,
      startAt: ymd(WORKER_STARTED), endAt: `2026.12.31`,
    }
  })
}
function usageOf(w: SbWorker): UsageTx[] {
  const r = rand('sb-b5-usage-' + w.id)
  const n = 4 + Math.floor(r() * 10)
  const rows: UsageTx[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(2026, Math.floor(r() * 9), 1 + Math.floor(r() * 27), 9 + Math.floor(r() * 11), Math.floor(r() * 60))
    const approve = new Date(d.getTime() + 0)
    const bought = new Date(d.getTime() + 86_400_000)
    const channel = pick(r, ['기본차감', '온라인', '복지카드', '영수증'] as const)
    const canceled = r() < 0.12
    const amount = won(5_000 + Math.floor(r() * 120_000)) * (canceled ? -1 : 1)
    const orgShare = won(Math.abs(amount) * 0.25), coShare = won(Math.abs(amount) * 0.25)
    const perShare = Math.abs(amount) - orgShare - coShare
    const sign = canceled ? -1 : 1
    rows.push({
      id: `U-${w.id}-${pad(i + 1, 3)}`, workerId: w.id, appliedAt: hm(d), approvedAt: hm(approve), boughtAt: ymd(bought),
      channel, affiliate: pick(r, AFFILIATES), category: pick(r, CATEGORIES), desc: `${pick(r, CATEGORIES)} 상품 결제`,
      amount, status: canceled ? '취소' : '사용',
      byKind: { '지원기관 포인트': orgShare * sign, '기업 포인트': coShare * sign, '개인 포인트': perShare * sign },
    })
  }
  return rows.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
}
const assignCache = new Map<string, PointBand[]>()
const usageCache = new Map<string, UsageTx[]>()
export function assignsOfWorker(id: string): PointBand[] {
  const w = WORKERS.find((x) => x.id === id)
  if (!w) return []
  if (!assignCache.has(id)) assignCache.set(id, assignsOf(w))
  return assignCache.get(id)!
}
export function usageOfWorker(id: string): UsageTx[] {
  const w = WORKERS.find((x) => x.id === id)
  if (!w) return []
  if (!usageCache.has(id)) usageCache.set(id, usageOf(w))
  return usageCache.get(id)!
}
/** 이용내역목록(SP-PNT-020L) — 전 노동자 사용 거래를 평면으로 편다 */
export interface UsageRow extends UsageTx { name: string; empNo: string; companyId: string; company: string; ageBand: string; gender: '남' | '여' }
let usageAll: UsageRow[] | null = null
export function allUsage(): UsageRow[] {
  if (usageAll) return usageAll
  const r = rand('sb-b5-usage-demo')
  const out: UsageRow[] = WORKERS.flatMap((w) => {
    const ageNum = 2026 - parseInt(w.birth.slice(0, 4), 10)
    const band = ageNum < 30 ? '20대' : ageNum < 40 ? '30대' : ageNum < 50 ? '40대' : ageNum < 60 ? '50대' : '60대 이상'
    return usageOf(w).map((u): UsageRow => ({
      ...u, name: w.name, empNo: w.empNo, companyId: w.companyId, company: w.company,
      ageBand: band, gender: r() < 0.5 ? '남' : '여',
    }))
  }).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  usageAll = out
  return out
}

/* --- SP-STL-010L/D — 전자청구서 --------------------------------------------- */
export interface BillDoc {
  no: string; ym: string; target: string; docNo: string
  online: number; offline: number; total: number
  status: '작성중' | '발행(미승인)' | '승인' | '반려'
  issuedAt: string | null; approver: string | null; approvedAt: string | null; rejectReason: string | null
  orgAmt: number; coPersonAmt: number
}
const BILL_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09']
const billCache: BillDoc[] = (() => {
  const r = rand('sb-b5-bill')
  return BILL_MONTHS.map((m, i) => {
    const online = won(30_000_000 + r() * 20_000_000), offline = won(10_000_000 + r() * 8_000_000)
    const total = online + offline
    const orgAmt = won(total * 0.25), coPersonAmt = total - orgAmt
    const late = i === BILL_MONTHS.length - 1
    const rejected = i === BILL_MONTHS.length - 2 && r() < 0.5
    const status: BillDoc['status'] = late ? '발행(미승인)' : rejected ? '반려' : '승인'
    const issuedAt = `2026.${m}.28 18:00`
    return {
      no: `B-2026${m}`, ym: `2026.${m}`, target: '전체 기업', docNo: `E-2026${m}-001`,
      online, offline, total, status, issuedAt,
      approver: status === '승인' ? '박*현(지원총괄)' : null,
      approvedAt: status === '승인' ? `2026.${m}.29 10:00` : null,
      rejectReason: status === '반려' ? '항목내역 청구대상 합계가 청구문서 합계와 다릅니다 — 재발행 요청' : null,
      orgAmt, coPersonAmt,
    }
  })
})()
export const BILLS: BillDoc[] = billCache
export const billOf = (ym: string) => BILLS.find((b) => b.ym === ym) ?? null
export interface BillItem { category: string; monthUsed: number; excluded: number; target: number }
export function billItems(ym: string): BillItem[] {
  const r = rand('sb-b5-billitem-' + ym)
  return CATEGORIES.map((c) => {
    const monthUsed = won(2_000_000 + r() * 6_000_000)
    const excluded = won(monthUsed * r() * 0.08)
    return { category: c, monthUsed, excluded, target: monthUsed - excluded }
  })
}
export interface BillDetailRow { id: string; workerId: string; name: string; company: string; rank: string; appliedAt: string; desc: string; kind: '사용' | '취소'; workerAmt: number; coAmt: number }
export function billDetail(ym: string): BillDetailRow[] {
  const [, m] = ym.split('.')
  return allUsage().filter((u) => u.appliedAt.slice(5, 7) === m).map((u, i) => ({
    id: `${ym}-${pad(i + 1, 4)}`, workerId: u.workerId, name: u.name, company: u.company, rank: '참여자',
    appliedAt: u.appliedAt, desc: u.desc, kind: u.status === '취소' ? '취소' : '사용',
    workerAmt: u.byKind['개인 포인트'], coAmt: u.byKind['기업 포인트'],
  }))
}
export interface BillUserRow { workerId: string; name: string; company: string; count: number; amount: number }
export function billUserSummary(ym: string): BillUserRow[] {
  const rows = billDetail(ym)
  const map = new Map<string, BillUserRow>()
  for (const r of rows) {
    const cur = map.get(r.workerId) ?? { workerId: r.workerId, name: r.name, company: r.company, count: 0, amount: 0 }
    cur.count += 1; cur.amount += r.workerAmt + r.coAmt
    map.set(r.workerId, cur)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

/* --- SP-STL-020L/D — 청구내역서(기업별) -------------------------------------- */
const BILL_COS = COMPANIES.slice(0, 22)
export interface CompanyBill { companyId: string; ym: string; coPersonAmt: number; orgAmt: number; deposit: number; refund: number }
const coBillCache: CompanyBill[] = (() => {
  const r = rand('sb-b5-cobill')
  const rows: CompanyBill[] = []
  for (const c of BILL_COS) for (const m of BILL_MONTHS) {
    const coPersonAmt = won(400_000 + r() * 2_000_000)
    const skew = r() < 0.08
    const orgAmt = won(coPersonAmt / 3) + (skew ? won(coPersonAmt * 0.1) : 0)
    rows.push({ companyId: c.id, ym: `2026.${m}`, coPersonAmt, orgAmt, deposit: coPersonAmt + orgAmt, refund: r() < 0.1 ? won(coPersonAmt * 0.05) : 0 })
  }
  return rows
})()
export const COMPANY_BILLS: CompanyBill[] = coBillCache
export const companyBillsOf = (companyId: string) => COMPANY_BILLS.filter((b) => b.companyId === companyId)

/* --- SP-STL-030L/D — 잔액현황 ------------------------------------------------ */
export interface DepositRow { seq: number; kind: '최초' | '추가 인원'; people: number; coPersonAmt: number; orgAmt: number; dueAt: string; paidAt: string | null }
export interface MonthWithdraw { ym: string; withdrawCoPerson: number; withdrawOrg: number; refundCoPerson: number; refundOrg: number; billApproved: boolean }
export interface CompanyBalance {
  companyId: string; applyNo: string; vAccount: string
  initCoPerson: number; initOrg: number; withdrawCoPerson: number; withdrawOrg: number; refundCoPerson: number; refundOrg: number
  remainCoPerson: number; remainOrg: number
  deposits: DepositRow[]; monthly: MonthWithdraw[]; updatedAt: string
}
const balCache: CompanyBalance[] = (() => {
  const r = rand('sb-b5-balance')
  return BILL_COS.map((c, idx) => {
    const bills = companyBillsOf(c.id)
    const withdrawCoPerson = bills.reduce((s, b) => s + b.coPersonAmt, 0)
    const withdrawOrg = bills.reduce((s, b) => s + b.orgAmt, 0)
    const refundCoPerson = won(withdrawCoPerson * (0.02 + r() * 0.04))
    const refundOrg = won(withdrawOrg * (0.02 + r() * 0.04))
    const initCoPerson = won((withdrawCoPerson + refundCoPerson) * (1.05 + r() * 0.1))
    const initOrg = won(initCoPerson / 3)
    const mismatch = idx === 3
    const remainCoPerson = initCoPerson - withdrawCoPerson - refundCoPerson + (mismatch ? 50_000 : 0)
    const remainOrg = initOrg - withdrawOrg - refundOrg
    const deposits: DepositRow[] = [
      { seq: 1, kind: '최초', people: 40 + Math.floor(r() * 60), coPersonAmt: won(initCoPerson * 0.8), orgAmt: won(initOrg * 0.8), dueAt: '2026.02.10', paidAt: '2026.02.09' },
      { seq: 2, kind: '추가 인원', people: 5 + Math.floor(r() * 10), coPersonAmt: won(initCoPerson * 0.2), orgAmt: won(initOrg * 0.2), dueAt: '2026.05.10', paidAt: r() < 0.85 ? '2026.05.08' : null },
    ]
    const monthly: MonthWithdraw[] = BILL_MONTHS.map((m) => {
      const b = bills.find((x) => x.ym === `2026.${m}`)
      const bill = billOf(`2026.${m}`)
      return { ym: `2026.${m}`, withdrawCoPerson: b?.coPersonAmt ?? 0, withdrawOrg: b?.orgAmt ?? 0, refundCoPerson: won((b?.refund ?? 0) * 0.75), refundOrg: won((b?.refund ?? 0) * 0.25), billApproved: bill?.status === '승인' }
    })
    return {
      companyId: c.id, applyNo: `2026${pad(idx + 1, 5)}`, vAccount: `822-9${pad(idx + 1, 3)}-${pad(1000 + idx, 4)}`,
      initCoPerson, initOrg, withdrawCoPerson, withdrawOrg, refundCoPerson, refundOrg, remainCoPerson, remainOrg,
      deposits, monthly, updatedAt: '2026.09.29 06:00',
    }
  })
})()
export const BALANCES: CompanyBalance[] = balCache
export const balanceOf = (companyId: string) => BALANCES.find((b) => b.companyId === companyId) ?? null

/* --- SP-STL-040L/D — 환불내역 ------------------------------------------------ */
export type RefundSt = '환불요청' | '환불대상' | '환불완료' | '환불실패'
export interface RefundHist { at: string; by: string; before: string; after: string; reason: string }
export interface RefundItem {
  id: string; workerId: string; name: string; suspendAt: string; ym: string
  method: '기업' | '개인' | '기업+개인'; amtPerson: number; amtCompany: number; orgRecall: number
  status: RefundSt; changed: boolean; canSwitchToCompany: boolean; history: RefundHist[]
}
export interface RefundRound { companyId: string; ym: string; round: number; acctNo: string; issuedAt: string; items: RefundItem[] }
const refundCache: RefundRound[] = (() => {
  const r = rand('sb-b5-refund')
  const rows: RefundRound[] = []
  BILL_COS.slice(0, 14).forEach((c, ci) => {
    const workers = WORKERS.filter((w) => w.companyId === c.id)
    if (!workers.length) return
    ['2026.08', '2026.09'].forEach((ym, mi) => {
      const n = 1 + Math.floor(r() * Math.min(3, workers.length))
      const items: RefundItem[] = Array.from({ length: n }, (_, i) => {
        const w = workers[i % workers.length]
        const amtPerson = won(20_000 + r() * 180_000), amtCompany = won(amtPerson * 0.3), orgRecall = won(amtPerson * 0.25)
        const st = pick(r, ['환불대상', '환불완료', '환불완료', '환불실패'] as RefundSt[])
        return {
          id: `RF-${c.id}-${ym}-${i}`, workerId: w.id, name: w.name, suspendAt: `2026.${String(7 + mi).padStart(2, '0')}.15`, ym,
          method: pick(r, ['기업', '개인', '기업+개인'] as const), amtPerson, amtCompany, orgRecall,
          status: st, changed: st === '환불실패' && r() < 0.3, canSwitchToCompany: r() < 0.85,
          history: st === '환불실패' ? [{ at: `2026.${String(7 + mi).padStart(2, '0')}.20 11:00`, by: '(시스템)', before: '환불대상', after: '환불실패', reason: '계좌 확인 실패' }] : [],
        }
      })
      rows.push({ companyId: c.id, ym, round: 1, acctNo: `123-45-${pad(60000 + ci, 6)}`, issuedAt: `${ym}.28 18:00`, items })
    })
  })
  return rows
})()
export const REFUND_ROUNDS: RefundRound[] = refundCache
export const refundRoundOf = (companyId: string, ym: string, round: number) =>
  REFUND_ROUNDS.find((x) => x.companyId === companyId && x.ym === ym && x.round === round) ?? null

/* --- SP-STL-050P — 일매출자료 ------------------------------------------------- */
export interface DailySales { date: string; count: number; amount: number; general: number; familyFriendly: number }
export function dailySales(dateStr: string): DailySales {
  const r = rand('sb-b5-daily-' + dateStr)
  const count = 600 + Math.floor(r() * 700)
  const general = won(count * (30_000 + r() * 10_000))
  const familyFriendly = won(general * (0.15 + r() * 0.1))
  return { date: dateStr, count, amount: general + familyFriendly, general, familyFriendly }
}
