/**
 * 원본 WebSquare 색 중 대비 미달인 것을 **같은 색상·채도로 명도만 내려** 기준을 넘긴다.
 *
 * "모양 유지, 값만 고침"(2026-09-28 결정)의 구현이다. 색상각과 채도를 건드리지 않으므로
 * 눈에는 같은 계열로 읽히고, 명도만 필요한 만큼 움직인다. 목표에 2% 여유를 둔다 —
 * 8비트 반올림이 아래로 떨어지는 것을 막는다(사내 UI 라이브러리 v1.1.0과 같은 이유).
 *
 * 실행: node scripts/fix-contrast.mjs   (값을 출력만 한다. tokens.css는 손으로 옮긴다)
 */
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = (h) => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]
}
function hsl2hex(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}

/** fg를 어둡게 해서 bg와의 대비를 target 이상으로 */
export function darken(hex, against, target) {
  const [h, s, l0] = rgb2hsl(hex2rgb(hex))
  let lo = 0, hi = l0
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    contrast(hsl2hex(h, s, mid), against) >= target * 1.02 ? (lo = mid) : (hi = mid)
  }
  return hsl2hex(h, s, lo)
}

const W = '#ffffff'
/**
 * **글자의 기준면은 흰색이 아니라 머리 면(#f3f5f6)이다.** 폼 라벨 칸과 그리드 헤더가
 * 이 색이고, 원본에 `th.gridHeaderTDDefault.txt_red` 같은 규칙이 있어 색 글자가 실제로
 * 여기 올라간다. 가장 어두운 면에서 통과하면 더 밝은 면에서도 통과한다.
 * 처음에 흰색으로 잡았다가 5건이 머리 면에서 다시 미달로 나왔다 — 사내 UI 라이브러리 v1.1.0과 같은 함정이다.
 */
const HEAD = '#f3f5f6'
export const FIXES = [
  // [토큰, 원본, 대비 상대, 목표, 설명]
  ['--ws-action-search', '#009782', W, 4.5, '조회·팝업 확인 버튼 배경. 흰 글자가 올라간다'],
  ['--ws-action-sub', '#aaaaaa', W, 4.5, '보조 버튼 배경. 흰 글자가 올라간다'],
  ['--ws-field-border', '#cccccc', W, 3, '입력 테두리. 컨트롤 경계를 알리는 유일한 선(1.4.11)'],
  ['--ws-text-brand', '#009782', HEAD, 4.5, '브랜드색 글자'],
  ['--ws-text-danger', '#f04452', HEAD, 4.5, '위험 글자 — 필수 표시 *가 라벨 칸에 올라간다'],
  ['--ws-text-success', '#00af7a', HEAD, 4.5, '성공 글자'],
  ['--ws-text-link', '#1573e1', HEAD, 4.5, '링크 — 흰 바탕 4.59로 통과하지만 머리 면에서 4.20'],
  ['--ws-text-muted', '#727272', HEAD, 4.5, '설명 — 흰 바탕 4.81로 통과하지만 머리 면에서 4.40'],
]

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [tok, src, bg, t, why] of FIXES) {
    const out = darken(src, bg, t)
    console.log(`${tok.padEnd(20)} ${src} ${contrast(src, bg).toFixed(2).padStart(5)} → ${out} ${contrast(out, bg).toFixed(2).padStart(5)}  (${why})`)
  }
}
