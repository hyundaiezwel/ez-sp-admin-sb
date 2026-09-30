import { pad, ymd, pick, rand, COMPANIES, WORKERS } from './common'
import { CO_FG, BIZ } from '../../src/sp/codes'

/**
 * B8 통계분석 — 전부 지어낸 집계값이다. 배치 전용이라 다른 배치 파일에서 import하지 않는다.
 * 통계 화면은 실적을 다시 계산하지 않는다 — 화면이 볼 집계 결과를 여기서 미리 만든다.
 */
const weighted = <T extends string>(r: () => number, w: [T, number][]): T => {
  let x = r() * w.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of w) if ((x -= n) < 0) return k
  return w[0][0]
}
const days = (n: number, end = new Date(2026, 8, 30)) =>
  Array.from({ length: n }, (_, i) => ymd(new Date(end.getFullYear(), end.getMonth(), end.getDate() - (n - 1 - i))))

/* --- 010P 신청·승인통계 --------------------------------------------------- */
const r10 = rand('B8-010P')
export const APPLY_REPORT = {
  reportedAt: '2026.09.30 00:12',
  daily: { applied: 42, appliedCo: 30, confirmed: 27, confirmedCo: 21 },
  cumulative: { applied: 9840, appliedCo: 3120, confirmed: 7772, confirmedCo: 2540 },
  point: {
    buy: { amt: 84_320_000, cnt: 612 }, cancel: { amt: -3_180_000, cnt: 41 },
    net: { amt: 81_140_000, cnt: 653 }, total: { amt: 4_213_600_000, cnt: 31_204 },
  },
  supplement: { total: 214, requested: 38, submitted: 52, done: 124, avgDays: 2.4 },
  recruit: BIZ.map((b, i) => {
    const cap = [1200, 400, 260, 180][i]
    const applied = Math.round(cap * (0.7 + r10() * 0.5))
    const approved = Math.round(applied * (0.6 + r10() * 0.3))
    return { biz: b.code, label: b.label, cap, applied, approved, rate: Math.round((approved / cap) * 1000) / 10 }
  }),
}
export interface StaCompanyRow { id: string; name: string; bizNo: string; coFg: string; manager: string; phone: string; applied: number; confirmed: number }
export const APPLY_CO_LIST: StaCompanyRow[] = COMPANIES.slice(0, 24).map((c, i) => ({
  id: c.id, name: c.name, bizNo: c.bizNo, coFg: c.coFg, manager: c.manager, phone: c.phone,
  applied: 3 + (i % 9), confirmed: 2 + (i % 7),
}))

/* --- 011P 이용정지통계 ----------------------------------------------------- */
const REASONS = ['퇴사(이직)', '개인사유', '신분변경', '기업경영악화', '복지제도 변경', '동반성장모델 지원 기한 종료', '기타']
const r11 = rand('B8-011P')
export const STOP_MATRIX: number[][] = REASONS.map(() => CO_FG.map(() => Math.round(r11() * 12)))
export const STOP_WITHDRAWN = 9

/* --- 020P 참여기업통계 ------------------------------------------------------ */
const r20 = rand('B8-020P')
export const CO_FG_TABLE = CO_FG.map((f) => {
  const co = Math.round(20 + r20() * 180)
  const worker = co * Math.round(3 + r20() * 6)
  return { code: f.code, label: f.label, co, worker, amount: worker * Math.round(150_000 + r20() * 60_000) }
})
export const PARTICIPATION_TYPE = [
  { type: '일반', co: 612, worker: 4820 },
  { type: '발전모델', co: 44, worker: 310 },
  { type: '동반성장', co: 28, worker: 205 },
]
export const REJOIN_COUNT = Array.from({ length: 9 }, (_, i) => ({ times: i + 1, co: Math.round(300 / (i + 1.4)) }))
export const REJOIN_RATE = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => ({
  year: y, rate: y <= 2020 ? null : Math.round((28 + (y - 2021) * 3.4) * 10) / 10,
}))
export const PARTNER_CO_LIST: (StaCompanyRow & { bizName: string; startedAt: string; deposit: number })[] =
  COMPANIES.slice(0, 30).map((c, i) => ({
    id: c.id, name: c.name, bizNo: c.bizNo, coFg: c.coFg, manager: c.manager, phone: c.phone,
    bizName: BIZ[i % BIZ.length].label, startedAt: `2026.0${1 + (i % 8)}.15`,
    applied: 4 + (i % 6), confirmed: 3 + (i % 5), deposit: (3 + (i % 5)) * 200_000,
  }))

/* --- 021P 참여노동자통계 ---------------------------------------------------- */
const JOIN_STS = ['미가입', '가입', '전액 미사용', '퇴직'] as const
export interface StaWorkerRow {
  id: string; round: string; coFg: string; company: string; startedAt: string
  name: string; partner: boolean; phone: string; email: string
  joinSts: typeof JOIN_STS[number]; usedPoint: number
}
const r21 = rand('B8-021P')
export const WORKER_LIST: StaWorkerRow[] = WORKERS.slice(0, 90).map((w, i) => {
  const c = COMPANIES.find((x) => x.id === w.companyId) ?? COMPANIES[0]
  return {
    id: w.id, round: `${1 + (i % 3)}차`, coFg: c.coFg, company: c.name, startedAt: `2026.0${1 + (i % 8)}.0${1 + (i % 9)}`,
    name: w.name, partner: i % 11 === 0, phone: w.phone, email: `${w.id.toLowerCase()}@example.com`,
    joinSts: weighted(r21, [['가입', 60], ['미가입', 18], ['전액 미사용', 14], ['퇴직', 8]]), usedPoint: Math.round(r21() * 300_000),
  }
})
export const WORKER_SUMMARY = {
  confirmed: 7772,
  unjoined: WORKER_LIST.filter((w) => w.joinSts === '미가입').length * 20,
  unused: WORKER_LIST.filter((w) => w.joinSts === '전액 미사용').length * 20,
}

/* --- 030P 포인트통계 --------------------------------------------------------- */
export const POINT_SUMMARY = {
  confirmed: 7772, joined: 6390, unjoined: 1382, fullUnused: 512, fullUsed: 3108, stopUsed: 44, stopUnused: 61, refundUsed: 12, refundUnused: 28,
}
export const BALANCE_BUCKETS = [
  { range: '0원', cnt: 512, amt: 0 }, { range: '1~5만', cnt: 1204, amt: 34_200_000 },
  { range: '5~10만', cnt: 1880, amt: 141_000_000 }, { range: '10~20만', cnt: 2140, amt: 321_000_000 },
  { range: '20만 초과', cnt: 654, amt: 189_800_000 },
]
export const POINT_GROUPS = [
  { group: '지원기관 포인트', assigned: 3_120_000_000, used: 2_640_000_000, refundPending: 180_000_000, refundDone: 260_000_000 },
  { group: '기업 포인트', assigned: 840_000_000, used: 690_000_000, refundPending: 44_000_000, refundDone: 90_000_000 },
  { group: '개인 포인트', assigned: 253_600_000, used: 198_400_000, refundPending: 12_000_000, refundDone: 30_000_000 },
]
const r30 = rand('B8-030P')
export const DAILY_TREND_30 = days(30).map((d) => ({
  date: d, co: 40 + Math.round(r30() * 30), worker: 260 + Math.round(r30() * 180), amount: 2_000_000 + Math.round(r30() * 3_000_000),
}))

/* --- 031P 이용실적통계 ------------------------------------------------------- */
export type UsageUnit = '일별' | '월별' | '연도별'
const USE_TYPE = ['레저이용권', '체크인', '복지샵', '항공', '렌터카', '외식']
const r31 = rand('B8-031P')
export const USAGE_DAILY = days(30).map((d) => {
  const cnt = 90 + Math.round(r31() * 60)
  const amt = cnt * (28_000 + Math.round(r31() * 9_000))
  const general = Math.round(amt * (0.6 + r31() * 0.2))
  return { period: d, cnt, amount: amt, support: Math.round(amt * 0.82), approve: cnt + 6, cancel: 6, general, family: amt - general }
})
export const USAGE_MONTHLY = Array.from({ length: 9 }, (_, i) => {
  const cnt = 2400 + Math.round(r31() * 900)
  const amt = cnt * (30_000 + Math.round(r31() * 6_000))
  return { period: `2026.${pad(i + 1, 2)}`, cnt, amount: amt, support: Math.round(amt * 0.82), approve: cnt + 60, cancel: 60 }
})
export const USAGE_YEARLY = [2023, 2024, 2025, 2026].map((y) => {
  const cnt = 24_000 + Math.round(r31() * 6_000)
  const amt = cnt * 32_000
  return { period: String(y), cnt, amount: amt, support: Math.round(amt * 0.82), approve: cnt + 400, cancel: 400 }
})
export const USAGE_BY_TYPE = USE_TYPE.map((t) => {
  const cnt = 200 + Math.round(r31() * 800)
  return { type: t, cnt, amount: cnt * (20_000 + Math.round(r31() * 30_000)) }
})

/* --- 040P 상품/카테고리 통계 ------------------------------------------------- */
const CATEGORY = ['숙박', '여행', '입장권', '렌터카', '외식', '레저용품', '항공']
const r40 = rand('B8-040P')
export const CATEGORY_SALES = CATEGORY.map((c) => {
  const cnt = 300 + Math.round(r40() * 1800)
  const amt = cnt * (18_000 + Math.round(r40() * 40_000))
  return { category: c, cnt, amount: amt, support: Math.round(amt * 0.78) }
})
export interface ShopProductRow { code: string; name: string; category: string; partner: string; orders: number; qty: number; amount: number }
const PARTNERS40 = ['한빛리조트', '다온항공', '바른렌터카', '온결외식', '푸른레저']
export const PRODUCT_RANK: ShopProductRow[] = Array.from({ length: 36 }, (_, i) => {
  const cat = pick(r40, CATEGORY)
  const qty = 8 + Math.round(r40() * 90)
  return {
    code: `PRD-${pad(i + 1, 5)}`, name: `${cat} 상품 ${i + 1}호`, category: cat, partner: pick(r40, PARTNERS40),
    orders: qty, qty, amount: qty * (30_000 + Math.round(r40() * 60_000)),
  }
}).sort((a, b) => b.amount - a.amount)
export const ORDER_TREND = days(30).map((d) => ({ date: d, orders: 60 + Math.round(r40() * 50), cancels: Math.round(r40() * 6) }))

/* --- 041P 지역별 이용 통계 ---------------------------------------------------- */
const SIDO = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종']
const GUGUN: Record<string, string[]> = { 서울: ['강남구', '마포구', '송파구'], 경기: ['수원시', '고양시', '성남시'], 강원: ['강릉시', '속초시', '평창군'] }
const r41 = rand('B8-041P')
export const REGION_USAGE = [
  ...SIDO.map((s) => {
    const cnt = 40 + Math.round(r41() * 900)
    return { region: s, cnt, amount: cnt * (26_000 + Math.round(r41() * 20_000)) }
  }),
  { region: '지역 미상', cnt: 58, amount: 58 * 24_000 },
]
export const REGION_DETAIL: Record<string, { region: string; cnt: number; amount: number }[]> = Object.fromEntries(
  Object.entries(GUGUN).map(([sido, guList]) => [
    sido, guList.map((g) => { const cnt = 10 + Math.round(r41() * 200); return { region: g, cnt, amount: cnt * 27_000 } }),
  ]),
)
export const INDUSTRY_PROVIDED = true
export const INDUSTRY_USAGE = ['숙박업', '요식업', '여행업', '레저업'].map((i) => {
  const cnt = 100 + Math.round(r41() * 800)
  return { industry: i, cnt, amount: cnt * 32_000 }
})

/* --- 050P CS통계 -------------------------------------------------------------- */
export const CS_CHANNEL = [
  { channel: '콜센터', source: '상담 시스템', linked: true, received: 412, done: 388, pending: 24, avgMin: 6.2 },
  { channel: '이메일', source: '상담 시스템', linked: true, received: 96, done: 90, pending: 6, avgMin: 480 },
  { channel: '챗봇', source: '상담 시스템', linked: false, received: 0, done: 0, pending: 0, avgMin: 0 },
  { channel: '누리집 문의', source: '이 어드민', linked: true, received: 58, done: 41, pending: 17, avgMin: 620 },
  { channel: '기업 업무요청', source: '이 어드민', linked: true, received: 86, done: 60, pending: 26, avgMin: 1040 },
]
const CS_TYPE = ['참여신청 문의', '포인트사용 문의', '기초정보 정정', '계정 문의', '기타']
const r50 = rand('B8-050P')
export const CS_DAILY = days(30).map((d) => ({
  date: d, 콜센터: Math.round(r50() * 20), 이메일: Math.round(r50() * 5), 누리집문의: Math.round(r50() * 3), 업무요청: Math.round(r50() * 4),
}))
export const CS_TYPE_CROSS = CS_TYPE.map((t) => ({
  type: t, 콜센터: Math.round(r50() * 90), 이메일: Math.round(r50() * 20), 누리집문의: Math.round(r50() * 12), 업무요청: Math.round(r50() * 18),
}))

/* --- 060P 국회요구자료 통계리포트 --------------------------------------------- */
export const NA_TEMPLATES = [
  { id: 'T1', name: '상품유형별 사용금액' }, { id: 'T2', name: '지역별 사용금액_전체' }, { id: 'T3', name: '지역별 사용금액_기업' },
  { id: 'T4', name: '지역별 판매현황_숙박' }, { id: 'T5', name: '지역별 판매현황_업체' }, { id: 'T6', name: '기업유형별 사용현황' },
  { id: 'T7', name: '상품유형별 사용현황' }, { id: 'T8', name: '실적현황' }, { id: 'T9', name: '업체현황' },
]
const PRODUCT_TYPE7 = ['숙박', '여행', '입장권', '렌터카', '외식', '레저용품', '항공']
const r60 = rand('B8-060P')
export const NA_T1 = PRODUCT_TYPE7.map((t) => ({ type: t, amount: 200_000_000 + Math.round(r60() * 900_000_000) }))
export const NA_T6 = CO_FG.map((f) => {
  const worker = 200 + Math.round(r60() * 3000)
  const amount = worker * (150_000 + Math.round(r60() * 60_000))
  return { label: f.label, worker, amount, perHead: Math.round(amount / worker) }
})
export const NA_T7 = PRODUCT_TYPE7.map((t) => ({ type: t, cnt: 800 + Math.round(r60() * 6000) }))
export const NA_T8 = { totalCo: 3120, totalWorker: 7772, totalAmount: 4_213_600_000, avgPerCo: Math.round(4_213_600_000 / 3120) }
export const NA_T9 = Array.from({ length: 10 }, (_, i) => ({ name: `${pick(r60, PARTNERS40)} ${i + 1}`, cnt: 20 + Math.round(r60() * 400) }))

/* --- 070P 동반성장통계 참여유형통계 ------------------------------------------- */
export const TYPE_COMPARE = [
  { type: '일반참여', co: 612, worker: 4820, amount: 1_820_000_000 },
  { type: '동반성장', co: 28, worker: 205, amount: 74_000_000 },
]
export const PARTNER_ORG = [
  { org: '한빛상생재단', co: 12, worker: 88, assigned: 44_000_000, used: 31_200_000, deadline: '2026.12.31' },
  { org: '새솔협력회', co: 9, worker: 71, assigned: 28_000_000, used: 19_800_000, deadline: '2027.03.31' },
  { org: '가온동반성장원', co: 7, worker: 46, assigned: 17_000_000, used: 12_400_000, deadline: '2026.12.31' },
]
export const PARTNER_STOP_ENDOFTERM = 6
