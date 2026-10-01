<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-020L 누리집 문의 목록 — 명세 src/specs/SP-OPS-020L.json */
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
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { mask } from '../../ws/mask'
import { routeOf } from '../../sb/screens'
import { webInquiries, type WebInquiry, type AnsSts } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-020L'
const router = useRouter()
const TYPES = ['참여신청', '선정 이후 절차', '포인트사용', '기타']

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, kw: '', sts: 'ALL' as string })
const f = ref(blank())
const applied = ref(blank())
const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: WebInquiry) => {
  const a = applied.value
  const d = day(r.receivedAt)
  return (a.sts === 'ALL' || r.ansSts === a.sts) && (!a.kw.trim() || r.title.includes(a.kw.trim()) || r.email.includes(a.kw.trim())) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => webInquiries.filter(hit), {
  failIf: () => applied.value.kw.includes(ERROR_KEYWORD),
})
onMounted(reload)
function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

const counts = computed(() => (['미답변', '답변완료'] as AnsSts[]).map((s) => ({ id: s, label: s, count: webInquiries.filter((r) => r.ansSts === s).length })))
function chip(s: string) { f.value.sts = f.value.sts === s ? 'ALL' : s; search() }

const NOW_DAYS = (r: WebInquiry) => Math.floor((Date.now() - day(r.receivedAt).getTime()) / 86_400_000)
const columns = computed(() => [
  { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '문의유형', field: 'type', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '제목', field: 'title', minWidth: 200 },
  { title: '문의자', field: 'name', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '이메일', field: 'email', width: 130, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'email') },
  { title: '첨부', field: 'hasAttach', width: 60, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? 'O' : '—') },
  { title: '접수일시', field: 'receivedAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '답변상태', field: 'ansSts', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '미답변' ? ' ws-badge--warning' : ''}">${c.getValue()}</span>` },
  { title: '경과일', field: 'no', width: 70, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => { const r: WebInquiry = c.getRow().getData(); return r.ansSts === '답변완료' ? '<span class="ws-desc">—</span>' : `${NOW_DAYS(r)}일` } },
  { title: '발송결과', field: 'sendResult', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() === '실패' ? '<span class="ws-badge ws-badge--danger">발송실패</span>' : c.getValue() || '<span class="ws-desc">—</span>') },
])
const openDetail = (r: WebInquiry) => router.push({ path: routeOf('SP-OPS-020D'), query: { id: r.id } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-from">접수일</label></th>
        <td colspan="3"><WsPeriod id="q-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-kw">검색어</label></th>
        <td><InputText id="q-kw" v-model="f.kw" fluid placeholder="제목 · 이메일" /></td>
        <th scope="row"><label for="q-sts">답변상태</label></th>
        <td><Select v-model="f.sts" input-id="q-sts" :options="[{ l: '전체', v: 'ALL' }, { l: '미답변', v: '미답변' }, { l: '답변완료', v: '답변완료' }]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>
    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">누리집 문의 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">접수일시 최신순 · 행을 누르면 문의상세</span>
        </div>
      </div>
      <div class="ws-chips"><button v-for="c in counts" :key="c.id" type="button" class="ws-chip" :aria-pressed="applied.sts === c.id" @click="chip(c.id)">{{ c.label }} <b>{{ fmt(c.count) }}</b></button></div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>
    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>답변과 회신 메일 발송은 상세(SP-OPS-020D)에서 한다.</li>
        <li>문의자 · 이메일은 가려 보인다.</li>
        <li>상태 확인 — 검색어에 <b>오류</b>를 넣으면 실패 화면이 나온다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.ws-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
</style>
