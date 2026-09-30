#!/usr/bin/env node
/**
 * SB 점검 — 레지스트리 77화면마다 명세 · 화면 파일 · 모달 코드 · 금지어.
 *
 *   node scripts/check-sb.mjs            SB 파일만 금지어 검사
 *   node scripts/check-sb.mjs --all      저장소 전체 금지어 검사(node_modules · .git · dist · package-lock.json 제외)
 *   SB_BANNED_FILE=<경로>                금지어 목록(한 줄에 하나, 대소문자 무시). 없으면 금지어 검사를 건너뛴다.
 *                                        목록 자체는 저장소에 넣지 않는다.
 * 문제가 하나라도 있으면 exit 1.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const rd = (p) => readFileSync(join(ROOT, p), 'utf8')

const codes = [...rd('src/sb/screens.ts').matchAll(/\{ code: "(SP-[A-Z]{3}-\d{3}[A-Z])"/g)].map((m) => m[1])
const roles = existsSync(join(ROOT, 'src/sb/roles.ts'))
  ? [...rd('src/sb/roles.ts').matchAll(/\{ code: '([A-Z0-9]+)', label:/g)].map((m) => m[1])
  : []
const ARRAYS = ['requirements', 'functions', 'scenarios']

const problems = []
const rows = []
if (codes.length !== 77) problems.push(`레지스트리 화면 수 ${codes.length} (77이어야 한다)`)
if (!roles.length) problems.push('src/sb/roles.ts에서 역할을 읽지 못했다')

for (const code of codes) {
  const r = { code, spec: '없음', page: '없음', issues: [] }
  const specPath = `src/specs/${code}.json`
  let spec = null
  if (existsSync(join(ROOT, specPath))) {
    try { spec = JSON.parse(rd(specPath)) } catch (e) { r.issues.push(`명세 JSON 오류: ${e.message}`) }
  } else r.issues.push('명세 없음')
  if (spec) {
    r.spec = spec.status ?? '?'
    if (spec.code !== code) r.issues.push(`명세 code 불일치(${spec.code})`)
    if (spec.status !== 'complete') r.issues.push(`status ${spec.status}`)
    for (const k of ARRAYS) if (!Array.isArray(spec[k]) || !spec[k].length) r.issues.push(`${k} 비었음`)
    const pr = spec.permissions?.rows
    if (!Array.isArray(pr) || !pr.length) r.issues.push('permissions.rows 비었음')
    else {
      const miss = roles.filter((x) => !pr.some((p) => p.role === x))
      if (miss.length) r.issues.push(`권한 행 없음: ${miss.join(',')}`)
    }
    const kinds = new Set((spec.scenarios ?? []).map((s) => s.kind))
    if (spec.scenarios?.length && (!kinds.has('정상') || !(kinds.has('예외') || kinds.has('권한')))) r.issues.push('시나리오: 정상 1 + 예외/권한 1 이상')
  }
  const pagePath = `src/pages/sb/${code}.vue`
  if (existsSync(join(ROOT, pagePath))) {
    const src = rd(pagePath)
    r.page = src.split('\n', 1)[0].includes('SB-DONE') ? 'DONE' : '작업중'
    if (r.page !== 'DONE') r.issues.push('첫 줄 SB-DONE 없음')
    for (const m of spec?.modals ?? []) if (!src.includes(m.code)) r.issues.push(`모달 코드 ${m.code}가 화면에 없음`)
  } else r.issues.push('화면 파일 없음')
  rows.push(r)
}

/* --- 금지어 ---------------------------------------------------------------- */
const bannedFile = process.env.SB_BANNED_FILE
const banHits = []
if (bannedFile && existsSync(bannedFile)) {
  // 점으로 시작하는 확장자형 금지어는 뒤에 영숫자가 오면 뺀다 — `.download` · `.documentElement`가 걸리지 않게
  const words = readFileSync(bannedFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
    .map((w) => ({ w, re: new RegExp(w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + (w.startsWith('.') ? '(?![a-z0-9])' : ''), 'i') }))
  const all = process.argv.includes('--all')
  const SKIP = new Set(['node_modules', '.git', 'dist', 'package-lock.json'])
  const scope = all ? ['.'] : ['src/sb', 'src/specs', 'src/pages/sb', 'fixtures/sb', 'docs/sb-guide.md', 'scripts/check-sb.mjs']
  const walk = (p, out) => {
    const abs = join(ROOT, p)
    if (!existsSync(abs)) return out
    if (statSync(abs).isDirectory()) {
      for (const n of readdirSync(abs)) if (!SKIP.has(n)) walk(join(p, n), out)
    } else if (/\.(vue|ts|js|mjs|json|md|html|css|txt|ya?ml)$/.test(p)) out.push(p)
    return out
  }
  for (const f of scope.flatMap((s) => walk(s, []))) {
    const lines = readFileSync(join(ROOT, f), 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const { w, re } of words) if (re.test(line)) banHits.push(`${relative('.', f)}:${i + 1} '${w}'`)
    })
  }
} else console.log(`금지어 검사 건너뜀 — SB_BANNED_FILE ${bannedFile ? '파일 없음' : '미지정'}`)

/* --- 결과 표 ---------------------------------------------------------------- */
const w = (s, n) => String(s).padEnd(n)
console.log(`${w('화면', 14)}${w('명세', 10)}${w('화면', 8)}문제`)
for (const r of rows) console.log(`${w(r.code, 14)}${w(r.spec, 10)}${w(r.page, 8)}${r.issues.join(' · ') || 'OK'}`)
const bad = rows.filter((r) => r.issues.length)
console.log(`\n화면 ${rows.length} · 통과 ${rows.length - bad.length} · 문제 ${bad.length} · 금지어 ${banHits.length}`)
if (banHits.length) console.log('금지어:\n  ' + banHits.join('\n  '))
if (problems.length) console.log('전체:\n  ' + problems.join('\n  '))
process.exit(bad.length || banHits.length || problems.length ? 1 : 0)
