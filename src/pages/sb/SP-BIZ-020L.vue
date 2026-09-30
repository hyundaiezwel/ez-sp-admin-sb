<!-- SB-DONE -->
<script setup lang="ts">
/** SP-BIZ-020L 발전모델관리 목록 — 참여년도별 「발전모델」과 적용기업 수. 참여년도를 고르지 않으면 조회하지 않는다. */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { YEARS, bizLabel, coFgLabel } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { GROWTH_MODELS, appliedCompaniesOf } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-020L'
const router = useRouter()

const year = ref<number | null>(2026)
const applied = ref<number | null>(null)

function search() {
  if (!year.value) return notify('참여년도를 선택하세요.', 'danger')
  applied.value = year.value
}
function reset() { year.value = 2026; search() }
search()

const rows = computed(() => (applied.value ? GROWTH_MODELS.filter((m) => m.year === applied.value) : []))

const columns = computed(() => [
  { title: '번호', field: '_no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '참여년도', field: 'year', width: 92, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '발전모델명', field: 'name', minWidth: 200 },
  { title: '참여년수', field: 'years', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업구분', field: '_coFg', width: 140, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '적용기업', field: '_applied', width: 84, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '연결 사업', field: '_biz', width: 160, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '최종수정일', field: 'updatedAt', width: 140, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '최종수정자', field: 'updatedBy', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
])
const view = computed(() => rows.value.map((m, i) => ({
  ...m, _no: rows.value.length - i, _coFg: m.coFgs.map(coFgLabel).join(' · '),
  _applied: appliedCompaniesOf(m).length, _biz: m.linkedBizCode ? bizLabel(m.linkedBizCode) : '—',
})))

const openDetail = (r: { id: string }) => router.push({ path: routeOf('SP-BIZ-020D'), query: { id: r.id } })
function openCreate() {
  if (!can(CODE, 'create')) return
  router.push({ path: routeOf('SP-BIZ-020D'), query: { mode: 'new', year: String(applied.value ?? year.value) } })
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row" class="req"><label for="g-year">참여년도</label></th>
        <td><Select v-model="year" input-id="g-year" :options="YEARS.filter((y) => y <= 2027)" fluid placeholder="선택" /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">발전모델 목록</h2>
          <span class="ws-total">총<strong>{{ view.length }}</strong>건</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="create"><Button label="발전모델 등록" severity="contrast" @click="openCreate" /></SbCan>
        </div>
      </div>
      <QueryState :loading="false" :error="null" :empty="applied !== null && view.length === 0" :lines="4" empty-text="참여년도에 등록된 발전모델이 없습니다.">
        <TabGrid v-if="applied !== null" :columns="columns" :rows="view" height="auto" @row-click="openDetail" />
        <p v-else class="ws-desc">참여년도를 고르고 조회를 눌러 주세요.</p>
      </QueryState>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>참여년도 선택지는 2018년부터 다음 해(2027)까지 — 다음 해 모델을 미리 만들 수 있다.</li>
        <li>발전모델명을 누르면 발전모델 상세(SP-BIZ-020D)가 열린다. 사업 상세의 발전모델 설정 탭에서도 같은 목록을 부른다.</li>
        <li>'적용기업' 수는 조건 일치 + 지정 기업을 합친 조회 시점 값이다.</li>
      </ul>
    </div>
  </div>
</template>
