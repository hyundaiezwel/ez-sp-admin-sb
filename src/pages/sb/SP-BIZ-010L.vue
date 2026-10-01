<!-- SB-DONE -->
<script setup lang="ts">
/** SP-BIZ-010L 사업관리 목록 — 연도 · 차수별 「사업」 조회·등록 출발점. 건수가 적어 페이징 없이 한 쪽에 보인다. */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { YEARS } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BIZ_LIST, type BizStatus } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-010L'
const router = useRouter()

const STATUS_TONE: Record<BizStatus, string> = { 준비: 'mute', 모집중: 'brand', 심사중: 'info', 발표: 'warning', 운영: 'success', 종료: 'mute' }

const blank = () => ({ year: 2026, type: '', growth: '', status: 'ALL', name: '' })
const f = ref(blank())
const applied = ref(blank())
const loading = ref(false)
const error = ref<string | null>(null)

const filtered = computed(() => {
  const a = applied.value
  return BIZ_LIST.filter((b) =>
    b.year === a.year &&
    (!a.type || b.type === a.type) &&
    (!a.growth || (a.growth === 'Y' ? !!b.growthModelId : !b.growthModelId)) &&
    (a.status === 'ALL' || b.status === a.status) &&
    (!a.name.trim() || b.name.includes(a.name.trim())),
  ).sort((x, y) => x.round - y.round)
})

function search() { applied.value = { ...f.value }; error.value = null }
function reset() { f.value = blank(); search() }
search()

const columns = computed(() => [
  { title: '번호', field: '_no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '사업진행년도', field: 'year', width: 92, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '차수', field: 'round', width: 56, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '지원구분', field: 'type', width: 76, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '사업명', field: 'name', minWidth: 200 },
  { title: '발전모델 대상', field: 'growthModelId', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '대상' : '비대상') },
  { title: '모집기간', field: '_recruit', width: 176, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '자격심사기간', field: '_review', width: 176, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '심사발표일', field: '_announce', width: 96, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '진행상태', field: 'status', width: 88, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--${STATUS_TONE[c.getValue() as BizStatus]}">${c.getValue()}</span>` },
  { title: '등록자', field: 'registeredBy', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '등록일', field: 'registeredAt', width: 140, hozAlign: 'center', headerHozAlign: 'center' },
])
const day = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
const rows = computed(() => filtered.value.map((b, i) => ({
  ...b, _no: filtered.value.length - i, _recruit: `${day(b.recruit[0])}~${day(b.recruit[1])}`,
  _review: `${day(b.review[0])}~${day(b.review[1])}`, _announce: day(b.announceAt),
})))

const openDetail = (r: { code: string }) => router.push({ path: routeOf('SP-BIZ-010D'), query: { id: r.code } })
function openCreate() {
  if (!can(CODE, 'create')) return
  router.push({ path: routeOf('SP-BIZ-010D'), query: { mode: 'new' } })
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="b-year">사업진행년도</label></th>
        <td><Select v-model="f.year" input-id="b-year" :options="YEARS.filter((y) => y <= 2027)" fluid /></td>
        <th scope="row">지원구분</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="지원구분">
            <div v-for="[v, l] in [['', '전체'], ['일반', '일반'], ['발전', '발전']]" :key="v" class="ws-radio"><RadioButton v-model="f.type" :input-id="`b-t-${v}`" name="b-t" :value="v" /><label :for="`b-t-${v}`">{{ l }}</label></div>
          </div>
        </td>
      </tr>
      <tr>
        <th scope="row">발전모델 대상</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="발전모델 대상">
            <div v-for="[v, l] in [['', '전체'], ['Y', '대상'], ['N', '비대상']]" :key="v" class="ws-radio"><RadioButton v-model="f.growth" :input-id="`b-g-${v}`" name="b-g" :value="v" /><label :for="`b-g-${v}`">{{ l }}</label></div>
          </div>
        </td>
        <th scope="row"><label for="b-sts">진행상태</label></th>
        <td><Select v-model="f.status" input-id="b-sts" :options="[{ l: '전체', v: 'ALL' }, ...(['준비', '모집중', '심사중', '발표', '운영', '종료'].map((s) => ({ l: s, v: s })))]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="b-name">사업명</label></th>
        <td colspan="3"><InputText id="b-name" v-model="f.name" fluid placeholder="사업명 일부" /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">사업 목록</h2>
          <span class="ws-total">총<strong>{{ rows.length }}</strong>건</span>
          <span class="ws-desc">사업진행년도 최신순, 같은 해는 차수 순</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="create"><Button label="사업 등록" severity="contrast" @click="openCreate" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="6">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>사업진행년도 선택지는 2018년부터 다음 해(2027)까지 — 다음 해 사업을 미리 등록할 수 있다.</li>
        <li>행을 누르면 사업 상세(SP-BIZ-010D)가 열린다. '사업 등록'은 등록(create) 권한이 있어야 켜진다.</li>
        <li>이 목록은 어드민 전체 사업 선택지 · 전역 조건의 원천이다. 삭제 기능은 두지 않았다.</li>
      </ul>
    </div>
  </div>
</template>
