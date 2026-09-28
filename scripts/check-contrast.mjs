import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { contrast } from './fix-contrast.mjs'

/**
 * 토큰 대비 검사 — 실제로 겹쳐 쓰이는 쌍만 본다.
 *
 * 원본 WebSquare는 미달 6건을 안고 있었다. 그걸 교정한 값이 다시 풀리지 않게
 * 빌드에 건다. 쌍은 **화면에서 실제로 겹치는 조합**이다 — 전 조합을 돌리면
 * 의미 없는 실패가 섞여 진짜 실패가 묻힌다.
 *
 * 차트는 경고로만 찍는다. 참조 팔레트를 톤 그대로 쓰기로 한 결정의 대가라서
 * 막지는 않되 지우지도 않는다(@ezwel/ui v1.6.1과 같은 처리).
 */
const css = readFileSync(fileURLToPath(new URL('../src/ws/tokens.css', import.meta.url)), 'utf8')
/* 블록을 갈라 읽는다. 파일 전체를 한 번에 긁으면 다크 값이 라이트를 덮어 라이트를 못 잰다 */
const DARK = ":root[data-theme='dark']"
const cut = css.indexOf(DARK)
if (cut < 0) throw new Error('다크 블록을 못 찾았다 — tokens.css 셀렉터를 확인한다')
const parse = (part) => Object.fromEntries([...part.matchAll(/(--ws-[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
const LIGHT = parse(css.slice(0, cut))
const THEMES = { 라이트: LIGHT, 다크: { ...LIGHT, ...parse(css.slice(cut)) } }

const TEXT = 4.5
const UI = 3

const PAIRS = [
  // 글자 — 본문 면과 머리 면 둘 다에 올라간다
  ...['--ws-text', '--ws-text-sub', '--ws-text-muted', '--ws-text-link', '--ws-text-brand', '--ws-text-danger', '--ws-text-success', '--ws-text-warning']
    .flatMap((fg) => ['--ws-surface', '--ws-surface-head'].map((bg) => [fg, bg, TEXT])),
  ['--ws-text', '--ws-surface-sunken', TEXT],
  ['--ws-text', '--ws-surface-selected', TEXT],
  ['--ws-text-sub', '--ws-surface-badge', TEXT],
  ['--ws-text-badge', '--ws-surface-badge', TEXT],
  // 상태 뱃지 — 글자색 계열을 옅게 깐 면 위
  ['--ws-text-brand', '--ws-brand-surface', TEXT],
  ['--ws-text-danger', '--ws-surface-danger', TEXT],
  ['--ws-text-success', '--ws-surface-success', TEXT],
  ['--ws-text-link', '--ws-surface-info', TEXT],
  ['--ws-text-warning', '--ws-surface-warning', TEXT],
  ['--ws-text-muted', '--ws-surface-alt', TEXT],
  ['--ws-text-danger', '--ws-surface-danger-hover', TEXT],
  // 버튼 — 흰 글자가 올라가는 면
  ['--ws-action-primary-fg', '--ws-action-primary', TEXT],
  ['--ws-action-primary-fg', '--ws-action-primary-hover', TEXT],
  ['--ws-text-inverse', '--ws-action-search', TEXT],
  ['--ws-text-inverse', '--ws-action-search-hover', TEXT],
  ['--ws-text-inverse', '--ws-action-sub', TEXT],
  ['--ws-text-inverse', '--ws-action-sub-hover', TEXT],
  ['--ws-action-default-fg', '--ws-action-default-bg', TEXT],
  // 캔버스 — 카드를 쓰는 화면(대시보드·통계)의 바탕 위
  ...['--ws-text', '--ws-text-sub', '--ws-text-muted'].map((fg) => [fg, '--ws-canvas', TEXT]),
  ['--ws-field-border-canvas', '--ws-canvas', UI],
  // 컨트롤 경계 — 1.4.11
  ['--ws-field-border', '--ws-surface', UI],
  // 입력 칸 안(D8 F2 음영) — 글자 · 흐린 글자(placeholder)
  ['--ws-text', '--ws-field-bg', TEXT],
  ['--ws-text-muted', '--ws-field-bg', TEXT],
  ['--ws-field-border-focus', '--ws-surface', UI],
  // 셸 — 어두운 레일 위 흰 글자 · 흐린 아이콘
  ['--ws-text-inverse', '--ws-shell-rail-bg', TEXT],
  ['--ws-text-inverse', '--ws-shell-rail-nav-bg', TEXT],
  ['--ws-text-inverse', '--ws-shell-rail-on-bg', TEXT],
  ['--ws-shell-rail-fg', '--ws-shell-rail-nav-bg', UI], // 아이콘만 — 글자를 올리면 TEXT로 바꾼다
  ['--ws-shell-side-placeholder', '--ws-shell-side-input-bg', TEXT],
  ['--ws-text-inverse', '--ws-shell-side-input-bg', TEXT],
  // 건수 배지 — 위험색 바탕 흰 글자
  ['--ws-text-inverse', '--ws-count-bg', TEXT],
  ['--ws-text-inverse', '--ws-action-danger', TEXT],
  // 스크롤바 손잡이 — 비텍스트 3:1. 사이드바는 어두운 레일 위
  ['--ws-scroll-thumb', '--ws-surface', UI],
  ['--ws-side-scroll-thumb', '--ws-side-bg', UI],
  // 상단바 — 글자 · 보조 글자 · 검색칸 안 글자 · 칸 테두리
  ['--ws-top-fg', '--ws-top-bg', TEXT],
  ['--ws-top-muted', '--ws-top-bg', TEXT],
  ['--ws-top-muted', '--ws-top-q', TEXT],
  ['--ws-top-fg', '--ws-top-q', TEXT],
  ['--ws-top-field', '--ws-top-bg', UI],
  ['--ws-text-inverse', '--ws-action-danger-hover', TEXT],
  ['--ws-login-fg', '--ws-login-bg', TEXT],
  // 사이드바 — 두 테마 모두 어두운 면
  ['--ws-side-fg', '--ws-side-bg', TEXT],
  ['--ws-side-sub', '--ws-side-bg', TEXT],
  ['--ws-side-muted', '--ws-side-bg', TEXT],
  ['--ws-text-inverse', '--ws-side-on-bg', TEXT],
  ['--ws-shell-side-placeholder', '--ws-side-search-bg', TEXT],
  // 경로
  ['--ws-crumb', '--ws-surface', TEXT],
  ['--ws-crumb-last', '--ws-surface', TEXT],
]

const CHART = [1, 2, 3, 4, 5, 6, 'muted'].map((i) => [`--ws-chart-${i}`, '--ws-surface', UI])

let bad = 0
let n = 0
let warns = 0
for (const [theme, T] of Object.entries(THEMES)) {
  let tb = 0
  for (const [fg, bg, need] of PAIRS) {
    if (!T[fg] || !T[bg]) { console.error(`  [${theme}] 토큰 없음: ${!T[fg] ? fg : bg}`); bad++; tb++; continue }
    n++
    const r = contrast(T[fg], T[bg])
    if (r < need) { bad++; tb++; console.error(`  ✗ [${theme}] ${fg} on ${bg}  ${r.toFixed(2)} < ${need}`) }
  }
  const warn = CHART.filter(([fg, bg, need]) => contrast(T[fg], T[bg]) < need)
  warns += warn.length
  console.log(`${theme}: ${tb ? tb + '건 미달' : '통과'}${warn.length ? ` · 차트 경고 ${warn.length}건` : ''}`)
  warn.forEach(([fg, bg, need]) => console.log(`  ⚠ ${fg} on ${bg}  ${contrast(T[fg], T[bg]).toFixed(2)} < ${need}`))
}
console.log(`검사 ${n}쌍 (라이트·다크) · 미달 ${bad}건 · 차트 경고 ${warns}건`)
if (warns) console.log('  차트 경고는 참조 팔레트를 톤 그대로 쓴 대가다. 면 차트는 획이 경계를 맡는다. 라이트 선 차트 셋 이상만 해당.')
if (bad) {
  console.error('\n대비 미달. 값을 되돌렸는지 확인하고 scripts/fix-contrast.mjs로 다시 뽑는다.')
  process.exit(1)
}
