/**
 * B3(사업참여관리 A) 전용 가짜 데이터 — SP-PRT-010D · 020L/D · 050L · 060P · 070P · 080P.
 * 신청 건은 `fixtures/sb/common.ts`(applications)를 그대로 쓴다. 이 파일은 선정완료 이후
 * 단계(참여 건)를 다룬다. 전부 지어낸 값이다. 이 파일은 B3 화면만 import 한다.
 */
import { COMPANIES, pad, pick, rand, ymd } from './common'
import { BIZ } from '../../src/sp/codes'

const dt = (base: Date, days: number, h = 9, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, h, m)
const hm = (d: Date) => `${ymd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const NOW = new Date(2026, 8, 20)

export interface HistoryEntry { id: string; at: string; by: string; from: string; to: string; action: string; reason: string }
export interface Memo { id: string; at: string; by: string; text: string }
export interface DepositRow { seq: number; amount: number; at: string; by: string; note: string }
export interface NoticeRow { id: string; trigger: string; channel: 'LMS' | 'Email'; at: string; result: '성공' | '실패' }

export interface SbParticipation {
  id: string; no: number
  companyId: string; name: string; bizNo: string; coFg: string; manager: string; phone: string
  biz: string
  /** 참여 상태 — src/sp/codes.ts STATES(210~840) */
  sts: string
  participants: { initial: number; extra: number; final: number }
  regApprovedAt: string | null
  depositDeadline: string | null
  vAccount: { no: string | null; issuedAt: string | null; target: number; paid: number; dueUnpaid: boolean; rows: DepositRow[] }
  refundMethod: '기업' | '개인' | '기업+개인'
  cert: { issued: boolean; no: string | null; issuedAt: string | null; issuedBy: string | null; people: number | null; replaced: boolean }
  cancelReason: string | null
  memos: Memo[]
  history: HistoryEntry[]
  notices: NoticeRow[]
}

/** 목록 화면 대상 상태 분포 — 등록승인 이후 전체(510~840) + 계약 단계 일부(310~410) */
const P_STS: [string, number][] = [
  ['410', 6], ['510', 10], ['520', 8], ['590', 4],
  ['610', 4], ['611', 10], ['612', 4], ['613', 6], ['614', 14], ['615', 2], ['616', 4],
  ['710', 4], ['810', 3], ['820', 3], ['830', 4], ['840', 1], ['390', 3], ['320', 2],
]
const weighted = (rr: () => number, w: [string, number][]) => {
  let x = rr() * w.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of w) if ((x -= n) < 0) return k
  return w[0][0]
}

const partCache = new Map<string, SbParticipation[]>()
export function participations(biz: string, n = 140): SbParticipation[] {
  const hit = partCache.get(biz)
  if (hit) return hit
  const rr = rand('b3-part-' + biz)
  const rows: SbParticipation[] = Array.from({ length: n }, (_, i) => {
    const c = COMPANIES[Math.floor(rr() * COMPANIES.length)]
    const sts = weighted(rr, P_STS)
    const approved = dt(NOW, -140 + Math.floor(rr() * 130))
    const deadline = dt(approved, 14)
    const initial = 2 + Math.floor(rr() * 18)
    const extra = rr() > 0.7 ? Math.floor(rr() * 5) : 0
    const final = initial + extra
    const target = final * 200_000
    const paidStage = ['520', '610', '611', '612', '613', '614', '615', '616', '710', '810', '820', '830', '840'].includes(sts)
    const partialStage = sts === '510' || sts === '613'
    const paid = paidStage ? target : partialStage && rr() > 0.5 ? Math.round((target * (0.3 + rr() * 0.4)) / 10_000) * 10_000 : 0
    const hasVAcct = !['410', '390', '320'].includes(sts)
    const certIssuable = ['610', '611', '612', '613', '614', '615', '616', '710', '810', '820', '830'].includes(sts)
    const certIssued = certIssuable && rr() > 0.4
    const id = `PT-${biz.slice(-2)}-${pad(i + 1, 5)}`
    const hist: HistoryEntry[] = [{ id: `${id}-H0`, at: hm(dt(approved, -3)), by: '김*수', from: '410', to: '410', action: '최종제출', reason: '' }]
    if (['510', '520', '590', '610', '611', '612', '613', '614', '615', '616', '710', '810', '820', '830', '840'].includes(sts)) {
      hist.push({ id: `${id}-H1`, at: hm(approved), by: '박*영', from: '410', to: '510', action: '등록승인', reason: '' })
    }
    return {
      id, no: n - i, companyId: c.id, name: c.name, bizNo: c.bizNo, coFg: c.coFg, manager: c.manager, phone: c.phone, biz, sts,
      participants: { initial, extra, final },
      regApprovedAt: hasVAcct ? hm(approved) : null,
      depositDeadline: hasVAcct ? ymd(deadline) : null,
      vAccount: hasVAcct
        ? {
            no: `822-${pad(1000 + i, 4)}-${pad(1 + (i % 9999), 4)}`,
            issuedAt: hm(approved),
            target, paid,
            dueUnpaid: deadline < NOW && paid < target,
            rows: paid > 0 ? [{ seq: 1, amount: paid, at: hm(dt(approved, 2 + Math.floor(rr() * 8))), by: paidStage ? '박*영' : '이*훈', note: paidStage ? '가상계좌 입금' : '분할 입금' }] : [],
          }
        : { no: null, issuedAt: null, target, paid: 0, dueUnpaid: false, rows: [] },
      refundMethod: pick(rr, ['기업', '개인', '기업+개인'] as const),
      cert: { issued: certIssued, no: certIssued ? `CERT-2026-${pad(i + 1, 5)}` : null, issuedAt: certIssued ? hm(dt(approved, 30)) : null, issuedBy: certIssued ? '박*영' : null, people: certIssued ? final : null, replaced: false },
      cancelReason: sts === '590' ? '입금기한 경과 미입금' : sts === '390' ? '기업 요청(사업 축소)' : null,
      memos: [],
      history: hist,
      notices: hasVAcct ? [{ id: `${id}-N0`, trigger: '등록승인', channel: 'LMS' as const, at: hm(approved), result: (rr() > 0.1 ? '성공' : '실패') as '성공' | '실패' }] : [],
    }
  }).sort((a, b) => b.no - a.no)
  partCache.set(biz, rows)
  return rows
}
export const participationOf = (id: string) => BIZ.map((b) => participations(b.code)).flat().find((p) => p.id === id)

/* --- 참여기업등록(SP-PRT-070P) 업로드 실행 이력 --------------------------------- */
export interface UploadRow { no: number; name: string; bizNo: string; coFg: string; phone: string; result: '정상' | '경고' | '오류'; reason: string }
export interface UploadRun { id: string; at: string; by: string; file: string; total: number; ok: number; excluded: number }
const r4 = rand('b3-upload')
export const SAMPLE_UPLOAD_ROWS: UploadRow[] = Array.from({ length: 10 }, (_, i) => {
  if (i === 3) return { no: i + 1, name: '온결전자', bizNo: '000-00-91234', coFg: '3', phone: '010.0000.0001', result: '오류', reason: '휴대전화는 숫자만 입력' }
  if (i === 6) return { no: i + 1, name: '가온복지회', bizNo: '000-00-00003', coFg: '6', phone: '010-0000-2201', result: '경고', reason: '참여불가 기업 명단에 있음' }
  const c = pick(r4, COMPANIES)
  return { no: i + 1, name: `${c.name}${i}`, bizNo: `000-00-8${pad(1000 + i, 4)}`, coFg: c.coFg, phone: `010-0000-${pad(2000 + i, 4)}`, result: '정상', reason: '' }
})
export const UPLOAD_RUNS: UploadRun[] = [
  { id: 'UP-01', at: hm(dt(NOW, -30)), by: '박*영', file: '참여기업_일괄등록_0821.xlsx', total: 24, ok: 22, excluded: 2 },
  { id: 'UP-02', at: hm(dt(NOW, -12)), by: '김*수', file: '참여기업_일괄등록_0908.xlsx', total: 15, ok: 15, excluded: 0 },
]

/* --- 일괄참여취소(SP-PRT-080P) 실행 이력 --------------------------------------- */
export interface CancelRun { id: string; at: string; by: string; cond: string; total: number; excluded: number }
export const CANCEL_RUNS: CancelRun[] = [
  { id: 'BC-01', at: hm(dt(NOW, -60)), by: '이*훈', cond: '보완필요', total: 8, excluded: 1 },
  { id: 'BC-02', at: hm(dt(NOW, -20)), by: '이*훈', cond: '분담금 미입금', total: 14, excluded: 3 },
]
