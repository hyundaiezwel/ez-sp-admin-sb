<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-040L 기업담당자관리 담당자목록. 잠금 해제 · 비밀번호 초기화는 행에서 바로(총괄 이상 · 운영사 CS).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
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
import { mask } from '../../ws/mask'
import { MANAGERS, type SbManager, type AcctSts } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-040L'
const router = useRouter()
const STS_OPTS: AcctSts[] = ['사용', '휴면', '잠금', '사용중지']
const TONE: Record<AcctSts, string> = { 사용: 'success', 휴면: 'mute', 잠금: 'warning', 사용중지: 'danger' }

const blank = () => ({ q: '', sts: '__ALL__' as string })
const f = ref(blank())
const applied = ref(blank())
const hit = (r: SbManager) => (applied.value.sts === '__ALL__' || r.acctSts === applied.value.sts) &&
  (!applied.value.q.trim() || r.company.includes(applied.value.q.trim()) || r.loginId.includes(applied.value.q.trim()) || r.name.includes(applied.value.q.trim()))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => MANAGERS.filter(hit), {
  failIf: () => applied.value.q.includes(ERROR_KEYWORD),
})
onMounted(reload)

function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const cellBtn = (label: string, ok: boolean, tip: string) =>
  `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}" aria-label="${label} — ${tip}"`}>${label}</button>`
const columns = computed(() => {
  const ok = can(CODE, 'account')
  const tip = denyTip(CODE, 'account')
  return [
    { title: '기업명', field: 'company', minWidth: 140 },
    { title: '담당자명', field: 'name', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
    { title: '아이디', field: 'loginId', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '연락처', field: 'phone', width: 112, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'phone') },
    { title: '계정상태', field: 'acctSts', width: 92, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--${TONE[c.getValue() as AcctSts]}">${c.getValue()}</span>` },
    { title: '최근 로그인', field: 'lastLoginAt', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
    {
      title: '잠금 해제', field: 'acctSts', width: 92, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => (c.getValue() === '잠금' ? cellBtn('잠금 해제', ok, tip) : '<span class="ws-desc">—</span>'),
      cellClick: (_: any, c: any) => { const r = c.getRow().getData() as SbManager; if (ok && r.acctSts === '잠금') openUnlock(r) },
    },
    {
      title: '비밀번호 초기화', field: 'id', width: 100, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: () => cellBtn('초기화', ok, tip),
      cellClick: (_: any, c: any) => { if (ok) openReset(c.getRow().getData() as SbManager) },
    },
  ]
})
const openDetail = (r: SbManager) => router.push({ path: routeOf('SP-PRT-040D'), query: { id: r.id } })

/* --- M1 잠금 해제 ---------------------------------------------------------- */
const unlockOpen = ref(false)
const current = ref<SbManager | null>(null)
function openUnlock(r: SbManager) { current.value = r; unlockOpen.value = true }
function doUnlock() {
  if (!current.value) return
  current.value.acctSts = '사용'
  reload()
  notify(`${current.value.company} · ${current.value.loginId} — 잠금을 해제했습니다.`, 'success')
  unlockOpen.value = false
}

/* --- M2 비밀번호 초기화 ------------------------------------------------------ */
const resetOpen = ref(false)
function openReset(r: SbManager) { current.value = r; resetOpen.value = true }
function doReset(p: ActionPayload) {
  if (!current.value) return
  notify(`${current.value.company} · ${current.value.loginId} — 임시 비밀번호를 발급했습니다 · LMS가 발송됩니다.`, 'success')
}

const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="m-q">검색어</label></th>
        <td><InputText id="m-q" v-model="f.q" fluid placeholder="기업명 · 아이디 · 담당자명" /></td>
        <th scope="row"><label for="m-sts">계정상태</label></th>
        <td><Select v-model="f.sts" input-id="m-sts" :options="[{ l: '전체', v: '__ALL__' }, ...STS_OPTS.map((s) => ({ l: s, v: s }))]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">담당자 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>명</span>
          <span class="ws-desc">행을 누르면 담당자상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="10000" modal-code="SP-PRT-040L-M3" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="8" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>담당자명 · 연락처는 가려 보인다.</li>
        <li>잠금 상태만 행에서 바로 잠금 해제할 수 있다. 비밀번호 초기화 · 사용중지는 담당자상세에서 한다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="unlockOpen" code="SP-PRT-040L-M1" header="로그인 잠금 해제"
      :target="current ? `${current.company} · ${current.loginId}` : ''"
      :reason="{ label: '처리 사유' }"
      confirm-label="해제" @confirm="doUnlock"
    />
    <WsActionDialog
      v-model:visible="resetOpen" code="SP-PRT-040L-M2" header="비밀번호 초기화"
      :target="current ? `${current.company} · ${current.loginId}` : ''"
      :reason="{ label: '초기화 사유', required: true, min: 5, max: 100 }"
      notice="담당자에게 임시 비밀번호 LMS가 발송됩니다." confirm-label="초기화" @confirm="doReset"
    />
  </div>
</template>
