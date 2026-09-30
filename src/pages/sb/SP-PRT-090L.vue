<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-090L 참여불가기업 관리 목록. 참여불가 기업분류이거나 부정행위로 적발된 기업을 등록 · 관리한다.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BLOCKED_COMPANIES, type SbBlockCo, type ApplyState } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-090L'
const router = useRouter()
const TONE: Record<ApplyState, string> = { 적용: 'danger', 해제: 'mute', 만료: 'mute' }

const blank = () => ({ q: '', sts: '__ALL__' as string })
const f = ref(blank())
const applied = ref(blank())
const hit = (r: SbBlockCo) => (applied.value.sts === '__ALL__' || r.applyState === applied.value.sts) && (!applied.value.q.trim() || r.company.includes(applied.value.q.trim()) || r.bizNo.replace(/-/g, '').includes(applied.value.q.replace(/-/g, '').trim()))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => BLOCKED_COMPANIES.filter(hit), {
  failIf: () => applied.value.q.includes(ERROR_KEYWORD),
})
onMounted(reload)

function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const cellBtn = (label: string, ok: boolean, tip: string) =>
  `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}" aria-label="${label} — ${tip}"`}>${label}</button>`
const columns = computed(() => {
  const ok = can(CODE, 'status')
  const tip = denyTip(CODE, 'status')
  return [
    { title: '기업명', field: 'company', minWidth: 140 },
    { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '근거', field: 'basis', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '사유', field: 'reason', minWidth: 160 },
    { title: '적용일', field: 'appliedAt', width: 96, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '만료일', field: 'expireAt', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() || '무기한' },
    { title: '상태', field: 'applyState', width: 84, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--${TONE[c.getValue() as ApplyState]}">${c.getValue()}</span>` },
    {
      title: '처리', field: 'applyState', width: 88, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => (c.getValue() === '만료' ? '<span class="ws-desc">—</span>' : cellBtn(c.getValue() === '적용' ? '해제' : '적용', ok, tip)),
      cellClick: (_: any, c: any) => { const r = c.getRow().getData() as SbBlockCo; if (ok && r.applyState !== '만료') openStatus(r) },
    },
  ]
})
const openDetail = (r: SbBlockCo) => router.push({ path: routeOf('SP-PRT-090D'), query: { id: r.id } })
const openNew = () => router.push({ path: routeOf('SP-PRT-090D'), query: { mode: 'new' } })

/* --- M1 참여불가 적용상태 변경 --------------------------------------------- */
const stsOpen = ref(false)
const current = ref<SbBlockCo | null>(null)
function openStatus(r: SbBlockCo) { current.value = r; stsOpen.value = true }
function doStatus(p: ActionPayload) {
  if (!current.value) return
  const to = current.value.applyState === '적용' ? '해제' : '적용'
  current.value.applyState = to
  reload()
  notify(`${current.value.company} — 참여불가 상태를 ${to}(으)로 바꿨습니다.`, 'success')
}
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="b-q">기업명 · 사업자번호</label></th>
        <td><InputText id="b-q" v-model="f.q" fluid placeholder="기업명 일부 또는 사업자등록번호" /></td>
        <th scope="row"><label for="b-sts">적용상태</label></th>
        <td><Select v-model="f.sts" input-id="b-sts" :options="[{ l: '전체', v: '__ALL__' }, { l: '적용', v: '적용' }, { l: '해제', v: '해제' }, { l: '만료', v: '만료' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">참여불가기업 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">행을 누르면 상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download"><WsDownload :total="total" :limit="5000" modal-code="SP-CMN-040D" /></SbCan>
          <SbCan action="create"><Button label="등록" severity="contrast" @click="openNew" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="6" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>참여불가 기업분류이거나 부정행위로 적발된 기업을 등록 · 관리한다.</li>
        <li>적용으로 바꿀 때 진행 중 참여 건이 있으면 상세에서 건수를 먼저 보여 준다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="stsOpen" code="SP-PRT-090L-M1" :header="`참여불가 ${current?.applyState === '적용' ? '해제' : '적용'}`"
      :target="current ? `${current.company} (${current.bizNo})` : ''"
      :reason="{ label: '사유', required: true, min: 5, max: 200 }"
      :confirm-label="current?.applyState === '적용' ? '해제' : '적용'" @confirm="doStatus"
    />
  </div>
</template>
