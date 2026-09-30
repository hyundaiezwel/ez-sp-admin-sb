import { NAMES, won } from '../rng'
import { pad, ymd, pick, rand, COMPANIES, WORKERS } from './common'
import { SITES, HANDLE, REPORT, USED_AFTER } from '../../src/sp/codes'

/** B6 운영지원 — 전부 지어낸 값이다. 배치 전용이라 다른 배치 파일에서 import하지 않는다. */
const weighted = <T extends string>(r: () => number, w: [T, number][]): T => {
  let x = r() * w.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of w) if ((x -= n) < 0) return k
  return w[0][0]
}
const hm = (d: Date) => `${ymd(d)} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`
const day = (r: () => number, back = 0, span = 300) => {
  const d = new Date(2026, 0, 1 + Math.floor(r() * span) - back, 8 + Math.floor(r() * 10), Math.floor(r() * 60))
  return d
}

/* --- E23 업무요청(010L·010D) -------------------------------------------- */
export type ReqSts = '접수' | '처리중' | '처리완료'
export interface OpsCycle { req: string; reqAt: string; ans: string; ansAt: string; answerer: string }
export interface OpsRequest {
  id: string; no: number; sts: ReqSts; type: string; title: string
  companyId: string; company: string; requester: string; account: string
  requestedAt: string; replyEmail: string; content: string; hasAttach: boolean
  answerer: string; answeredAt: string; lastBy: string; lastAt: string
  cycles: OpsCycle[]; transferTo: string; transferReason: string
}
const REQ_TYPE = ['참여신청 문의', '포인트사용 문의', '기초정보 정정', '계정 문의', '기타']
const rq = rand('b6-req')
const REQ_TITLES = ['참여신청이 반려됐어요', '포인트 사용 승인이 늦어져요', '담당자 연락처를 바꾸고 싶어요', '전용몰 결제가 안 돼요', '서류를 다시 올리고 싶어요']
export const opsRequests: OpsRequest[] = Array.from({ length: 86 }, (_, i) => {
  const c = pick(rq, COMPANIES)
  const d = day(rq, 0, 240)
  const sts = weighted(rq, [['접수', 25], ['처리중', 15], ['처리완료', 60]] as [ReqSts, number][])
  const hasAns = sts !== '접수'
  const ansAt = hasAns ? new Date(d.getTime() + (1 + Math.floor(rq() * 3)) * 86_400_000) : null
  const answerer = hasAns ? pick(rq, ['운영사 CS팀', '지원기관 담당자']) : ''
  return {
    id: `RQ-${pad(86 - i, 5)}`, no: 86 - i, sts, type: pick(rq, REQ_TYPE), title: pick(rq, REQ_TITLES),
    companyId: c.id, company: c.name, requester: c.manager, account: c.email,
    requestedAt: hm(d), replyEmail: c.email, content: '문의 내용입니다. 확인 부탁드립니다.', hasAttach: rq() < 0.3,
    answerer, answeredAt: ansAt ? hm(ansAt) : '', lastBy: answerer || c.manager, lastAt: hm(ansAt ?? d),
    cycles: hasAns ? [{ req: '문의 내용입니다. 확인 부탁드립니다.', reqAt: hm(d), ans: '확인했습니다. 처리해 드렸습니다.', ansAt: hm(ansAt!), answerer }] : [],
    transferTo: '', transferReason: '',
  }
})
export const opsRequestOf = (id: string) => opsRequests.find((r) => r.id === id)

/* --- 누리집 문의(020L·020D, ENTITIES 없음) ------------------------------- */
export type AnsSts = '미답변' | '답변완료'
export interface WebInquiry {
  id: string; no: number; type: string; title: string; name: string; email: string; phone: string
  content: string; hasAttach: boolean; receivedAt: string
  ansSts: AnsSts; answer: string; answerer: string; answeredAt: string; sendResult: '' | '성공' | '실패'
}
const INQ_TYPE = ['참여신청', '선정 이후 절차', '포인트사용', '기타']
const rw = rand('b6-web')
const INQ_TITLES = ['신청 자격이 궁금해요', '입금은 언제까지 하나요', '포인트는 어디서 쓰나요', '아이디를 잊어버렸어요']
export const webInquiries: WebInquiry[] = Array.from({ length: 54 }, (_, i) => {
  const d = day(rw, 0, 200)
  const ansSts = weighted(rw, [['미답변', 30], ['답변완료', 70]] as [AnsSts, number][])
  const ansAt = ansSts === '답변완료' ? new Date(d.getTime() + (1 + Math.floor(rw() * 2)) * 86_400_000) : null
  return {
    id: `WI-${pad(54 - i, 5)}`, no: 54 - i, type: pick(rw, INQ_TYPE), title: pick(rw, INQ_TITLES),
    name: pick(rw, NAMES), email: `guest${pad(i, 3)}@example.com`, phone: `010-0000-${pad(2000 + i, 4)}`,
    content: '누리집에서 남긴 문의 내용입니다.', hasAttach: rw() < 0.2, receivedAt: hm(d),
    ansSts, answer: ansSts === '답변완료' ? '안내드립니다. 추가로 궁금하신 점은 다시 문의해 주세요.' : '',
    answerer: ansSts === '답변완료' ? '운영사 CS팀' : '', answeredAt: ansAt ? hm(ansAt) : '',
    sendResult: ansSts === '답변완료' ? (rw() < 0.92 ? '성공' : '실패') : '',
  }
})
export const webInquiryOf = (id: string) => webInquiries.find((r) => r.id === id)

/* --- 자주 하는 질문 · E26 대외 콘텐츠(030L·030D) ------------------------- */
export interface Faq {
  id: string; no: number; category: string; question: string; answer: string
  display: '전시' | '미전시'; order: number; writer: string; createdAt: string; updatedAt: string
}
export const FAQ_CATEGORY = ['참여신청', '선정 이후 절차', '포인트사용', '기타']
const rf = rand('b6-faq')
export const faqs: Faq[] = FAQ_CATEGORY.flatMap((cat, ci) =>
  Array.from({ length: 6 + Math.floor(rf() * 4) }, (_, i) => {
    const d = day(rf, 0, 260)
    return {
      id: `FQ-${ci}-${pad(i + 1, 3)}`, no: 0, category: cat, question: `${cat} 관련 자주 묻는 질문 ${i + 1}`,
      answer: `${cat}에 대한 답변입니다. 자세한 내용은 고객센터로 문의해 주세요.`,
      display: rf() < 0.85 ? '전시' : '미전시', order: i + 1, writer: pick(rf, ['운영사 CS팀', '지원기관 담당자']),
      createdAt: ymd(d), updatedAt: ymd(new Date(d.getTime() + Math.floor(rf() * 30) * 86_400_000)),
    }
  }),
)
export const faqOf = (id: string) => faqs.find((r) => r.id === id)

/* --- 공지사항 · E26 대외 콘텐츠(040L·040D) ------------------------------- */
export type NoticeKind = '공통공지' | '사용자공지' | '기업공지'
export interface Notice {
  id: string; no: number; kind: NoticeKind; type: string; title: string; content: string
  hasAttach: boolean; display: '전시' | '미전시'; pinned: boolean
  from: string; to: string; views: number; writer: string; updater: string; createdAt: string
}
const NOTICE_KIND: NoticeKind[] = ['공통공지', '사용자공지', '기업공지']
const NOTICE_TYPE = ['사업공지', '이벤트공지', '서비스이용공지']
const rn = rand('b6-notice')
export const notices: Notice[] = Array.from({ length: 42 }, (_, i) => {
  const d = day(rn, 0, 300)
  const to = new Date(d.getTime() + (10 + Math.floor(rn() * 60)) * 86_400_000)
  return {
    id: `NT-${pad(42 - i, 5)}`, no: 42 - i, kind: pick(rn, NOTICE_KIND), type: pick(rn, NOTICE_TYPE),
    title: `${pick(rn, ['26년 지원 사업', '전용몰', '포인트사용', '시스템 점검'])} 안내`, content: '공지 본문입니다.',
    hasAttach: rn() < 0.25, display: rn() < 0.8 ? '전시' : '미전시', pinned: rn() < 0.1,
    from: ymd(d), to: ymd(to), views: Math.floor(rn() * 3000), writer: pick(rn, ['운영사 콘텐츠팀', '지원기관 담당자']),
    updater: '', createdAt: hm(d),
  }
})
export const noticeOf = (id: string) => notices.find((r) => r.id === id)

/* --- E22 부정행위 신고(050L·050D) ---------------------------------------- */
export interface FraudReport {
  id: string; no: number; title: string; email: string; regAt: string; content: string; hasAttach: boolean
  ansSts: AnsSts; answer: string; answeredAt: string; memo: string; sendResult: '' | '성공' | '실패'
}
const rr = rand('b6-report')
export const fraudReports: FraudReport[] = Array.from({ length: 38 }, (_, i) => {
  const d = day(rr, 0, 220)
  const ansSts = weighted(rr, [['미답변', 25], ['답변완료', 75]] as [AnsSts, number][])
  const ansAt = ansSts === '답변완료' ? new Date(d.getTime() + (1 + Math.floor(rr() * 2)) * 86_400_000) : null
  return {
    id: `FR-${pad(38 - i, 5)}`, no: 38 - i, title: pick(rr, ['중고거래로 포인트를 파는 것 같아요', '적립금 양도 게시글을 봤어요']),
    email: `report${pad(i, 3)}@example.com`, regAt: hm(d), content: '신고 내용입니다. 게시글 주소를 첨부합니다.',
    hasAttach: rr() < 0.5, ansSts, answer: ansSts === '답변완료' ? '확인 후 조치했습니다. 제보 감사합니다.' : '',
    answeredAt: ansAt ? hm(ansAt) : '', memo: rr() < 0.3 ? '내부 확인 완료 — 모니터링 060L 연결' : '',
    sendResult: ansSts === '답변완료' ? (rr() < 0.9 ? '성공' : '실패') : '',
  }
})
export const fraudReportOf = (id: string) => fraudReports.find((r) => r.id === id)

/* --- E21 부정행위 적발 건(060L·060D) -------------------------------------- */
export interface FraudCase {
  id: string; no: number; site: string; runAt: string; regAt: string; title: string; body: string
  nick: string; phone: string; email: string; usedAfter: string; report: string; deleted: boolean
  handle: string; matched: { name: string; company: string; sts: string; birth: string; phone: string; email: string; point: number; managerPhone: string; managerEmail: string } | null
  action: string; actionAt: string; actionBy: string
}
const TITLES = ['제휴몰 포인트 양도합니다', '여행 적립금 급처', '숙박권 대리 결제해 드려요', '지원 사업 포인트 팝니다', '호텔 예약 대신 해드림']
const rc = rand('b6-case')
export const fraudCases: FraudCase[] = Array.from({ length: 90 }, (_, i) => {
  const d = day(rc, 0, 260)
  const matched = rc() < 0.65
  const w = matched ? pick(rc, WORKERS) : null
  const handle = weighted(rc, [['1', 20], ['2', 55], ['3', 15], ['4', 10]] as [string, number][])
  const c = w ? COMPANIES.find((x) => x.id === w.companyId) : null
  return {
    id: `CS-${pad(90 - i, 5)}`, no: 90 - i, site: pick(rc, SITES), runAt: ymd(d), regAt: ymd(d),
    title: pick(rc, TITLES), body: '연락 주시면 바로 진행합니다. 잔액 확인 가능합니다.',
    nick: `user${pad(Math.floor(rc() * 99999), 5)}`, phone: `010-0000-${pad(3000 + i, 4)}`, email: `seller${pad(i, 3)}@example.com`,
    usedAfter: pick(rc, USED_AFTER.map((x) => x.code)), report: weighted(rc, REPORT.map((x) => [x.code, x.code === '0' ? 55 : x.code === '1' ? 30 : 10]) as [string, number][]),
    deleted: rc() < 0.35, handle,
    matched: w ? { name: w.name, company: c?.name ?? w.company, sts: w.sts === '이용중' ? '610' : w.sts === '이용정지' ? '710' : '610', birth: w.birth, phone: w.phone, email: `${w.id}@example.com`, point: w.point, managerPhone: c?.phone ?? '', managerEmail: c?.email ?? '' } : null,
    action: handle === '2' ? '이용정지 및 참여불가회원 등록' : handle === '3' ? '예외 처리(소명 수용)' : '',
    actionAt: handle === '2' || handle === '3' ? ymd(new Date(d.getTime() + 3 * 86_400_000)) : '',
    actionBy: handle === '2' || handle === '3' ? '지원기관 담당자' : '',
  }
})
export const fraudCaseOf = (id: string) => fraudCases.find((r) => r.id === id)
export const HANDLE_LABEL = Object.fromEntries(HANDLE.map((h) => [h.code, h.label]))

/* --- 전용몰 상품 · 부적합 판정(070P, ENTITIES 없음) ----------------------- */
export type ShopType = '숙박' | '여행' | '레저입장권' | '교통편의'
export interface ShopProduct {
  id: string; no: number; type: ShopType; name: string; code: string; partner: string; price: number; regDate: string
  keyword: string; judgeSts: '조치필요' | '판매중지 요청' | '예외 처리'; reason: string; by: string; at: string
}
const SHOP_TYPE: ShopType[] = ['숙박', '여행', '레저입장권', '교통편의']
const PARTNERS = ['한빛여행사', '가온리조트', '누리레저', '다온교통', '바른스테이', '푸른항공']
const KEYWORDS = ['해외여행', '면세', '카지노', '주류', '골프텔']
const rp = rand('b6-shop')
export const shopProducts: ShopProduct[] = Array.from({ length: 48 }, (_, i) => {
  const d = day(rp, 0, 260)
  const judgeSts = weighted(rp, [['조치필요', 45], ['판매중지 요청', 30], ['예외 처리', 25]] as [ShopProduct['judgeSts'], number][])
  return {
    id: `SH-${pad(48 - i, 5)}`, no: 48 - i, type: pick(rp, SHOP_TYPE), name: `${pick(rp, PARTNERS)} ${pick(rp, ['1박2일', '패키지', '이용권', '탑승권'])}`,
    code: `P${pad(1000 + i, 6)}`, partner: pick(rp, PARTNERS), price: (1 + Math.floor(rp() * 40)) * 10000, regDate: ymd(d),
    keyword: pick(rp, KEYWORDS), judgeSts, reason: judgeSts !== '조치필요' ? '운영 정책에 따라 처리' : '',
    by: judgeSts !== '조치필요' ? '운영사 운영자' : '', at: judgeSts !== '조치필요' ? ymd(new Date(d.getTime() + 86_400_000)) : '',
  }
})
export const shopProductOf = (id: string) => shopProducts.find((r) => r.id === id)
export const PARTNER_OPTIONS = PARTNERS

/* --- 부적합 키워드(071P, ENTITIES 없음) ----------------------------------- */
export interface BadKeyword { id: string; no: number; keyword: string; active: boolean; memo: string; by: string; at: string; hits: number }
const rk = rand('b6-keyword')
export const badKeywords: BadKeyword[] = KEYWORDS.concat(['도박', '유흥', '성인', '대리구매', '환전']).map((k, i) => {
  const d = day(rk, 0, 200)
  return { id: `KW-${pad(i + 1, 3)}`, no: i + 1, keyword: k, active: rk() < 0.85, memo: '사업 취지에 맞지 않는 상품 차단', by: '운영사 운영자', at: ymd(d), hits: Math.floor(rk() * 12) }
})
export const badKeywordOf = (id: string) => badKeywords.find((r) => r.id === id)

export const fmt = (n: number) => n.toLocaleString('ko-KR')
export { won }
