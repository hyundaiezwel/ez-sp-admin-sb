/**
 * B2(사업관리) 전용 가짜 데이터 — SP-BIZ-010L/D · 020L/D · 030P · 040L/D.
 * 공통 기업 · 노동자는 `fixtures/sb/common.ts`(COMPANIES · WORKERS · applications)를 그대로 쓴다.
 * 전부 지어낸 값이다. 이 파일은 B2 화면만 import 한다.
 */
import { BIZ, CO_FG, YEARS } from '../../src/sp/codes'
import { COMPANIES, applications, pad, pick, rand, ymd } from './common'

/* --- 공통 꼴 --------------------------------------------------------------- */
export interface HistoryChange { field: string; before: string; after: string }
export interface HistoryEntry { id: string; at: string; by: string; reason: string; changes: HistoryChange[] }
const dt = (base: Date, days: number, h = 9, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, h, m)
const hm = (d: Date) => `${ymd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const NOW = new Date(2026, 8, 20)

/* --- E01 사업 --------------------------------------------------------------- */
export type BizStatus = '준비' | '모집중' | '심사중' | '발표' | '운영' | '종료'
export interface CapRow { cap: number; overAllow: boolean; minRate: number }
export interface SbBiz {
  code: string; year: number; round: number; type: '일반' | '발전'; name: string
  recruit: [Date, Date]; review: [Date, Date]; announceAt: Date; participate: [Date, Date]; deposit: [Date, Date]; pointUse: [Date, Date]
  status: BizStatus
  growthModelId: string | null
  participantType: '일반' | '동반성장'; extraAllow: boolean
  caps: Record<string, CapRow>
  cost: { worker: number; company: number; org: number }
  noticeText: string; bulkNotifyUse: boolean
  registeredBy: string; registeredAt: string
  history: HistoryEntry[]
}
const r1 = rand('B2-biz')
export const BIZ_LIST: SbBiz[] = BIZ.map((b, i) => {
  const recruit: [Date, Date] = [dt(NOW, -80 + i * 5), dt(NOW, -60 + i * 5)]
  const review: [Date, Date] = [dt(recruit[1], 1), dt(recruit[1], 10)]
  const announceAt = dt(review[1], 3)
  const participate: [Date, Date] = [dt(announceAt, 3), dt(announceAt, 90)]
  const deposit: [Date, Date] = [dt(announceAt, 3), dt(announceAt, 20)]
  const pointUse: [Date, Date] = [new Date(b.code === 'BIZ-26-04' ? 2027 : 2026, 0, 1), new Date(2026, 11, 31)]
  const status: BizStatus = i === 3 ? '모집중' : i === 2 ? '운영' : i === 1 ? '운영' : '운영'
  const caps: Record<string, CapRow> = Object.fromEntries(CO_FG.map((c) => [c.code, { cap: 50 + Math.floor(r1() * 200), overAllow: r1() > 0.5, minRate: Math.round(r1() * 30) }]))
  return {
    code: b.code, year: 2026, round: i + 1, type: b.code === 'BIZ-26-02' ? '발전' : '일반', name: b.label,
    recruit, review, announceAt, participate, deposit, pointUse, status,
    growthModelId: b.code === 'BIZ-26-02' ? 'GM-2026-01' : null,
    participantType: b.code === 'BIZ-26-03' ? '동반성장' : '일반', extraAllow: b.code !== 'BIZ-26-04',
    caps, cost: { worker: 100_000, company: 50_000, org: 50_000 }, noticeText: '모집 마감 후 선정 결과는 개별 안내됩니다.',
    bulkNotifyUse: true, registeredBy: '김*수', registeredAt: hm(dt(recruit[0], -30)),
    history: [{ id: `H-${b.code}-0`, at: hm(dt(recruit[0], -30)), by: '김*수', reason: '등록', changes: [] }],
  }
})
export const bizOf = (code: string) => BIZ_LIST.find((b) => b.code === code)
/** 참여 건수 — 변경 영향 계산에 쓴다(공통 applications 재사용) */
export const applicationCountOf = (code: string) => applications(code).length

/* --- E02 발전모델 ------------------------------------------------------------ */
export interface SbGrowthModel {
  id: string; year: number; name: string; years: string; coFgs: string[]
  applyMode: '조건' | '지정'; designated: string[]
  totalAmount: number; share: { org: number; company: number; worker: number }
  linkedBizCode: string | null; updatedAt: string; updatedBy: string
  history: HistoryEntry[]
}
export const YEAR_OPTS = ['1년 이상', '2년 이상', '3년 이상', '4년 이상', '5년 이상', '6년 이상', '7년 이상']
export const GROWTH_MODELS: SbGrowthModel[] = [
  {
    id: 'GM-2026-01', year: 2026, name: '누적참여 5년차 이상 중기업', years: '5년 이상', coFgs: ['3', '4'],
    applyMode: '조건', designated: [],
    totalAmount: 400_000, share: { org: 200_000, company: 150_000, worker: 50_000 },
    linkedBizCode: 'BIZ-26-02', updatedAt: hm(dt(NOW, -40)), updatedBy: '박*영',
    history: [{ id: 'H-GM-01-0', at: hm(dt(NOW, -40)), by: '박*영', reason: '등록', changes: [] }],
  },
  {
    id: 'GM-2026-02', year: 2026, name: '중견기업 추가참여 우대', years: '3년 이상', coFgs: ['4'],
    applyMode: '지정', designated: [COMPANIES[2].id, COMPANIES[9].id],
    totalAmount: 350_000, share: { org: 180_000, company: 120_000, worker: 50_000 },
    linkedBizCode: 'BIZ-26-03', updatedAt: hm(dt(NOW, -18)), updatedBy: '박*영',
    history: [
      { id: 'H-GM-02-0', at: hm(dt(NOW, -60)), by: '박*영', reason: '등록', changes: [] },
      { id: 'H-GM-02-1', at: hm(dt(NOW, -18)), by: '박*영', reason: '지정 기업 추가', changes: [{ field: '지정 기업', before: `${COMPANIES[2].name}`, after: `${COMPANIES[2].name}, ${COMPANIES[9].name}` }] },
    ],
  },
  { id: 'GM-2027-01', year: 2027, name: '27년 발전모델(준비중)', years: '4년 이상', coFgs: ['2', '3'], applyMode: '조건', designated: [], totalAmount: 300_000, share: { org: 150_000, company: 100_000, worker: 50_000 }, linkedBizCode: null, updatedAt: hm(dt(NOW, -2)), updatedBy: '박*영', history: [{ id: 'H-GM-27-0', at: hm(dt(NOW, -2)), by: '박*영', reason: '등록', changes: [] }] },
]
export const modelOf = (id: string) => GROWTH_MODELS.find((m) => m.id === id)
/** 조건 일치 적용기업 — 누적참여년수를 기업 id 해시로 지어낸다(미리보기용) */
const yearsOf = (companyId: string) => 1 + (parseInt(companyId.slice(-3), 10) % 8)
export const appliedCompaniesOf = (m: SbGrowthModel) => {
  const minYears = parseInt(m.years, 10)
  const cond = COMPANIES.filter((c) => m.coFgs.includes(c.coFg) && yearsOf(c.id) >= minYears).map((c) => ({ company: c, basis: '조건 일치' as const, years: yearsOf(c.id) }))
  const designated = COMPANIES.filter((c) => m.designated.includes(c.id)).map((c) => ({ company: c, basis: '지정' as const, years: yearsOf(c.id) }))
  const seen = new Set(cond.map((x) => x.company.id))
  return [...cond, ...designated.filter((x) => !seen.has(x.company.id))]
}

/* --- E03 추가모집 설정(SP-BIZ-030P) ------------------------------------------ */
export interface SbWindow {
  id: string; bizCode: string; growthOnly: boolean; coFg: string
  status: '열림' | '닫힘'; apply: [Date, Date]; depositEnd: Date
  updatedBy: string; updatedAt: string; pendingCount: number
}
const r2 = rand('B2-window')
export const WINDOWS: SbWindow[] = [
  { id: 'W-01', bizCode: 'BIZ-26-01', growthOnly: false, coFg: '3', status: '열림', apply: [dt(NOW, -3, 9, 0), dt(NOW, 4, 18, 0)], depositEnd: dt(NOW, 11), updatedBy: '이*훈', updatedAt: hm(dt(NOW, -3)), pendingCount: 5 },
  { id: 'W-02', bizCode: 'BIZ-26-01', growthOnly: false, coFg: '4', status: '열림', apply: [dt(NOW, -3, 9, 0), dt(NOW, 4, 18, 0)], depositEnd: dt(NOW, 11), updatedBy: '이*훈', updatedAt: hm(dt(NOW, -3)), pendingCount: 2 },
  { id: 'W-03', bizCode: 'BIZ-26-02', growthOnly: true, coFg: '3', status: '닫힘', apply: [dt(NOW, -60, 9, 0), dt(NOW, -50, 18, 0)], depositEnd: dt(NOW, -43), updatedBy: '박*영', updatedAt: hm(dt(NOW, -50)), pendingCount: 0 },
]
/** 기업구분별 실시간 집계 — applications() 재사용, 사업별로 흩어 배정 */
export function aggregateOf(bizCode: string) {
  const apps = applications(bizCode)
  return CO_FG.map((c, i) => {
    const slice = apps.filter((_, idx) => idx % CO_FG.length === i)
    const companies = new Set(slice.map((a) => a.companyId)).size
    const people = slice.length * (2 + Math.floor(r2() * 5))
    const amount = people * 200_000
    return { coFg: c.code, label: c.label, companies, people, amount }
  })
}

/* --- E04 기업(동반성장기업 = 참여기관) — SP-BIZ-040L/D ------------------------ */
export interface SbManager { id: string; name: string; phone: string; email: string; status: '등록(가입)' | '등록(미가입)' | '미등록' }
export interface SbLink { companyId: string; linkedAt: string; linkedBy: string; releasedAt?: string; releasedBy?: string; releasedReason?: string }
export interface SbPartner {
  id: string; name: string; bizNo: string; year: number; pointDeadline: string; note: string
  registeredAt: string; updatedAt: string
  managers: SbManager[]; links: SbLink[]
  history: HistoryEntry[]
}
const PARTNER_NAMES = ['한빛전자(주)', '가온그룹', '누리홀딩스', '온결공공기관']
const r3 = rand('B2-partner')
export const PARTNERS: SbPartner[] = PARTNER_NAMES.map((name, i) => {
  const linkedCompanies = COMPANIES.slice(i * 4, i * 4 + 3 + (i % 2))
  return {
    id: `PT-${pad(i + 1, 3)}`, name, bizNo: `000-00-${pad(90 + i, 5)}`, year: 2026,
    pointDeadline: '2026.12.31', note: i === 3 ? '기부 기관 정책 — 사용기한 별도 협의' : '',
    registeredAt: hm(dt(NOW, -120 + i * 10)), updatedAt: hm(dt(NOW, -5 - i)),
    managers: [
      { id: `MG-${i}-1`, name: pick(r3, ['정민호', '이서연', '박지훈', '최유나']), phone: `010-0000-${pad(7000 + i, 4)}`, email: `partner${i}@example.com`, status: i % 3 === 0 ? '등록(가입)' : i % 3 === 1 ? '등록(미가입)' : '미등록' },
    ],
    links: linkedCompanies.map((c, j) => ({ companyId: c.id, linkedAt: hm(dt(NOW, -100 + i * 10 + j * 3)), linkedBy: '김*수', ...(i === 2 && j === 0 ? { releasedAt: hm(dt(NOW, -20)), releasedBy: '박*영', releasedReason: '협력 계약 종료' } : {}) })),
    history: [{ id: `H-PT-${i}-0`, at: hm(dt(NOW, -120 + i * 10)), by: '김*수', reason: '등록', changes: [] }],
  }
})
export const partnerOf = (id: string) => PARTNERS.find((p) => p.id === id)
/** 참여년도 없는 참가자(노동자) 대체 집계 — 연계 기업의 WORKERS 대신 지어낸 값 */
export const participantsOf = (p: SbPartner) => p.links.filter((l) => !l.releasedAt).map((l, i) => ({
  companyId: l.companyId, total: 4 + (i % 5), started: 2 + (i % 3),
}))
/** 이미 다른 기관에 연계된 기업 id — 데모용으로 두 번째 기관의 두 번째 연계를 고정 충돌로 둔다 */
export const linkedElsewhere = (companyId: string, exceptPartnerId: string) =>
  PARTNERS.find((p) => p.id !== exceptPartnerId && p.links.some((l) => l.companyId === companyId && !l.releasedAt))
