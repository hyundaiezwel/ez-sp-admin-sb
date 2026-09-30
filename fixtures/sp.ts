import { rng, NAMES } from './rng'

/**
 * 지원 사업 미리보기 목업 데이터 — **전부 지어낸 값이다.**
 *
 * 분석 자료에는 행 데이터가 없다(목록 본문 블러, 개인정보 미반출). 여기 있는 기업명·연락처는
 * 무작위 조합이고 실재하지 않는다. 규모와 비율만 분석 실측을 흉내 낸다:
 *   - 재원 비율  기업+개인 3 : 지원기관 1 (입금 시점에 강제된다 — 핵심 1)
 *   - 상태 분포  참여개시가 대부분, 보완필요·미입금 이탈이 그다음 (S-003-02 집계 모양)
 *
 * 전역 조건(연도·사업)이 바뀌면 시드가 바뀌어 다른 목록이 나온다.
 */
const PRE = ['한빛', '새솔', '가온', '누리', '다온', '바른', '푸른', '하람', '미르', '온결', '단비', '라온', '채움', '이음', '해솔', '보람', '나래', '다솜', '별하', '그린']
const MID = ['정밀', '테크', '물산', '식품', '건설', '디자인', '소프트', '바이오', '로지스', '에너지', '화학', '전자', '의료재단', '복지회', '세무회계', '출판']
const FORM = ['(주)', '주식회사 ', '', '(유)']
const REGION = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const CHANNEL = ['사업 광고', '재 참여기업', '지인 추천', '언론 보도자료', '카카오톡 채널', '타기관 홈페이지', '동반성장제도', '기타']
export const JUDGES = ['정유진', '강도현', '윤채원', '임태양']

export const seedOf = (key: string) => [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0x7fffffff, 7)

const pick = <T>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]
const pad = (n: number, w: number) => String(n).padStart(w, '0')
const ymd = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1, 2)}.${pad(d.getDate(), 2)}`
const day = (year: number, r: () => number, from = 0, span = 260) => {
  const d = new Date(year, 0, 30)
  d.setDate(d.getDate() + from + Math.floor(r() * span))
  return d
}

export interface SpCompany {
  id: string; name: string; bizNo: string; coFg: string; growth: boolean; region: string; channel: string
  manager: string; phone: string; email: string
}
function company(r: () => number, i: number): SpCompany {
  const pre = pick(r, PRE), mid = pick(r, MID), form = pick(r, FORM)
  const name = form.endsWith(' ') ? `${form}${pre}${mid}` : `${pre}${mid}${form}`
  const coFg = String(1 + Math.min(6, Math.floor(r() * r() * 8)))
  return {
    id: `C-${pad(i + 1, 5)}`, name,
    bizNo: `${100 + Math.floor(r() * 800)}-${pad(Math.floor(r() * 99), 2)}-${pad(Math.floor(r() * 99999), 5)}`,
    coFg, growth: r() < 0.28, region: pick(r, REGION), channel: pick(r, CHANNEL),
    manager: pick(r, NAMES), phone: `010-${pad(Math.floor(r() * 9999), 4)}-${pad(Math.floor(r() * 9999), 4)}`,
    email: `mgr${pad(i, 4)}@example.com`,
  }
}

/* --- 접수·자격심사 ----------------------------------------------------- */
export interface IntakeRow extends SpCompany { no: number; receiptNo: string; joinedAt: string; sts: string; disabled: boolean; judge: string; docs: number }
const SCREEN_W: [string, number][] = [['220', 40], ['130', 26], ['210', 8], ['120', 10], ['110', 9], ['139', 5], ['131', 2]]
const weighted = (r: () => number, w: [string, number][]) => {
  let x = r() * w.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of w) if ((x -= n) < 0) return k
  return w[0][0]
}
export function makeIntake(key: string, year: number, n = 1240): IntakeRow[] {
  const r = rng(seedOf('intake' + key))
  return Array.from({ length: n }, (_, i) => {
    const c = company(r, i)
    const d = day(year, r)
    return {
      ...c, no: n - i,
      receiptNo: `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}${pad(1 + Math.floor(r() * 400), 4)}`,
      joinedAt: ymd(d), sts: weighted(r, SCREEN_W), disabled: r() < 0.12, judge: pick(r, JUDGES), docs: 2 + Math.floor(r() * 3),
    }
  })
}

/** 파이프라인 집계 — 사업별 행. 접수 6단계 + 기초정보 5단계. 단위 명 */
export interface Pipeline { biz: string; total: number; selected: number; judging: number; intake: Record<string, number>; basic: number[] }
export function makePipeline(key: string, bizCodes: string[]): Pipeline[] {
  const rows = bizCodes.map((biz, bi) => {
    const r = rng(seedOf('pipe' + key + biz))
    const scale = [1, 0.3, 0.06, 0.004][bi] ?? 0.01
    const k = (base: number) => Math.round(base * scale * (0.8 + r() * 0.4))
    const intake = { '220': k(9000), '130': k(10000), '131': k(20), '139': k(2000), '210': k(300), '120': k(120) }
    const basic = [k(50), k(10), k(120000), k(30), k(6000)]
    const total = k(150000)
    return { biz, total, selected: Math.round(total * (0.82 + r() * 0.1)), judging: k(60), intake, basic }
  })
  const sum = (f: (p: Pipeline) => number) => rows.reduce((s, p) => s + f(p), 0)
  const all: Pipeline = {
    biz: '전체', total: sum((p) => p.total), selected: sum((p) => p.selected), judging: sum((p) => p.judging),
    intake: Object.fromEntries(Object.keys(rows[0].intake).map((c) => [c, sum((p) => p.intake[c])])),
    basic: rows[0].basic.map((_, j) => sum((p) => p.basic[j])),
  }
  return [all, ...rows]
}

/* --- 기초정보 심사 ----------------------------------------------------- */
export interface BasicRow extends SpCompany {
  no: number; receiptNo: string; round: number; first: number; added: number; final: number
  sts: string; appliedAt: string; appliedLast: string; due: string; memo: string
  /** 참여 근로자 중 참여불가회원으로 등재된 수 — 승인 흐름에서 경고가 뜬다 */
  banned: number
}
const BASIC_W: [string, number][] = [['410', 30], ['510', 22], ['520', 8], ['610', 30], ['320', 4], ['390', 3], ['590', 3]]
export function makeBasic(key: string, year: number, n = 860): BasicRow[] {
  const r = rng(seedOf('basic' + key))
  return Array.from({ length: n }, (_, i) => {
    const c = company(r, i + 3000)
    const d = day(year, r, 20, 200)
    const first = 3 + Math.floor(r() * r() * 180)
    const added = r() < 0.25 ? Math.floor(r() * 20) : 0
    const due = new Date(d); due.setDate(due.getDate() + 14)
    return {
      ...c, no: n - i, receiptNo: `${year}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}${pad(1 + Math.floor(r() * 400), 4)}`,
      round: 1 + Math.floor(r() * r() * 3), first, added, final: first + added,
      sts: weighted(r, BASIC_W), appliedAt: ymd(d), appliedLast: added ? ymd(day(year, r, 200, 60)) : '',
      due: ymd(due), memo: r() < 0.15 ? pick(r, ['재직증빙 재요청', '담당자 통화 완료', '인원 조정 요청', '서류 보완 대기']) : '',
      banned: r() < 0.05 ? 1 + Math.floor(r() * 2) : 0,
    }
  })
}

/* --- 스크래핑 적발 ----------------------------------------------------- */
export interface ScrapRow {
  id: string; no: number; site: string; title: string; body: string; nick: string; phone: string; email: string
  usedAfter: string; report: string; deleted: boolean; handle: string; batch: boolean; runAt: string; regAt: string
  matched: { name: string; company: string; sts: string } | null
}
const TITLES = ['제휴몰 포인트 양도합니다', '여행 적립금 급처', '숙박권 대리 결제해 드려요', '지원 사업 포인트 팝니다', '호텔 예약 대신 해드림', '적립금 85%에 넘깁니다']
export function makeScraping(key: string, year: number, n = 300): ScrapRow[] {
  const r = rng(seedOf('scrap' + key))
  return Array.from({ length: n }, (_, i) => {
    const d = day(year, r, 0, 240)
    const matched = r() < 0.7
    return {
      id: `SC-${pad(n - i, 5)}`, no: n - i,
      site: weighted(r, [['중고거래 A', 40], ['중고거래 B', 25], ['중고거래 C', 20], ['중고거래 D', 15]]),
      title: pick(r, TITLES), body: '연락 주시면 바로 진행합니다. 잔액 확인 가능 …',
      nick: `user${pad(Math.floor(r() * 99999), 5)}`,
      phone: `010-${pad(Math.floor(r() * 9999), 4)}-${pad(Math.floor(r() * 9999), 4)}`,
      email: `seller${pad(i, 3)}@example.com`,
      usedAfter: pick(r, ['S1', 'S0', 'U1', 'U0']), report: weighted(r, [['0', 55], ['1', 35], ['2', 10]]),
      deleted: r() < 0.4, handle: weighted(r, [['1', 30], ['2', 50], ['3', 10], ['4', 10]]), batch: r() < 0.9,
      runAt: ymd(d), regAt: ymd(d),
      matched: matched ? { name: pick(r, NAMES), company: company(r, i + 9000).name, sts: pick(r, ['610', '710', '610', '610']) } : null,
    }
  })
}

/* --- 잔여금 현황 ------------------------------------------------------- */
/** 금액 쌍 — [기업+개인, 지원기관]. 입금 시점에 3:1이 강제된다 */
export type Pair = [number, number]
export interface RemainRow extends SpCompany { applyNo: string; dep: Pair; out: Pair; ref: Pair; rem: Pair }
const split = (ci: number): Pair => [ci, Math.round(ci / 3)]
export function makeRemain(key: string, year: number, n = 640): RemainRow[] {
  const r = rng(seedOf('remain' + key))
  return Array.from({ length: n }, (_, i) => {
    const c = company(r, i + 6000)
    const heads = 3 + Math.floor(r() * r() * 150)
    const dep = split(heads * 300_000)
    const out = split(Math.round(dep[0] * (0.3 + r() * 0.6) / 1000) * 1000)
    const ref = split(r() < 0.1 ? Math.round(dep[0] * r() * 0.1 / 1000) * 1000 : 0)
    const rem: Pair = [dep[0] - out[0] - ref[0], dep[1] - out[1] - ref[1]]
    return { ...c, applyNo: `${year}${pad(1 + Math.floor(r() * 12), 2)}${pad(i + 1, 5)}`, dep, out, ref, rem }
  })
}
/** 기업 한 곳의 청구년월별 출금·환불. **합이 기업 합계와 원 단위까지 맞는다** — 마지막 달이 나머지를 받는다 */
export function makeMonthly(row: RemainRow, year: number) {
  const r = rng(seedOf(row.id))
  const months = 8
  const w = Array.from({ length: months }, () => 0.6 + r() * 0.8)
  const ws = w.reduce((a, b) => a + b, 0)
  const ci = w.map((x) => Math.floor((row.out[0] * x) / ws / 1000) * 1000)
  ci[months - 1] = row.out[0] - ci.slice(0, -1).reduce((a, b) => a + b, 0)
  const org = ci.map((x) => Math.round(x / 3))
  org[months - 1] = row.out[1] - org.slice(0, -1).reduce((a, b) => a + b, 0)
  return ci.map((_, i) => ({
    no: months - i, ym: `${year}.${pad(i + 2, 2)}`,
    out: [ci[i], org[i]] as Pair,
    ref: (i === months - 1 ? row.ref : [0, 0]) as Pair,
  })).reverse()
}

/* --- 참여 기업 관리 ------------------------------------------------------ */
export type RefundTyp = 'C' | 'P' | 'A'
export interface CompanyRow extends SpCompany {
  no: number; applyNo: string; round: number
  hire: { yn: boolean; hired: number }
  first: number; added: number; final: number
  /** 추가 인원 신청이 심사를 기다리는 수 — 0이면 없음 */
  addReq: number
  vacct: string; acct: string; acctOk: boolean; bankCopy: boolean; cancelDoc: boolean
  refund: RefundTyp; due: string; updatedAt: string; sts: string
  memo: string
}
const COMPANY_W: [string, number][] = [
  ['410', 10], ['510', 14], ['520', 6], ['610', 8], ['611', 30], ['612', 4], ['613', 5], ['614', 6], ['615', 2], ['616', 5],
  ['590', 3], ['710', 3], ['810', 2], ['830', 2],
]
export function makeCompanies(key: string, year: number, n = 780): CompanyRow[] {
  const r = rng(seedOf('company' + key))
  return Array.from({ length: n }, (_, i) => {
    const c = company(r, i + 12000)
    const sts = weighted(r, COMPANY_W)
    const first = 3 + Math.floor(r() * r() * 160)
    const active = sts.startsWith('61')
    const added = active && r() < 0.35 ? 1 + Math.floor(r() * 15) : 0
    const addReq = (sts === '613' || sts === '612' || (sts === '610' && r() < 0.5)) ? 1 + Math.floor(r() * 12) : 0
    const d = day(year, r, 30, 200)
    const due = new Date(d); due.setDate(due.getDate() + 14)
    return {
      ...c, no: n - i, applyNo: `${year}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}${pad(1 + Math.floor(r() * 400), 4)}`,
      round: 1 + Math.floor(r() * r() * 3), hire: ((yn) => ({ yn, hired: yn ? 1 + Math.floor(r() * 4) : 0 }))(r() < 0.2),
      first, added, final: first + added, addReq,
      vacct: `391-910-${pad(Math.floor(r() * 999999), 6)}`, acct: `110-${pad(Math.floor(r() * 9999999), 7)}-${pad(Math.floor(r() * 99), 2)}`,
      acctOk: r() < 0.8, bankCopy: r() < 0.85, cancelDoc: ['590', '710', '810', '830'].includes(sts) && r() < 0.6,
      refund: weighted(r, [['A', 60], ['C', 30], ['P', 10]]) as RefundTyp, due: ymd(due), updatedAt: ymd(day(year, r, 200, 60)), sts,
      memo: r() < 0.12 ? pick(r, ['통장사본 재요청', '추가 인원 서류 확인 중', '담당자 변경 예정']) : '',
    }
  })
}

/* --- 참여회원 현황 · 포인트 · 이용내역 ------------------------------------ */
/** 회원 상태 7종(지어낸 코드). 뒤쪽 이용정지 · 환불 넷은 기업 상태와 이름을 같이 쓴다 */
export const MEMBER_STS = [
  { code: 'M0', label: '미가입', tone: 'mute' }, { code: 'M1', label: '이용중', tone: 'success' },
  { code: 'M2', label: '이용정지', tone: 'danger' }, { code: 'M3', label: '환불요청', tone: 'warning' },
  { code: 'M4', label: '환불대상', tone: 'info' }, { code: 'M5', label: '환불완료', tone: 'mute' }, { code: 'M6', label: '환불실패', tone: 'danger' },
] as const
export interface MemberRow {
  id: string; no: number; name: string; birth: string; loginId: string; company: string; bizNo: string; coSts: string; sts: string
  gender: 'M' | 'F'; partner: boolean; paid: boolean; growth: boolean
  remain: number; refundAcct: string; stopAt: string; useUntil: string; phone: string; email: string
}
export function makeMembers(key: string, year: number, n = 1400): MemberRow[] {
  const r = rng(seedOf('member' + key))
  const cos = Array.from({ length: 120 }, (_, i) => company(r, i + 20000))
  return Array.from({ length: n }, (_, i) => {
    const c = pick(r, cos)
    const sts = weighted(r, [['M1', 70], ['M0', 8], ['M2', 8], ['M3', 5], ['M4', 4], ['M5', 4], ['M6', 1]])
    const y = 1965 + Math.floor(r() * 38)
    const stopped = sts !== 'M1' && sts !== 'M0'
    return {
      id: `P-${pad(i + 1, 6)}`, no: n - i, name: pick(r, NAMES), birth: `${y}.${pad(1 + Math.floor(r() * 12), 2)}.${pad(1 + Math.floor(r() * 28), 2)}`,
      loginId: `user${pad(Math.floor(r() * 999999), 6)}`, company: c.name, bizNo: c.bizNo,
      coSts: stopped ? pick(r, ['610', '611', '710']) : pick(r, ['611', '611', '614', '616']), sts,
      gender: r() < 0.55 ? 'M' : 'F', partner: r() < 0.1, paid: r() < 0.93, growth: c.growth,
      remain: Math.round((r() * 400_000) / 1000) * 1000,
      refundAcct: stopped && r() < 0.7 ? `${pick(r, ['국민', '신한', '우리', '기업', '농협'])} 1002-${pad(Math.floor(r() * 999999), 6)}-${pad(Math.floor(r() * 99), 2)}` : '',
      stopAt: stopped ? ymd(day(year, r, 60, 180)) : '', useUntil: `${year}.12.31`,
      phone: `010-${pad(Math.floor(r() * 9999), 4)}-${pad(Math.floor(r() * 9999), 4)}`, email: `m${pad(i, 5)}@example.com`,
    }
  })
}

/** 포인트 종류 — 정산 대상(기본 재원 3 + 이벤트) · 비정산. 이벤트 이름은 일반화했다 */
export const POINT_KINDS = [
  { group: '정산 · 기본 재원', items: ['지원기관 포인트', '기업 포인트', '개인 포인트'] },
  { group: '정산 · 이벤트', items: ['웰컴 포인트', '설문 참여 이벤트', '추천 이벤트', '동반가족 포인트', '지역 근로자 추가', '연말 소진 이벤트', '보상 포인트(온라인)'] },
  { group: '비정산', items: ['비정산 이벤트'] },
]
export const EMP_STS = ['재직', '복직', '전입', '휴직', '휴직사용', '전출', '퇴직', '퇴직사용', '아이디미발급']
export interface PointRow {
  id: string; no: number; name: string; empNo: string; birth: string; dept: string; emp: string
  init: number; real: number; base: number; online: number; card: number; receipt: number; remain: number
}
export function makePoints(companyId: string, n = 180): PointRow[] {
  const r = rng(seedOf('point' + companyId))
  const depts = ['경영지원팀', '영업1팀', '영업2팀', '생산관리팀', '연구소', '품질팀']
  return Array.from({ length: n }, (_, i) => {
    const init = 400_000
    const real = r() < 0.08 ? 400_000 + 100_000 : init
    const used = Math.round((real * r() * 0.9) / 1000) * 1000
    const online = Math.round((used * (0.4 + r() * 0.4)) / 1000) * 1000
    const card = Math.round(((used - online) * r()) / 1000) * 1000
    const receipt = Math.round(((used - online - card) * r()) / 1000) * 1000
    const base = used - online - card - receipt
    return {
      id: `${companyId}-${pad(i + 1, 4)}`, no: n - i, name: pick(r, NAMES), empNo: `E${pad(1000 + i, 5)}`,
      birth: `${1965 + Math.floor(r() * 38)}.${pad(1 + Math.floor(r() * 12), 2)}.${pad(1 + Math.floor(r() * 28), 2)}`,
      dept: pick(r, depts), emp: weighted(r, [['재직', 85], ['휴직', 4], ['퇴직사용', 3], ['퇴직', 3], ['전입', 2], ['복직', 2], ['아이디미발급', 1]]),
      init, real, base, online, card, receipt, remain: real - used,
    }
  })
}

/** 제휴사 — 실명 대신 업종 + 기호 */
export const PARTNERS = [
  ...['A', 'B', 'C', 'D', 'E', 'F'].map((x) => `숙박 ${x}`), ...['A', 'B', 'C', 'D'].map((x) => `여행 ${x}`),
  ...['A', 'B', 'C'].map((x) => `레저 ${x}`), ...['A', 'B'].map((x) => `렌터카 ${x}`), '항공 A', '용품 A',
]
export const PAY_KIND = ['기본 차감', '온라인', '복지카드', '복지카드(비복지)', '영수증']
export interface UsageRow {
  id: string; no: number; at: string; time: string; approve: string; buy: string; name: string; empNo: string; company: string
  kind: string; biz: string; category: string; item: string; ptype: string; cancel: boolean; point: number; age: number; gender: 'M' | 'F'
}
export function makeUsage(key: string, year: number, n = 2400): UsageRow[] {
  const r = rng(seedOf('usage' + key))
  return Array.from({ length: n }, (_, i) => {
    const d = day(year, r, 60, 200)
    const partner = pick(r, PARTNERS)
    const kind = weighted(r, [['온라인', 55], ['복지카드', 22], ['기본 차감', 10], ['영수증', 8], ['복지카드(비복지)', 5]])
    const cancel = r() < 0.07
    const amt = Math.round((20_000 + r() * 380_000) / 100) * 100
    const card = kind.startsWith('복지카드')
    const buy = new Date(d); buy.setDate(buy.getDate() + 2)
    return {
      id: `U-${pad(i + 1, 7)}`, no: n - i, at: ymd(d), time: `${pad(8 + Math.floor(r() * 14), 2)}:${pad(Math.floor(r() * 60), 2)}`,
      approve: card ? ymd(d) : '', buy: card ? ymd(buy) : '', name: pick(r, NAMES), empNo: `E${pad(1000 + Math.floor(r() * 900), 5)}`,
      company: company(r, 30000 + Math.floor(r() * 80)).name, kind, biz: partner.split(' ')[0], category: pick(r, ['국내 숙박', '패키지', '입장권', '체험', '렌터카', '항공권']),
      item: `${partner} · ${pick(r, ['주말 특가', '연박 할인', '가족 패키지', '당일 체험', '왕복 항공'])}`, ptype: weighted(r, [['기본 재원', 88], ['이벤트', 12]]),
      cancel, point: cancel ? -amt : amt, age: 20 + Math.floor(r() * 4) * 10, gender: r() < 0.55 ? 'M' : 'F',
    }
  })
}

/** 엑셀 업로드 검증 — 행별 오류. 올린 파일 내용과 무관하게 같은 모양을 돌려준다(목업) */
export interface UploadIssue { row: number; col: string; value: string; msg: string }
export function makeUploadCheck(name: string) {
  const r = rng(seedOf(name))
  const total = 80 + Math.floor(r() * 60)
  const issues: UploadIssue[] = [
    { row: 7, col: '사업자번호', value: '123-45-678', msg: '사업자번호는 10자리입니다' },
    { row: 12, col: '상태', value: '신청완료', msg: '없는 상태입니다 — 선정완료 · 최종제출 · 참여개시 중에서 고르세요' },
    { row: 12, col: '참여경로', value: '기타(메모)', msg: '참여경로 코드표에 없습니다' },
    { row: 23, col: '참여인원', value: '-3', msg: '1 이상의 숫자여야 합니다' },
    { row: 31, col: '기업명', value: '', msg: '필수 칸이 비어 있습니다' },
    { row: 48, col: '사업자번호', value: '220-81-00000', msg: '이미 등록된 기업입니다(같은 사업 · 같은 연도)' },
    { row: 64 + Math.floor(r() * 10), col: '담당자 휴대폰', value: '010-12-3456', msg: '휴대폰 번호 형식이 아닙니다' },
  ]
  return { total, issues, badRows: new Set(issues.map((x) => x.row)).size }
}

/* --- 메인 배너 --------------------------------------------------------- */
export interface Banner { id: string; slot: string; order: number; title: string; link: string; from: string; to: string; show: boolean; tint: string }
export function makeBanners(): Banner[] {
  const today = new Date()
  const off = (d: number) => { const x = new Date(today); x.setDate(x.getDate() + d); return ymd(x) }
  const rows: [string, string, number, number, boolean, string][] = [
    ['빌보드', '2026 지원사업 참여기업 모집', -30, 60, true, '#2f80ed'],
    ['빌보드', '가을 여행 주간 특별 적립', 3, 30, true, '#f2994a'],
    ['빌보드', '상반기 참여 후기 이벤트', -90, -10, false, '#6fcf97'],
    ['혜택', '제휴 숙박 10% 추가 할인', -5, 40, true, '#bb6bd9'],
    ['혜택', '동반가족 포인트 안내', -60, 120, true, '#56ccf2'],
    ['Left', '참여신청 바로가기', -200, 200, true, '#2f80ed'],
    ['SNS', '카카오톡 채널 추가', -100, 300, true, '#f2994a'],
  ]
  return rows.map(([slot, title, a, b, show, tint], i) => ({
    id: `BN-${pad(i + 1, 3)}`, slot, order: 0, title, link: 'https://example.com/event', from: off(a), to: off(b), show, tint,
  })).map((b, i, all) => ({ ...b, order: all.slice(0, i).filter((x) => x.slot === b.slot).length + 1 }))
}
