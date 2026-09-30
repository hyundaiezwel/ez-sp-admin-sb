<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-050L 부정행위 신고 목록 — 명세 src/specs/SP-OPS-050L.json */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { fraudReports, type FraudReport, type AnsSts } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-050L'
const router = useRouter()

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, kw: '', sts: '' as string })
const f = ref(blank())
const applied = ref(blank())
const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: FraudReport) => {
  const a = applied.value
  const d = day(r.regAt)
  return (!a.sts || r.ansSts === a.sts) && (!a.kw.trim() || r.title.includes(a.kw.trim()) || r.email.includes(a.kw.trim())) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => fraudReports.filter(hit), { failIf: () => applied.value.kw.includes(ERROR_KEYWORD) })
onMounted(reload)
function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

const counts = computed(() => (['미답변', '답변완료'] as AnsSts[]).map((s) => ({ id: s, label: s, count: fraudReports.filter((r) => r.ansSts === s).length })))
function chip(s: string) { f.value.sts = f.value.sts === s ? '' : s; search() }

const resendOpen = ref(false)
const resendTarget = ref<FraudReport | null>(null)
function openResend(r: FraudReport) { resendTarget.value = r; resendOpen.value = true }
function doResend() {
  if (!resendTarget.value) return
  resendTarget.value.sendResult = Math.random() > 0.08 ? '성공' : '실패'
  notify('발송이 완료되었습니다.', 'success')
}

const columns = computed(() => {
  const ok = can(CODE, 'send'), tip = denyTip(CODE, 'send')
  return [
    { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
    { title: '제목', field: 'title', minWidth: 220 },
    { title: '첨부', field: 'hasAttach', width: 60, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? 'O' : '—') },
    { title: '신고자 이메일', field: 'email', width: 140, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'email') },
    { title: '등록일', field: 'regAt', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '답변상태', field: 'ansSts', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '미답변' ? ' ws-badge--warning' : ''}">${c.getValue()}</span>` },
    { title: '답변완료일', field: 'answeredAt', width: 130, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() || '<span class="ws-desc">—</span>' },
    {
      title: '재발송', field: 'id', width: 80, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => (c.getRow().getData().ansSts === '답변완료' ? `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>재발송</button>` : '<span class="ws-desc">—</span>'),
      cellClick: (_: any, c: any) => { if (ok && c.getRow().getData().ansSts === '답변완료') openResend(c.getRow().getData()) },
    },
  ]
})
const openDetail = (r: FraudReport) => router.push({ path: routeOf('SP-OPS-050D'), query: { id: r.id } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-from">등록기간</label></th>
        <td colspan="3"><WsPeriod id="q-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-kw">검색어</label></th>
        <td><InputText id="q-kw" v-model="f.kw" fluid placeholder="제목 · 이메일" /></td>
        <th scope="row"><label for="q-sts">답변상태</label></th>
        <td><Select v-model="f.sts" input-id="q-sts" :options="[{ l: '전체', v: '' }, { l: '미답변', v: '미답변' }, { l: '답변완료', v: '답변완료' }]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>
    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">부정행위 신고 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span><span class="ws-desc">등록일 최신순 · 행을 누르면 신고상세</span></div>
        <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="total" :limit="10000" modal-code="SP-CMN-040D" /></SbCan></div>
      </div>
      <div class="ws-chips"><button v-for="c in counts" :key="c.id" type="button" class="ws-chip" :aria-pressed="applied.sts === c.id" @click="chip(c.id)">{{ c.label }} <b>{{ fmt(c.count) }}</b></button></div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload" empty-text="조회 결과가 없습니다 — 기간을 넓혀 보세요.">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>
    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>답변은 상세(SP-OPS-050D)에서 하고, 답변완료 건은 목록에서 바로 재발송할 수 있다.</li><li>신고자는 로그인 없이 이메일로만 식별된다.</li></ul></div>
    <WsActionDialog v-model:visible="resendOpen" code="SP-OPS-050L-M1" header="답변 메일 재발송 확인" :target="resendTarget ? `${resendTarget.title} — ${resendTarget.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')}` : ''" :notice="resendTarget ? `마지막 답변일시 ${resendTarget.answeredAt} · 이전 발송 결과 ${resendTarget.sendResult || '—'}` : ''" confirm-label="재발송" @confirm="doResend" />
  </div>
</template>

<style scoped>
.ws-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
</style>
