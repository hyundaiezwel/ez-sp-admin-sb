import { NAMES, rng } from '../rng'
import { seedOf } from '../sp'
import { pad, pick, ymd } from './common'

/**
 * B7 콘텐츠관리(자료실 · 팝업 · 배너) 전용 가짜 데이터. 다른 배치는 쓰지 않는다.
 * 전부 지어낸 값 — 실제 파일은 없다(썸네일은 색 블록으로 대신한다).
 */
const rand = (key: string) => rng(seedOf('b7-' + key))
const today = new Date()
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const fmt = (d: Date) => ymd(d)
const hm = (d: Date) => `${fmt(d)} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`
const registrant = (r: () => number) => pick(r, NAMES)

/* --- 자료실 자료(SP-CNT-010L · 010D) -------------------------------------- */
export type CntCategory = '운영지침' | '매뉴얼' | '사업안내서' | '포스터' | '신청서식'
export const CNT_CATEGORIES: CntCategory[] = ['운영지침', '매뉴얼', '사업안내서', '포스터', '신청서식']
export interface CntRevision { at: string; by: string; fileName: string; memo: string }
export interface CntMaterial {
  id: string; order: number; category: CntCategory; title: string
  format: '파일' | '링크'; fileName?: string; linkUrl?: string; desc: string
  displayStatus: '전시' | '미전시'; registrant: string; registeredAt: string; updatedAt: string
  revisions: CntRevision[]
}
const r1 = rand('materials')
const MAT_TITLES: [CntCategory, string][] = [
  ['운영지침', '2026년 지원 사업 운영지침(제3판)'],
  ['운영지침', '지원기관 담당자 업무 매뉴얼 부속서'],
  ['매뉴얼', '기업 어드민 이용 매뉴얼'],
  ['매뉴얼', '운영사 정산 처리 매뉴얼'],
  ['사업안내서', '2026년 지원 사업 안내서'],
  ['사업안내서', '노동자 신청 절차 안내서'],
  ['포스터', '지원 사업 홍보 포스터(A2)'],
  ['포스터', '신청기간 안내 포스터'],
  ['신청서식', '참여 신청서 서식'],
  ['신청서식', '개인정보 수집·이용 동의서 서식'],
  ['신청서식', '환불 신청서 서식'],
]
export const MATERIALS: CntMaterial[] = MAT_TITLES.map(([category, title], i) => {
  const reg = addDays(today, -(200 - i * 14))
  const upd = addDays(reg, Math.floor(r1() * 40))
  const format: CntMaterial['format'] = i % 5 === 4 ? '링크' : '파일'
  const revisions: CntRevision[] = category === '운영지침' && i % 2 === 0
    ? [{ at: fmt(addDays(reg, 30)), by: registrant(r1), fileName: `${title}_구버전.pdf`, memo: '조항 개정 반영' }]
    : []
  return {
    id: `MAT-${pad(i + 1, 4)}`, order: i + 1, category, title, format,
    fileName: format === '파일' ? `${title}.pdf` : undefined,
    linkUrl: format === '링크' ? 'https://example.com/guide/apply-form' : undefined,
    desc: `${category} — ${title} 설명입니다.`,
    displayStatus: i === 9 ? '미전시' : '전시',
    registrant: registrant(r1), registeredAt: hm(reg), updatedAt: hm(upd), revisions,
  }
})

/* --- 팝업(SP-CNT-020L · 020D) --------------------------------------------- */
export type PopupType = '상단배너' | '레이어팝업'
export interface CntPopup {
  id: string; type: PopupType; name: string; page: string
  imageFile?: string; content: string; width?: number; posX?: number; posY?: number
  rank: number; linkUrl: string; startDate: string; endDate: string
  displayStatus: '전시' | '미전시'; hideToday: boolean; hideDays: number
  registrant: string; registeredAt: string
}
const r2 = rand('popups')
const PAGES = ['메인', '자료실', '신청 안내']
export const POPUPS: CntPopup[] = Array.from({ length: 7 }, (_, i) => {
  const type: PopupType = i % 4 === 0 ? '상단배너' : '레이어팝업'
  const start = addDays(today, -20 + i * 6)
  const end = addDays(start, 10 + Math.floor(r2() * 10))
  return {
    id: `POP-${pad(i + 1, 4)}`, type, name: `2026년 지원 사업 ${i % 2 ? '신청기간' : '점검'} 안내 팝업 ${i + 1}`,
    page: pick(r2, PAGES), imageFile: `popup-${i + 1}.png`, content: '팝업 안내 내용입니다.',
    width: type === '레이어팝업' ? 400 : undefined,
    posX: type === '레이어팝업' ? 40 + (i % 3) * 20 : undefined,
    posY: type === '레이어팝업' ? 120 + (i % 3) * 20 : undefined,
    rank: (i % 3) + 1, linkUrl: 'https://example.com/notice',
    startDate: fmt(start), endDate: fmt(end),
    displayStatus: i === 5 ? '미전시' : '전시', hideToday: i % 2 === 0, hideDays: i % 2 === 0 ? 7 : 0,
    registrant: registrant(r2), registeredAt: hm(start),
  }
})
export function popupPhase(p: Pick<CntPopup, 'startDate' | 'endDate'>): '대기중' | '진행중' | '종료' {
  const t = fmt(today)
  if (t < p.startDate) return '대기중'
  if (t > p.endDate) return '종료'
  return '진행중'
}
export const popupLive = (p: CntPopup) => popupPhase(p) === '진행중' && p.displayStatus === '전시'

/* --- 배너(SP-CNT-030L · 030D) ---------------------------------------------- */
export type BannerPosition = '메인 비주얼' | '혜택' | 'SNS 링크'
export const BANNER_POSITIONS: BannerPosition[] = ['메인 비주얼', '혜택', 'SNS 링크']
export const BANNER_SIZE: Record<BannerPosition, [number, number]> = { '메인 비주얼': [1920, 600], 혜택: [600, 400], 'SNS 링크': [80, 80] }
export const BANNER_LIMIT: Partial<Record<BannerPosition, number>> = { '메인 비주얼': 4 }
export const SNS_CHANNELS = ['인스타그램', '유튜브', '블로그', '카카오 채널']
export interface CntBanner {
  id: string; position: BannerPosition; order: number; name: string; channel?: string
  tint: string; altText: string; linkUrl: string; linkTarget: '같은 창' | '새 창'
  startDate: string; endDate: string; displayStatus: '전시' | '미전시'
  registrant: string; registeredAt: string
}
const r3 = rand('banners')
export const TINTS = ['#2f80ed', '#27ae60', '#eb5757', '#f2994a', '#9b51e0', '#2d9cdb']
const BN_NAMES: [BannerPosition, string][] = [
  ['메인 비주얼', '2026년 지원 사업 개시 메인 비주얼'],
  ['메인 비주얼', '신청기간 연장 안내 비주얼'],
  ['메인 비주얼', '지역 연계 지원사업 소개'],
  ['메인 비주얼', '노동자 후기 비주얼'],
  ['메인 비주얼', '복지몰 이용 안내 비주얼'],
  ['혜택', '전용몰 신규 입점 혜택'],
  ['혜택', '포인트 지급 안내'],
  ['혜택', '노동자 이용 혜택 모음'],
  ['SNS 링크', '인스타그램'],
  ['SNS 링크', '유튜브'],
  ['SNS 링크', '블로그'],
]
export const BANNERS: CntBanner[] = BN_NAMES.map(([position, name], i) => {
  const start = addDays(today, -30 + i * 5)
  const end = addDays(start, 40)
  const isSns = position === 'SNS 링크'
  return {
    id: `BN-${pad(i + 1, 4)}`, position, order: BN_NAMES.filter(([p], j) => p === position && j <= i).length,
    name, channel: isSns ? name : undefined, tint: pick(r3, TINTS),
    altText: isSns ? `${name} 바로가기` : `${name} 배너 이미지`,
    linkUrl: 'https://example.com/campaign', linkTarget: isSns ? '새 창' : '같은 창',
    startDate: fmt(start), endDate: fmt(end), displayStatus: i === 4 ? '미전시' : '전시',
    registrant: registrant(r3), registeredAt: hm(start),
  }
})
export function bannerPhase(b: Pick<CntBanner, 'startDate' | 'endDate'>): '대기중' | '진행중' | '종료' {
  const t = fmt(today)
  if (t < b.startDate) return '대기중'
  if (t > b.endDate) return '종료'
  return '진행중'
}
export const bannerLive = (b: CntBanner) => bannerPhase(b) === '진행중' && b.displayStatus === '전시'
