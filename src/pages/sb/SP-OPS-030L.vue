<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-030L 자주 하는 질문 목록 — 명세 src/specs/SP-OPS-030L.json */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { faqs, FAQ_CATEGORY, type Faq } from '@fixtures/sb/B6'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'

const CODE = 'SP-OPS-030L'
const router = useRouter()

const blank = () => ({ cat: 'ALL', display: 'ALL' as string, kw: '' })
const f = ref(blank())
const applied = ref(blank())
const hit = (r: Faq) => {
  const a = applied.value
  return (a.cat === 'ALL' || r.category === a.cat) && (a.display === 'ALL' || r.display === a.display) && (!a.kw.trim() || r.question.includes(a.kw.trim()))
}
const sorted = computed(() => [...faqs].sort((a, b) => (a.category === b.category ? a.order - b.order : FAQ_CATEGORY.indexOf(a.category) - FAQ_CATEGORY.indexOf(b.category))))
const { rows, loading, error, reload, total, search: requery } = usePaged(() => sorted.value.filter(hit), { size: 500, failIf: () => applied.value.kw.includes(ERROR_KEYWORD) })
onMounted(reload)
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const moveOpen = ref(false)
const dirty = ref(false)
function up(r: Faq) {
  const peers = faqs.filter((x) => x.category === r.category).sort((a, b) => a.order - b.order)
  const i = peers.findIndex((x) => x.id === r.id)
  if (i <= 0) return
  ;[peers[i - 1].order, peers[i].order] = [peers[i].order, peers[i - 1].order]
  dirty.value = true
}
function down(r: Faq) {
  const peers = faqs.filter((x) => x.category === r.category).sort((a, b) => a.order - b.order)
  const i = peers.findIndex((x) => x.id === r.id)
  if (i < 0 || i >= peers.length - 1) return
  ;[peers[i + 1].order, peers[i].order] = [peers[i].order, peers[i + 1].order]
  dirty.value = true
}
function saveOrder(p: ActionPayload) { dirty.value = false; notify('노출 순서를 저장했습니다 — 누리집에 바로 반영됩니다.', 'success') }
function trySave() { if (!dirty.value) return notify('저장할 내용이 없습니다.', 'warning'); moveOpen.value = true }

const columns = computed(() => {
  const ok = can(CODE, 'config'), tip = denyTip(CODE, 'config')
  return [
    { title: '순서', field: 'order', width: 130, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => {
      const btn = (label: string) => `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`} data-dir="${label}">${label === 'up' ? '▲' : '▼'}</button>`
      return `<span style="display:inline-flex;gap:4px;align-items:center">${c.getValue()}${btn('up')}${btn('down')}</span>`
    }, cellClick: (e: any, c: any) => { if (!ok) return; const dir = e.target?.closest?.('button')?.dataset?.dir; if (dir === 'up') up(c.getRow().getData()); else if (dir === 'down') down(c.getRow().getData()) } },
    { title: '질문 분류', field: 'category', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '질문', field: 'question', minWidth: 220 },
    { title: '전시상태', field: 'display', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '미전시' ? ' ws-badge--mute' : ' ws-badge--success'}">${c.getValue()}</span>` },
    { title: '등록자', field: 'writer', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '등록일시', field: 'createdAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '최종수정일시', field: 'updatedAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  ]
})
const openDetail = (r: Faq) => router.push({ path: routeOf('SP-OPS-030D'), query: { id: r.id } })
const create = () => router.push({ path: routeOf('SP-OPS-030D'), query: { id: 'new' } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-cat">질문 분류</label></th>
        <td><Select v-model="f.cat" input-id="q-cat" :options="[{ l: '전체', v: 'ALL' }, ...FAQ_CATEGORY.map((t) => ({ l: t, v: t }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
        <th scope="row"><label for="q-disp">전시상태</label></th>
        <td><Select v-model="f.display" input-id="q-disp" :options="[{ l: '전체', v: 'ALL' }, { l: '전시', v: '전시' }, { l: '미전시', v: '미전시' }]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-kw">질문</label></th>
        <td colspan="3"><InputText id="q-kw" v-model="f.kw" fluid placeholder="질문 내용 일부" /></td>
      </tr>
    </WsSearch>
    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">자주 하는 질문 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span><span class="ws-desc">분류별 노출 순서 · 행을 누르면 등록/수정</span></div>
        <div class="ws-tit__r">
          <SbCan action="config"><Button label="순서 저장" severity="secondary" outlined @click="trySave" /></SbCan>
          <SbCan action="create"><Button label="등록" @click="create" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
    </section>
    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>순서 화살표는 같은 분류 안에서만 움직인다. 바뀐 순서는 순서 저장을 눌러야 반영된다.</li><li>미전시 질문은 누리집에 나오지 않는다.</li></ul></div>
    <WsActionDialog v-model:visible="moveOpen" code="SP-OPS-030L-M1" header="노출 순서 저장" target="바뀐 노출 순서를 한 번에 저장합니다." confirm-label="저장" @confirm="saveOrder" />
  </div>
</template>
