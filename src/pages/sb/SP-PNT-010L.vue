<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PNT-010L 포인트관리 지급현황 지급목록 — 기업을 고르면 그 기업 소속 노동자별
 * 포인트 구분(지원기관 · 기업 · 개인) 배정 · 사용 · 잔여를 유저키(노동자) 단위로 합산해 보인다.
 * 조회 전용(경계 B9) — 지급 · 회수 · 조정은 여기서 하지 않는다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { usePaged } from '../../app/usePaged'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES, WORKERS } from '@fixtures/sb/common'
import { POINT_KINDS, assignsOfWorker, type PointKind } from '@fixtures/sb/B5'

const CODE = 'SP-PNT-010L'
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

/* --- 조회 ------------------------------------------------------------- */
const f = ref({ companyId: '', dev: '', kinds: [...POINT_KINDS] as PointKind[], sts: '', q: '' })
const applied = ref({ ...f.value, kinds: [...POINT_KINDS] as PointKind[] })
const companyOptions = computed(() => COMPANIES.map((c) => ({ label: `${c.name} (${c.bizNo})`, value: c.id })))
const isDev = (idx: number) => idx % 5 === 0

const workerRows = computed(() => {
  if (!applied.value.companyId) return []
  return WORKERS.filter((w) => w.companyId === applied.value.companyId).map((w, i) => {
    const bands = assignsOfWorker(w.id).filter((b) => applied.value.kinds.includes(b.kind))
    const initial = bands.reduce((s, b) => s + b.initial, 0)
    const actual = bands.reduce((s, b) => s + b.actual, 0)
    const usable = bands.reduce((s, b) => s + b.usable, 0)
    const used = bands.reduce((s, b) => s + b.used, 0)
    const remain = bands.reduce((s, b) => s + b.remain, 0)
    const startAt = bands[0]?.startAt ?? '—'
    const endAt = bands[0]?.endAt ?? '—'
    return { id: w.id, name: w.name, birth: w.birth, empNo: w.empNo, sts: w.sts, initial, actual, usable, used, remain, startAt, endAt, dev: isDev(i) }
  })
})
const filtered = computed(() => workerRows.value.filter((r) =>
  (!applied.value.dev || (applied.value.dev === 'Y' ? r.dev : !r.dev)) &&
  (!applied.value.sts || r.sts === applied.value.sts) &&
  (!applied.value.q.trim() || r.name.includes(applied.value.q.trim()) || r.empNo.includes(applied.value.q.trim()) || r.birth.includes(applied.value.q.trim())),
))
const failed = ref(false)
const lastOkAt = ref('2026.09.30 09:00')
const { rows, loading, error, reload, first, size, total } = usePaged(() => (failed.value ? [] : filtered.value), {
  failIf: () => failed.value,
})
onMounted(() => { if (applied.value.companyId) reload() })
watch(() => [applied.value.companyId, applied.value.kinds, applied.value.dev, applied.value.sts], () => { first.value = 0; reload() })

function search() {
  if (!f.value.companyId) return
  applied.value = { ...f.value, kinds: f.value.kinds.length ? [...f.value.kinds] : [...POINT_KINDS] }
  failed.value = f.value.q.includes('오류')
  first.value = 0
  reload()
}
function reset() { f.value = { companyId: '', dev: '', kinds: [...POINT_KINDS], sts: '', q: '' } }

/* --- 합계 영역 ---------------------------------------------------------- */
const totals = computed(() => filtered.value.reduce((s, r) => ({
  initial: s.initial + r.initial, usable: s.usable + r.usable, used: s.used + r.used, remain: s.remain + r.remain,
}), { initial: 0, usable: 0, used: 0, remain: 0 }))

/* --- 목록 ---------------------------------------------------------------- */
const columns = computed(() => [
  { title: '이름', field: 'name', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '사번', field: 'empNo', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '생년월일', field: 'birth', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'birth') },
  { title: '재직 상태', field: 'sts', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '초기배정', field: 'initial', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
  { title: '실배정', field: 'actual', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => {
    const d = c.getRow().getData()
    return d.actual !== d.initial ? `${d.actual.toLocaleString('ko-KR')} <span class="ws-badge ws-badge--warning" title="초기배정과 다름">조정</span>` : d.actual.toLocaleString('ko-KR')
  } },
  { title: '사용가능', field: 'usable', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
  { title: '사용', field: 'used', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
  { title: '잔여', field: 'remain', width: 110, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
  { title: '사용시작일', field: 'startAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '사용종료일', field: 'endAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
])
const openDetail = (r: any) => router.push({ path: routeOf('SP-PNT-010D'), query: { id: r.id } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '112px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="p-co" class="ws-req">기업</label></th>
        <td colspan="3"><Select v-model="f.companyId" input-id="p-co" :options="companyOptions" option-label="label" option-value="value" filter placeholder="기업을 검색해 고르세요" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="p-dev">발전모델 대상</label></th>
        <td><Select v-model="f.dev" input-id="p-dev" :options="[{ l: '전체', v: '' }, { l: '대상', v: 'Y' }, { l: '비대상', v: 'N' }]" option-label="l" option-value="v" fluid /></td>
        <th scope="row"><label for="p-sts">재직 상태</label></th>
        <td><Select v-model="f.sts" input-id="p-sts" :options="[{ l: '전체', v: '' }, { l: '이용중', v: '이용중' }, { l: '이용정지', v: '이용정지' }, { l: '환불요청', v: '환불요청' }, { l: '환불완료', v: '환불완료' }]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="p-kind">포인트 구분</label></th>
        <td><MultiSelect v-model="f.kinds" input-id="p-kind" :options="POINT_KINDS" display="chip" placeholder="전체" fluid /></td>
        <th scope="row"><label for="p-q">검색어</label></th>
        <td><InputText id="p-q" v-model="f.q" fluid placeholder="이름 · 사번 · 생년월일" /></td>
      </tr>
    </WsSearch>

    <template v-if="!applied.companyId">
      <section class="ws-sec"><div class="ws-empty"><p>기업을 먼저 고르세요.</p><p class="ws-desc">조회 조건에서 기업을 검색해 선택한 뒤 조회를 누르세요.</p></div></section>
    </template>
    <template v-else>
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">조회 결과 합계</h2><span class="ws-desc">사업연도 2026.01.01 ~ 2026.12.31 · 쪽이 아니라 조회 결과 전체</span></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">초기배정액</th><th scope="col">사용가능금액</th><th scope="col">사용총액</th><th scope="col">잔여총액</th></tr></thead>
          <tbody><tr><td class="ws-num">{{ won(totals.initial) }}</td><td class="ws-num">{{ won(totals.usable) }}</td><td class="ws-num">{{ won(totals.used) }}</td><td class="ws-num">{{ won(totals.remain) }}</td></tr></tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">지급 목록</h2>
            <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
            <span class="ws-desc">행을 누르면 지급상세 · 이름 · 생년월일은 가려져 있다</span>
          </div>
          <div class="ws-tit__r">
            <SbCan action="download-pii"><WsDownload :total="total" :limit="50000" label="목록 내려받기" modal-code="SP-PNT-010L-M1" /></SbCan>
            <SbCan action="download-pii"><WsDownload :total="total" :limit="50000" label="월별 상세 내려받기" modal-code="SP-PNT-010L-M1" /></SbCan>
          </div>
        </div>
        <QueryState :loading="loading" :error="error ? `포인트 정보를 가져오지 못했습니다 — 마지막 성공 조회 ${lastOkAt}` : null" :empty="rows.length === 0" :lines="10" @retry="() => { failed = false; reload() }">
          <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
        </QueryState>
        <WsPager v-model:first="first" v-model:rows="size" :total="total" />
      </section>
    </template>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>값은 복지몰 포인트 원장을 조회해 보여 준다 — 이 화면에서 포인트를 지급 · 회수 · 조정하지 않는다.</li>
        <li>50,000건을 넘으면 내려받을 수 없다. 조회 결과가 0건이면 조건을 좁혀 다시 조회한다.</li>
        <li>검색어에 <b>오류</b>를 넣으면 복지몰 조회 실패 화면이 나온다(미리보기).</li>
      </ul>
    </div>
  </div>
</template>
