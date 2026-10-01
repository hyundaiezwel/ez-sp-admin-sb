// 화면 폭 검사 — 개발 서버에 떠 있는 77개 화면을 1280 · 1024 폭으로 열어 깨짐을 센다.
//   npm run dev 로 서버를 띄운 뒤: SB_URL=http://localhost:5320 npm run check:responsive
//   playwright-core 가 이 저장소에 없으면 PLAYWRIGHT_CORE=<…/playwright-core/index.mjs> 로 경로를 준다.
// 실패(exit 1): 상단 바 버튼 화면 밖 · 칩 넘침 · 글자 세로 쪼개짐 · 제목 줄바꿈 · 본문 가로 넘침 · 영역 밖으로 나간 글자 · 버튼 글자 줄바꿈
// 경고만: 입력 표 라벨 두 줄
import { readFileSync } from 'node:fs'
const pw = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core').catch(() => null)
if (!pw) { console.error('playwright-core 를 찾지 못했다 — PLAYWRIGHT_CORE 경로를 지정하라'); process.exit(2) }
const URL = process.env.SB_URL || 'http://localhost:5320'
const WIDTHS = (process.env.SB_WIDTHS || '1280,1024').split(',').map(Number)
const codes = [...readFileSync('src/sb/screens.ts', 'utf8').matchAll(/code: "(SP-[A-Z]{3}-\d{3}[LDP])"/g)].map((m) => m[1])
const FAIL = ['charWrap', 'titleWrap', 'hOverflow', 'outRight', 'btnWrap']
const b = await pw.chromium.launch()
let failed = 0
for (const w of WIDTHS) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
  const hits = {}, warn = []
  for (const c of codes) {
    await p.goto(`${URL}/#/sb/s/${c}`); await p.waitForTimeout(800)
    const r = await p.evaluate(() => {
      const page = document.querySelector('.ws-page'); if (!page) return null
      const main = page.parentElement.getBoundingClientRect()
      const res = { hOverflow: page.scrollWidth > page.clientWidth + 2, titleWrap: false, charWrap: [], btnWrap: [], outRight: [], thWrap: [] }
      const h1 = page.querySelector('h1')
      if (h1) { const cs = getComputedStyle(h1); res.titleWrap = h1.getBoundingClientRect().height > (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3) * 1.5 }
      // 높이가 고정된 버튼·입력 표는 높이 비율로 줄 수를 못 잰다 — 글자 줄의 위치를 직접 센다
      const lineCount = (el) => {
        const tops = new Set()
        for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) tops.add(Math.round(q.top)) }
        return tops.size
      }
      const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
      for (const el of page.querySelectorAll('*')) {
        const t = own(el); if (t.length < 2) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        const rc = el.getBoundingClientRect(); if (!rc.width) continue
        const fs = parseFloat(cs.fontSize), lines = rc.height / (parseFloat(cs.lineHeight) || fs * 1.4)
        if (rc.width < fs * 2.6 && lines >= 2.5 && t.length >= 3) res.charWrap.push(t.slice(0, 14))
        else if (el.closest('button') && !el.closest('.tabulator') && lineCount(el) >= 2) res.btnWrap.push(t.slice(0, 14))
        else if (el.closest('th') && t.length <= 20) {
          // 행 높이가 고정된 입력 표는 높이 비율로는 못 잰다 — 글자 줄 수를 직접 센다
          if (lineCount(el) >= 2) res.thWrap.push(t.slice(0, 14))
        }
        if (rc.right > main.right + 4 && !el.closest('.tabulator, .ws-xscroll')) res.outRight.push(t.slice(0, 14))
      }
      return res
    })
    if (!r) continue
    for (const k of FAIL) if (r[k] === true || r[k]?.length) (hits[k] ??= []).push(r[k] === true ? c : `${c} ${[...new Set(r[k])].slice(0, 3).join(' / ')}`)
    if (r.thWrap.length) warn.push(c)
  }
  // 상단 바 — 가장 긴 라벨(사업 · 역할)로 한 번 더 연다. 버튼이 화면 밖으로 나가거나 칩 글자가 테두리를 넘으면 실패
  const tp = await b.newPage({ viewport: { width: w, height: 600 } })
  await tp.addInitScript(() => { try { localStorage.setItem('sp-context', JSON.stringify({ year: 2026, biz: 'BIZ-26-02', role: 'R1' })); localStorage.setItem('sb-role', 'AV') } catch {} })
  await tp.goto(`${URL}/#/sb/s/SP-PRT-010L`); await tp.waitForTimeout(800)
  const top = await tp.evaluate(() => {
    const bar = document.querySelector('.sh-top'); if (!bar) return ['상단 바 없음']
    const out = []
    for (const e of bar.querySelectorAll('button, a, input')) { if (!e.offsetParent) continue; const r = e.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1) out.push(`화면 밖: ${(e.getAttribute('aria-label') || e.textContent).trim().slice(0, 16)}`) }
    for (const c of bar.querySelectorAll('.cx')) if (c.scrollWidth > c.clientWidth + 1) out.push(`칩 넘침: ${c.textContent.trim().slice(0, 16)}`)
    return out
  })
  if (top.length) (hits.topbar ??= []).push(...top)
  await tp.close()
  await p.close()
  const n = Object.values(hits).reduce((a, v) => a + v.length, 0)
  failed += n
  console.log(`\n■ ${w}px — 실패 ${n}건 · 라벨 두 줄 경고 ${warn.length}화면`)
  for (const [k, v] of Object.entries(hits)) console.log(`  ${k}:\n    ${v.join('\n    ')}`)
  if (warn.length) console.log(`  (경고) 입력 표 라벨 두 줄: ${warn.join(', ')}`)
}
await b.close()
process.exit(failed ? 1 : 0)
