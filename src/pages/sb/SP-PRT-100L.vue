<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-100L 참여불가회원 관리 목록. 부정행위 적발 사용자의 사업 참여제한 대상을 등록 · 관리한다.
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
import DatePicker from 'primevue/datepicker'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BLOCKED_MEMBERS, type SbBlockMember, type ApplyState } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-100L'
const router = useRouter()
const TONE: Record<ApplyState, string> = { 적용: 'danger', 해제: 'mute', 만료: 'mute' }

const blank = () => ({ q: '', sts: '__ALL__' as string })
const f = ref(blank())
const applied = ref(blank())
const hit = (r: SbBlockMember) => (applied.value.sts === '__ALL__' || r.applyState === applied.value.sts) && (!applied.value.q.trim() || r.workerName.includes(applied.value.q.trim()) || r.company.includes(applied.value.q.trim()))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => BLOCKED_MEMBERS.filter(hit), {
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
    { title: '성명', field: 'workerName', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
    { title: '기업명', field: 'company', minWidth: 140 },
    { title: '적발경로', field: 'detectPath', minWidth: 140 },
    { title: '적용일', field: 'appliedAt', width: 96, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '만료일', field: 'expireAt', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => c.getValue() || '무기한' },
    { title: '상태', field: 'applyState', width: 84, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--${TONE[c.getValue() as ApplyState]}">${c.getValue()}</span>` },
    {
      title: '처리', field: 'applyState', width: 88, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => (c.getValue() === '만료' ? '<span class="ws-desc">—</span>' : cellBtn(c.getValue() === '적용' ? '해제' : '적용', ok, tip)),
      cellClick: (_: any, c: any) => { const r = c.getRow().getData() as SbBlockMember; if (ok && r.applyState !== '만료') openStatus(r) },
    },
  ]
})
const openDetail = (r: SbBlockMember) => router.push({ path: routeOf('SP-PRT-100D'), query: { id: r.id } })
const openNew = () => router.push({ path: routeOf('SP-PRT-100D'), query: { mode: 'new' } })

/* --- M1 참여불가 적용상태 변경 --------------------------------------------- */
const stsOpen = ref(false)
const current = ref<SbBlockMember | null>(null)
const newExpire = ref<Date | null>(null)
function openStatus(r: SbBlockMember) { current.value = r; newExpire.value = null; stsOpen.value = true }
function doStatus(p: ActionPayload) {
  if (!current.value) return
  const to = current.value.applyState === '적용' ? '해제' : '적용'
  if (to === '적용' && current.value.expireAt === '' && !newExpire.value) return notify('만료 건을 적용으로 되돌리려면 새 만료일이 필요합니다.', 'danger')
  current.value.applyState = to
  if (newExpire.value) current.value.expireAt = newExpire.value.toLocaleDateString('ko-KR')
  reload()
  notify(`${current.value.workerName} — 참여불가 상태를 ${to}(으)로 바꿨습니다.`, 'success')
}
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="bm-q">성명 · 기업명</label></th>
        <td><InputText id="bm-q" v-model="f.q" fluid placeholder="노동자명 또는 기업명 일부" /></td>
        <th scope="row"><label for="bm-sts">적용상태</label></th>
        <td><Select v-model="f.sts" input-id="bm-sts" :options="[{ l: '전체', v: '__ALL__' }, { l: '적용', v: '적용' }, { l: '해제', v: '해제' }, { l: '만료', v: '만료' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">참여불가회원 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">성명은 가려 보인다 · 행을 누르면 상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="5000" modal-code="SP-PRT-100L-M2" /></SbCan>
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
        <li>부정행위 적발 사용자의 사업 참여제한 대상을 등록 · 관리한다.</li>
        <li>만료 건을 다시 적용으로 되돌리려면 새 만료일을 입력해야 한다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="stsOpen" code="SP-PRT-100L-M1" :header="`참여불가 ${current?.applyState === '적용' ? '해제' : '적용'}`"
      :target="current ? `${current.workerName} — ${current.company}` : ''"
      :reason="{ label: '사유', required: true, min: 5, max: 200 }"
      :confirm-label="current?.applyState === '적용' ? '해제' : '적용'" @confirm="doStatus"
    >
      <div v-if="current && current.applyState !== '적용' && current.expireAt === ''" style="display: grid; gap: 6px; margin-top: 8px">
        <label for="bm-exp" class="ws-req">새 만료일(만료 건을 적용으로 되돌릴 때 필수)</label>
        <DatePicker id="bm-exp" v-model="newExpire" date-format="yy.mm.dd" show-icon icon-display="input" />
      </div>
    </WsActionDialog>
  </div>
</template>
