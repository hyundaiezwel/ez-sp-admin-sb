<!-- SB-DONE -->
<script setup lang="ts">
/** SP-BIZ-040L 동반성장 협력사업관리 동반성장기업 목록 — 참여기관을 조회·등록한다. */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { usePaged } from '../../app/usePaged'
import { notify } from '../../ws/notify'
import { YEARS } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { routeOf } from '../../sb/screens'
import { PARTNERS, participantsOf, type SbPartner } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-040L'
const router = useRouter()

const MGR_STATUS = ['등록(가입)', '등록(미가입)', '미등록']
const mgrStatusOf = (p: SbPartner) => p.managers[0]?.status ?? '미등록'

const blank = () => ({ year: 2026, mgrStatus: '', kw: '' })
const f = ref(blank())
const applied = ref(blank())

const all = computed(() => PARTNERS.filter((p) => p.year === applied.value.year))
const hit = (p: SbPartner) => {
  const a = applied.value
  return (!a.mgrStatus || mgrStatusOf(p) === a.mgrStatus) && (!a.kw.trim() || p.name.includes(a.kw.trim()) || p.managers.some((m) => m.name.includes(a.kw.trim())))
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit))
onMounted(reload)
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }
search()

const columns = computed(() => [
  { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '기관명', field: 'name', minWidth: 160 },
  { title: '지원기업', field: '_links', width: 84, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '참가자(전체/참여개시)', field: '_part', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '담당 등록자', field: '_mgr', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '포인트 사용기한', field: 'pointDeadline', width: 108, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '최종수정일', field: 'updatedAt', width: 140, hozAlign: 'center', headerHozAlign: 'center' },
  {
    title: '담당자관리', field: 'id', width: 96, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: () => `<button type="button" class="ws-cellbtn">담당자관리</button>`,
    cellClick: (_: any, c: any) => openDetail(c.getRow().getData(), 'managers'),
  },
])
const view = computed(() => rows.value.map((p, i) => {
  const active = participantsOf(p)
  return { ...p, no: total.value - (first.value + i), _links: p.links.filter((l) => !l.releasedAt).length, _part: `${active.reduce((s, x) => s + x.total, 0)} / ${active.reduce((s, x) => s + x.started, 0)}`, _mgr: `${p.managers.filter((m) => m.status !== '미등록').length} / ${p.managers.length}` }
}))
const openDetail = (p: { id: string }, tab?: string) => router.push({ path: routeOf('SP-BIZ-040D'), query: { id: p.id, ...(tab ? { tab } : {}) } })

/* --- 등록(M2) --------------------------------------------------------------- */
const regOpen = ref(false)
const reg = ref({ name: '', bizNo: '', year: 2026, deadline: null as Date | null, note: '' })
function openReg() { reg.value = { name: '', bizNo: '', year: applied.value.year, deadline: null, note: '' }; regOpen.value = true }
function saveReg() {
  if (!reg.value.name.trim() || !reg.value.bizNo.trim()) return notify('기관명과 사업자등록번호를 입력하세요.', 'danger')
  if (PARTNERS.some((p) => p.year === reg.value.year && p.bizNo === reg.value.bizNo)) return notify('이미 등록된 동반성장기업입니다 — 같은 해 같은 사업자등록번호가 있습니다.', 'danger')
  const id = `PT-${String(PARTNERS.length + 1).padStart(3, '0')}`
  const deadline = reg.value.deadline ? `${reg.value.deadline.getFullYear()}.${String(reg.value.deadline.getMonth() + 1).padStart(2, '0')}.${String(reg.value.deadline.getDate()).padStart(2, '0')}` : `${reg.value.year}.12.31`
  PARTNERS.push({ id, name: reg.value.name.trim(), bizNo: reg.value.bizNo.trim(), year: reg.value.year, pointDeadline: deadline, note: reg.value.note, registeredAt: new Date().toLocaleString('ko-KR'), updatedAt: new Date().toLocaleString('ko-KR'), managers: [], links: [], history: [{ id: `H-${id}-0`, at: new Date().toLocaleString('ko-KR'), by: '나(미리보기)', reason: '등록', changes: [] }] })
  notify(`'${reg.value.name}'을(를) 등록했습니다.`, 'success')
  regOpen.value = false
  router.push({ path: routeOf('SP-BIZ-040D'), query: { id } })
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="pl-year">참여년도</label></th>
        <td><Select v-model="f.year" input-id="pl-year" :options="YEARS.filter((y) => y <= 2027)" fluid /></td>
        <th scope="row"><label for="pl-mgr">담당자 등록상태</label></th>
        <td><Select v-model="f.mgrStatus" input-id="pl-mgr" :options="[{ l: '전체', v: '' }, ...MGR_STATUS.map((s) => ({ l: s, v: s }))]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="pl-kw">검색어</label></th>
        <td colspan="3"><InputText id="pl-kw" v-model="f.kw" fluid placeholder="기관명 또는 담당자명" /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">동반성장기업 목록</h2>
          <span class="ws-total">총<strong>{{ total }}</strong>건</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="20000" modal-code="SP-BIZ-040L-M1" /></SbCan>
          <SbCan action="create"><Button label="동반성장기업 등록" severity="contrast" @click="openReg" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="8" @retry="reload">
        <TabGrid :columns="columns" :rows="view" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>기관명을 누르면 동반성장기업 상세(SP-BIZ-040D)가 열린다. 지원기업 연계 · 해제는 상세에서 한다.</li>
        <li>담당 등록자 이름은 가려 보인다. 엑셀은 사유를 등록해야 내려받는다(2만 건 초과 시 막는다).</li>
      </ul>
    </div>

    <!-- M2 동반성장기업 등록 -->
    <Dialog v-model:visible="regOpen" modal header="동반성장기업 등록" :style="{ width: '480px' }" :draggable="false">
      <table class="ws-tb">
        <colgroup><col style="width: 120px" /><col /></colgroup>
        <tbody>
          <tr><th scope="row" class="req"><label for="rg-name">기관명</label></th><td><InputText id="rg-name" v-model="reg.name" fluid /></td></tr>
          <tr><th scope="row" class="req"><label for="rg-bn">사업자등록번호</label></th><td><InputText id="rg-bn" v-model="reg.bizNo" fluid placeholder="000-00-00000" /></td></tr>
          <tr><th scope="row">참여년도</th><td><Select v-model="reg.year" :options="[2026, 2027]" style="width: 110px" /></td></tr>
          <tr><th scope="row">포인트 사용기한</th><td><DatePicker v-model="reg.deadline" date-format="yy.mm.dd" placeholder="기본값 연말" /></td></tr>
          <tr><th scope="row"><label for="rg-note">비고</label></th><td><InputText id="rg-note" v-model="reg.note" fluid /></td></tr>
        </tbody>
      </table>
      <template #footer>
        <SbCode code="SP-BIZ-040L-M2" />
        <Button label="취소" severity="secondary" outlined @click="regOpen = false" />
        <Button label="저장" @click="saveReg" />
      </template>
    </Dialog>
  </div>
</template>
