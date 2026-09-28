/**
 * LNB 메뉴 트리.
 *
 * 라우터가 아니라 여기가 정보구조의 정본이다 — 라우트는 화면 주소일 뿐이고,
 * "어디에 속한 화면인가"는 메뉴가 정한다. 브레드크럼·탭 제목도 이 트리에서 뽑는다.
 */
import { SP_MENU, SP_FOOT } from '../sp/menu'

export interface MenuItem {
  id: string
  label: string
  to?: string
  icon?: string
  children?: MenuItem[]
  /** 처리 대기 건수. 행 오른쪽에 숫자로 단다 — 점만 찍으면 "지금 봐야 하나"가 전달되지 않는다 */
  count?: number
  /** 지원 사업 미리보기 — 이 자리가 흡수한 AS-IS 화면 ID */
  asis?: string[]
  /** 지원 사업 미리보기 — 합치거나 옮긴 이유 */
  note?: string
  /** 지원 사업 미리보기 — 실제로 그린 화면인가(아니면 설계 카드) */
  built?: boolean
}

/**
 * 시스템 — 지원 사업 관리 하나다(2026-09-28 관리자 센터 폐기). 관리자 센터의 대시보드 · 통계 ·
 * 시스템 관리는 지원 사업 메뉴로 옮겼다(`sp/menu.ts`). 같은 셸이 두 시스템을 싣던 전환은 없앴다.
 */
export interface SystemDef { label: string; home: string; menu: MenuItem[]; foot: MenuItem[] }
export const SYSTEM: SystemDef = { label: '지원 사업 관리', home: '/sp/home', menu: SP_MENU, foot: SP_FOOT }

/** 처리 대기 — 건수가 달린 메뉴. 상단바 알림과 업무 현황이 같은 원천을 본다 */
export const PENDING = [...SP_MENU, ...SP_FOOT].flatMap((m) =>
  (m.children ?? [m]).filter((c) => c.count).map((c) => ({ label: c.label, group: m.children ? m.label : '', count: c.count!, to: c.to! })),
)

/** 그룹이 품은 하위 건수의 합. 접힌 그룹도 안에 쌓인 것을 알려야 한다 */
export function groupCount(item: MenuItem): number {
  return (item.children ?? []).reduce((n, c) => n + (c.count ?? 0), 0) + (item.count ?? 0)
}

/**
 * 경로 → [1depth, 2depth] 라벨. 브레드크럼과 탭 제목이 같은 원천을 본다.
 *
 * 상세 화면(`/sp/basic-info/C-0001`)은 메뉴에 없다 — 가장 긴 접두 메뉴를 부모로 잡고
 * `detail`에 나머지를 돌려준다. 상세가 주소를 갖는 게 요점이다: AS-IS는 폼 POST로만
 * 열려서 딥링크·새로고침·탭이 안 됐다(N-3·N-4).
 */
export function trail(path: string): { top: MenuItem; leaf?: MenuItem; detail?: string } | null {
  const all = [...SYSTEM.menu, ...SYSTEM.foot]
  for (const top of all) {
    if (top.to === path) return { top }
    const leaf = top.children?.find((c) => c.to === path)
    if (leaf) return { top, leaf }
  }
  for (const top of all) {
    for (const leaf of top.children ?? [top]) {
      if (leaf.to && leaf.to !== '/sp' && path.startsWith(leaf.to + '/')) {
        return leaf === top ? { top, detail: path.slice(leaf.to.length + 1) } : { top, leaf, detail: path.slice(leaf.to.length + 1) }
      }
    }
  }
  return null
}

export function titleOf(path: string): string {
  const t = trail(path)
  if (!t) return '화면'
  const base = t.leaf?.label ?? t.top.label
  return t.detail ? `${base} · ${t.detail}` : base
}
