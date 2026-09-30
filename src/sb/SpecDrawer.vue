<script setup lang="ts">
/**
 * 명세 서랍 — 화면 오른쪽에서 열린다. 화면을 보면서 요구사항 · 권한 · 시나리오를 대조한다.
 * 명세가 없으면 IA 기본 정보만 보인다.
 */
import { computed, ref } from 'vue'
import Drawer from 'primevue/drawer'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { getSpec, levelTone, type StageEffort } from './spec'
import { screenOf } from './screens'
import { ACTIONS, ROLES } from './roles'
import { sb } from './context'
import { stateOf } from '../sp/codes'
import SbCode from './SbCode.vue'

const props = defineProps<{ code: string }>()
const visible = defineModel<boolean>('visible', { required: true })
const spec = computed(() => getSpec(props.code))
const scr = computed(() => screenOf(props.code))
const tab = ref('overview')

const st = (c: string) => (c ? `${c} ${stateOf(c)?.label ?? ''}`.trim() : '—')
const yn = (v: boolean | null) => (v == null ? '미정' : v ? '가능' : '불가')
const fmt = (n: number) => n.toLocaleString('ko-KR')
const effortRows = computed(() => {
  const e = spec.value?.effort
  if (!e) return []
  return (['spec', 'build', 'fix'] as const).filter((k) => e[k]).map((k) => ({ k, v: e[k] as StageEffort }))
})
const STAGE = { spec: '명세', build: '화면', fix: '수정' }

const tabs = computed(() => {
  const s = spec.value
  if (!s) return []
  return [
    { v: 'overview', l: '개요' },
    { v: 'req', l: '요구사항', n: s.requirements.length },
    { v: 'fn', l: '기능정의', n: s.functions.length },
    { v: 'ts', l: '테스트 시나리오', n: s.scenarios.length },
    { v: 'perm', l: '권한' },
    { v: 'data', l: '필요 데이터', n: s.data.length },
    { v: 'state', l: '상태·알림', n: s.states.length + s.notifications.length },
    { v: 'note', l: '특이·제약', n: s.notes.length + s.constraints.length },
    { v: 'asis', l: 'AS-IS 근거', n: s.asis.length },
    { v: 'q', l: '미결 질문', n: s.openQuestions.length },
    { v: 'effort', l: '소요' },
  ]
})
</script>

<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: 'min(1120px, 94vw)' }" class="sd-spec">
    <template #header>
      <div class="sp-h">
        <SbCode :code="code" />
        <b>{{ spec?.name ?? scr?.name ?? code }}</b>
        <span v-if="spec" class="ws-badge" :class="spec.status === 'complete' ? 'ws-badge--success' : 'ws-badge--warning'">{{ spec.status === 'complete' ? '명세 완료' : '초안' }}</span>
        <span v-else class="ws-badge ws-badge--mute">명세 없음</span>
      </div>
    </template>

    <div v-if="!spec" class="sp-none">
      <p>아직 이 화면의 명세가 없다. IA 기본 정보만 보인다.</p>
      <table v-if="scr" class="ws-tb sp-kv">
        <colgroup><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr><th>메뉴</th><td>{{ scr.menu.join(' › ') }}</td></tr>
          <tr><th>분류</th><td>{{ scr.type }}</td></tr>
          <tr><th>IA 행 · 구분</th><td>{{ scr.row }} · {{ scr.cls || '기존' }}</td></tr>
          <tr><th>복지몰 연계</th><td>{{ scr.link || '없음' }}</td></tr>
        </tbody>
      </table>
    </div>

    <Tabs v-else v-model:value="tab" scrollable>
      <TabList>
        <Tab v-for="t in tabs" :key="t.v" :value="t.v">{{ t.l }}<span v-if="t.n != null" class="sp-n">{{ t.n }}</span></Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="overview">
          <p class="sp-sum">{{ spec.summary }}</p>
          <table class="ws-tb sp-kv">
            <colgroup><col style="width: 140px" /><col /></colgroup>
            <tbody>
              <tr><th>메뉴</th><td>{{ spec.menu.join(' › ') }}</td></tr>
              <tr><th>분류</th><td>{{ spec.type }}</td></tr>
              <tr><th>IA 행 · 구분</th><td>{{ spec.iaRef.row }} · {{ spec.iaRef.cls || '기존' }}</td></tr>
              <tr><th>복지몰 연계</th><td>{{ spec.iaRef.link || '없음' }}</td></tr>
              <tr v-if="spec.iaRef.memo"><th>IA 메모</th><td>{{ spec.iaRef.memo }}</td></tr>
            </tbody>
          </table>
          <h3 class="sp-h3">모달 {{ spec.modals.length }}</h3>
          <div v-for="m in spec.modals" :key="m.code" class="sp-card">
            <p><SbCode :code="m.code" /> <b>{{ m.name }}</b></p>
            <p class="ws-desc">{{ m.purpose }}</p>
            <p v-if="m.fields.length"><small>입력</small> {{ m.fields.join(' · ') }}</p>
            <ul v-if="m.rules.length" class="sp-ul"><li v-for="r in m.rules" :key="r">{{ r }}</li></ul>
          </div>
          <p v-if="!spec.modals.length" class="ws-desc">없음</p>
        </TabPanel>

        <TabPanel value="req">
          <table class="ws-gtb sp-t">
            <thead><tr><th style="width: 150px">ID</th><th style="width: 96px">패턴</th><th>요구사항</th><th style="width: 72px">수준</th><th style="width: 160px">근거</th></tr></thead>
            <tbody>
              <tr v-for="r in spec.requirements" :key="r.id"><td><code>{{ r.id }}</code></td><td>{{ r.pattern }}</td><td>{{ r.text }}</td><td><span :class="levelTone(r.level)">{{ r.level }}</span></td><td class="ws-desc">{{ r.source }}</td></tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="fn">
          <div v-for="f in spec.functions" :key="f.id" class="sp-card">
            <p><code>{{ f.id }}</code> <b>{{ f.name }}</b> <span :class="levelTone(f.level)">{{ f.level }}</span> <span class="ws-desc">{{ f.source }}</span></p>
            <p>{{ f.desc }}</p>
            <ul v-if="f.rules.length" class="sp-ul"><li v-for="r in f.rules" :key="r">{{ r }}</li></ul>
          </div>
        </TabPanel>

        <TabPanel value="ts">
          <div v-for="s in spec.scenarios" :key="s.id" class="sp-card">
            <p><code>{{ s.id }}</code> <b>{{ s.title }}</b> <span class="ws-badge" :class="{ 'ws-badge--danger': s.kind === '권한', 'ws-badge--warning': s.kind === '예외' }">{{ s.kind }}</span> <span :class="levelTone(s.level)">{{ s.level }}</span></p>
            <pre class="sp-pre">{{ s.gherkin }}</pre>
          </div>
        </TabPanel>

        <TabPanel value="perm">
          <p v-if="spec.permissions.note" class="sp-sum">{{ spec.permissions.note }}</p>
          <div class="ws-xscroll">
            <table class="ws-gtb sp-t sp-perm">
              <thead><tr><th>역할</th><th v-for="a in ACTIONS" :key="a.code" :title="a.desc">{{ a.label }}</th><th>비고</th></tr></thead>
              <tbody>
                <tr v-for="r in ROLES" :key="r.code" :class="{ 'is-me': r.code === sb.role }">
                  <th scope="row">{{ r.label }}<small>{{ r.org }}</small></th>
                  <td v-for="a in ACTIONS" :key="a.code" class="c">
                    <span v-if="spec.permissions.rows.find((x) => x.role === r.code)?.actions.includes(a.code)" class="ok" aria-label="허용">●</span>
                    <span v-else class="no" aria-label="없음">·</span>
                  </td>
                  <td class="ws-desc">{{ spec.permissions.rows.find((x) => x.role === r.code)?.note ?? '명세에 행 없음' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabPanel>

        <TabPanel value="data">
          <table class="ws-gtb sp-t">
            <thead><tr><th style="width: 180px">엔티티</th><th>필드</th><th style="width: 64px">CRUD</th><th style="width: 90px">소유</th><th>비고</th></tr></thead>
            <tbody>
              <tr v-for="d in spec.data" :key="d.entity"><td>{{ d.entity }}</td><td>{{ d.fields.join(', ') }}</td><td class="c"><code>{{ d.crud }}</code></td><td>{{ d.owner }}</td><td class="ws-desc">{{ d.note }}</td></tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="state">
          <h3 class="sp-h3">상태 전이</h3>
          <table class="ws-gtb sp-t">
            <thead><tr><th>전</th><th>후</th><th>처리</th><th>필수 입력</th><th>알림</th><th style="width: 72px">되돌리기</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in spec.states" :key="i"><td>{{ st(s.from) }}</td><td>{{ st(s.to) }}</td><td>{{ s.action }}</td><td>{{ s.required.join(', ') || '—' }}</td><td>{{ s.notify || '—' }}</td><td class="c">{{ yn(s.reversible) }}</td></tr>
              <tr v-if="!spec.states.length"><td colspan="6" class="ws-desc">상태를 바꾸지 않는 화면</td></tr>
            </tbody>
          </table>
          <h3 class="sp-h3">알림</h3>
          <table class="ws-gtb sp-t">
            <thead><tr><th>계기</th><th style="width: 80px">채널</th><th>받는 사람</th><th>비고</th></tr></thead>
            <tbody>
              <tr v-for="(n, i) in spec.notifications" :key="i"><td>{{ n.trigger }}</td><td>{{ n.channel }}</td><td>{{ n.to }}</td><td class="ws-desc">{{ n.note }}</td></tr>
              <tr v-if="!spec.notifications.length"><td colspan="4" class="ws-desc">보내는 알림 없음</td></tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="note">
          <h3 class="sp-h3">특이사항</h3>
          <ul class="sp-ul"><li v-for="n in spec.notes" :key="n">{{ n }}</li><li v-if="!spec.notes.length" class="ws-desc">없음</li></ul>
          <h3 class="sp-h3">제약사항</h3>
          <ul class="sp-ul"><li v-for="n in spec.constraints" :key="n">{{ n }}</li><li v-if="!spec.constraints.length" class="ws-desc">없음</li></ul>
        </TabPanel>

        <TabPanel value="asis">
          <table class="ws-gtb sp-t">
            <thead><tr><th style="width: 120px">AS-IS ID</th><th>화면</th><th style="width: 90px">관계</th></tr></thead>
            <tbody>
              <tr v-for="a in spec.asis" :key="a.id"><td><code>{{ a.id }}</code></td><td>{{ a.name }}</td><td>{{ a.relation }}</td></tr>
              <tr v-if="!spec.asis.length"><td colspan="3" class="ws-desc">AS-IS에 대응 화면 없음(신규)</td></tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="q">
          <div v-for="q in spec.openQuestions" :key="q.id" class="sp-card">
            <p><code>{{ q.id }}</code> <b>{{ q.q }}</b></p>
            <p class="ws-desc">{{ q.why }}</p>
          </div>
          <p v-if="!spec.openQuestions.length" class="ws-desc">미결 질문 없음</p>
        </TabPanel>

        <TabPanel value="effort">
          <p v-if="!effortRows.length" class="ws-empty">집계 전</p>
          <table v-else class="ws-gtb sp-t">
            <thead><tr><th>단계</th><th>분</th><th>입력</th><th>출력</th><th>캐시 읽기</th><th>캐시 쓰기</th></tr></thead>
            <tbody>
              <tr v-for="e in effortRows" :key="e.k"><td>{{ STAGE[e.k] }}</td><td class="ws-num">{{ fmt(e.v.minutes) }}</td><td class="ws-num">{{ fmt(e.v.tokens.input) }}</td><td class="ws-num">{{ fmt(e.v.tokens.output) }}</td><td class="ws-num">{{ fmt(e.v.tokens.cacheRead) }}</td><td class="ws-num">{{ fmt(e.v.tokens.cacheWrite) }}</td></tr>
            </tbody>
          </table>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Drawer>
</template>

<style scoped>
.sp-h { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sp-h b { font-size: var(--ws-font-size-lg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-h :deep(.sb-code) { margin-right: 0; }
.sp-n { margin-left: 6px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); font-variant-numeric: tabular-nums; }
.sp-sum { margin: 12px 0; line-height: 1.6; }
.sp-kv { margin-top: 8px; }
.sp-h3 { margin: 20px 0 8px; font-size: var(--ws-font-size); font-weight: 700; }
.sp-card { display: grid; gap: 6px; margin-top: 10px; padding: 12px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.sp-card p { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; line-height: 1.5; }
.sp-card :deep(.sb-code) { margin-right: 0; }
.sp-ul { display: grid; gap: 4px; padding-left: 18px; list-style: disc; line-height: 1.5; }
.sp-pre { margin: 0; padding: 10px 12px; border-radius: var(--ws-radius-sm); background: var(--ws-surface-alt); white-space: pre-wrap; font: 12.5px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.sp-t { margin-top: 12px; }
.sp-t td { vertical-align: top; line-height: 1.5; }
.sp-t .c { text-align: center; }
.sp-perm th small { display: block; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); font-weight: 400; }
.sp-perm thead th { white-space: nowrap; font-size: var(--ws-font-size-md); padding-inline: 6px; }
.sp-perm tbody th { text-align: left; white-space: nowrap; }
.sp-perm .ok { color: var(--ws-text-success); }
.sp-perm .no { color: var(--ws-text-muted); }
.sp-perm tr.is-me { box-shadow: inset 3px 0 0 var(--ws-brand); }
code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
.sp-none { display: grid; gap: 12px; padding-top: 12px; }
</style>
