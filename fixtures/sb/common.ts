import { rng, NAMES } from '../rng'
import { seedOf } from '../sp'

/**
 * SB 공통 가짜 데이터 — **전부 지어낸 값이다.** 배치끼리 같은 기업 · 노동자를 보여야 할 때 이것을 쓴다.
 * 배치 전용 데이터는 `fixtures/sb/<배치ID>.ts`(예 B3.ts)에 둔다 — 다른 배치 파일을 고치지 않는다.
 *
 * 규칙: 사업자번호는 `000-00-0000N` 꼴 가짜, 사람 이름은 목록에서 `김*수`처럼 가린다(src/ws/mask.ts),
 * 전화는 `010-0000-NNNN`, 메일은 example.com, 사업 코드는 BIZ-26-01~04, 참여 상태는 src/sp/codes.ts STATES 코드.
 */
export const pad = (n: number, w: number) => String(n).padStart(w, '0')
export const ymd = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1, 2)}.${pad(d.getDate(), 2)}`
export const pick = <T>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]
/** 배치 fixture가 쓸 시드 난수 — 같은 키면 같은 값 */
export const rand = (key: string) => rng(seedOf(key))

const PRE = ['한빛', '새솔', '가온', '누리', '다온', '바른', '푸른', '하람', '미르', '온결', '단비', '라온']
const MID = ['정밀', '테크', '물산', '식품', '건설', '디자인', '소프트', '바이오', '로지스', '전자', '복지회', '세무회계']
const REGION = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

export interface SbCompany {
  id: string; name: string; bizNo: string
  /** src/sp/codes.ts CO_FG 코드 */
  coFg: string
  region: string; manager: string; phone: string; email: string
  biz: string
  /** src/sp/codes.ts STATES 코드 */
  sts: string
}
export interface SbWorker {
  id: string; name: string; companyId: string; company: string; empNo: string; birth: string; phone: string
  /** 이용중 · 이용정지 · 환불요청 · 환불완료 */
  sts: '이용중' | '이용정지' | '환불요청' | '환불완료'
  point: number
}

const CO_STS = ['110', '120', '130', '220', '310', '410', '510', '520', '611', '611', '611', '614', '710', '810']
const r = rand('sb-common')
export const COMPANIES: SbCompany[] = Array.from({ length: 40 }, (_, i) => ({
  id: `C-${pad(i + 1, 5)}`,
  name: `${pick(r, PRE)}${pick(r, MID)}${i % 3 ? '(주)' : ''}`,
  bizNo: `000-00-${pad(i + 1, 5)}`,
  coFg: String(1 + Math.floor(r() * r() * 7)),
  region: pick(r, REGION),
  manager: pick(r, NAMES),
  phone: `010-0000-${pad(1000 + i, 4)}`,
  email: `mgr${pad(i + 1, 3)}@example.com`,
  biz: i % 10 === 9 ? 'BIZ-26-03' : i % 7 === 6 ? 'BIZ-26-02' : 'BIZ-26-01',
  sts: CO_STS[i % CO_STS.length],
}))

const W_STS: SbWorker['sts'][] = ['이용중', '이용중', '이용중', '이용중', '이용정지', '환불요청', '환불완료']
export const WORKERS: SbWorker[] = Array.from({ length: 120 }, (_, i) => {
  const c = COMPANIES[i % COMPANIES.length]
  return {
    id: `P-${pad(i + 1, 6)}`, name: pick(r, NAMES), companyId: c.id, company: c.name,
    empNo: `E${pad(1 + Math.floor(r() * 99999), 5)}`,
    birth: `${1965 + Math.floor(r() * 38)}.${pad(1 + Math.floor(r() * 12), 2)}.${pad(1 + Math.floor(r() * 28), 2)}`,
    phone: `010-0000-${pad(5000 + i, 4)}`, sts: W_STS[i % W_STS.length], point: Math.round((r() * 400_000) / 1000) * 1000,
  }
})

/* --- 신청 건(SP-PRT-010L · 010D가 같이 본다) ------------------------------ */
export interface SbApplication {
  id: string; no: number; applyNo: string; appliedAt: string; lastAt: string
  companyId: string; name: string; bizNo: string; coFg: string; manager: string; phone: string
  biz: string
  /** 자격심사 상태 — 110 심사중 · 120 정상접수 · 130 보완필요 · 131 심사 미대상 · 139 참여취소 · 210 선정대기 · 220 선정완료 */
  sts: string
}
const A_STS: [string, number][] = [['110', 30], ['120', 20], ['130', 14], ['220', 22], ['131', 4], ['139', 5], ['210', 5]]
const weighted = (rr: () => number, w: [string, number][]) => {
  let x = rr() * w.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of w) if ((x -= n) < 0) return k
  return w[0][0]
}
/** 사업별 신청 건. 한 번 만든 배열을 화면끼리 같이 쓴다 — 목록에서 바꾼 상태가 상세에도 보인다 */
const appCache = new Map<string, SbApplication[]>()
export function applications(biz: string, n = 260): SbApplication[] {
  const hit = appCache.get(biz)
  if (hit) return hit
  const rr = rand('sb-app-' + biz)
  const rows = Array.from({ length: n }, (_, i) => {
    const c = COMPANIES[Math.floor(rr() * COMPANIES.length)]
    const d = new Date(2026, 0, 5 + Math.floor(rr() * 260), 8 + Math.floor(rr() * 10), Math.floor(rr() * 60))
    const last = new Date(d.getTime() + Math.floor(rr() * 20) * 86_400_000)
    const hm = (x: Date) => `${ymd(x)} ${pad(x.getHours(), 2)}:${pad(x.getMinutes(), 2)}`
    return {
      id: `A-${biz.slice(-2)}-${pad(i + 1, 5)}`, no: n - i, applyNo: `2026${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}${pad(i + 1, 4)}`,
      appliedAt: hm(d), lastAt: hm(last), companyId: c.id, name: c.name, bizNo: c.bizNo, coFg: c.coFg,
      manager: c.manager, phone: c.phone, biz, sts: weighted(rr, A_STS),
    }
  }).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  rows.forEach((x, i) => (x.no = rows.length - i))
  appCache.set(biz, rows)
  return rows
}
