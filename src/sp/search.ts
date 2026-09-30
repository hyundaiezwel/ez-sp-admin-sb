import { memo } from './stores'
import { ctx, ctxKey } from './context'
import { handoff } from './handoff'
import { mask } from '../ws/mask'
import { makeBasic, makeMembers, makeScraping } from '@fixtures/sp'
import type { SearchHit } from '../app/GlobalSearch.vue'

/**
 * 통합 검색 — 업무 데이터(D6 Q2 "메뉴 + 기업 · 회원 · 접수번호").
 * 셸이 처음 검색할 때 늦게 싣는다 — 목업 데이터가 첫 로드에 끌려오지 않게.
 * 실제로는 백엔드 통합 검색 API 하나다(권한 · 전역 조건을 서버가 건다).
 *
 * 회원은 **2자 이상**일 때만 찾고 결과 이름은 가린다. 사람 이름을 한 글자로 훑는 검색은 막는다.
 */
export function searchData(q: string): SearchHit[] {
  const key = ctxKey()
  const basic = memo('basic', key, () => makeBasic(key, ctx.year))
  const out: SearchHit[] = []
  const k = q.trim()
  const co = basic.filter((r) => r.name.includes(k) || r.bizNo.replace(/-/g, '').includes(k.replace(/-/g, ''))).slice(0, 5)
  co.forEach((r) => out.push({ group: '기업', label: r.name, sub: r.bizNo, to: `/sp/basic-info/${r.id}` }))
  if (/^\d{4,}$/.test(k)) {
    basic.filter((r) => r.receiptNo.startsWith(k)).slice(0, 5)
      .forEach((r) => out.push({ group: '접수번호', label: r.receiptNo, sub: r.name, to: `/sp/basic-info/${r.id}` }))
  }
  if (k.length >= 2 && !/\d/.test(k)) {
    const members = memo('member', key, () => makeMembers(key, ctx.year))
    members.filter((m) => m.name.includes(k)).slice(0, 5)
      .forEach((m) => out.push({ group: '회원', label: `${mask(m.name, 'name')} · ${m.company}`, sub: '참여회원 현황', to: '/sp/member', before: () => { handoff.member = m.name } }))
  }
  if (/^sc-?\d*/i.test(k)) {
    const sc = memo('scrap', key, () => makeScraping(key, ctx.year))
    const n = k.replace(/^sc-?/i, '')
    sc.filter((r) => r.id.includes(n)).slice(0, 5).forEach((r) => out.push({ group: '적발', label: r.id, sub: r.title, to: `/sp/scraping/${r.id}` }))
  }
  return out
}
