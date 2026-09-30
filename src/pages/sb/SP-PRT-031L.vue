<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-031L 참여노동자관리 인원추가심사목록. 처리는 하지 않는다 — 조회 · 다운로드만(스펙 note).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { EXTRA_REQUESTS, EXTRA_LABEL, type SbExtraRequest, type ExtraSts } from '@fixtures/sb/B4'

const router = useRouter()
const STS_OPTS: ExtraSts[] = ['611', '612', '613', '614', '615', '616']
const TONE: Record<ExtraSts, string> = { '611': 'info', '612': 'warning', '613': 'warning', '614': 'success', '615': 'mute', '616': 'success' }

const blank = () => ({ company: '', sts: '__ALL__' as string })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => EXTRA_REQUESTS.filter((x) => x.biz === ctx.biz))
const hit = (r: SbExtraRequest) => (applied.value.sts === '__ALL__' || r.sts === applied.value.sts) && (!applied.value.company.trim() || r.company.includes(applied.value.company.trim()))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.company.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => ctx.biz, () => requery())

function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const columns = computed(() => [
  { title: '기업명', field: 'company', minWidth: 140 },
  { title: '사업자등록번호', field: 'bizNo', width: 112, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '신청일시', field: 'appliedAt', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '추가 인원', field: 'count', width: 84, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => `${c.getValue()}명` },
  { title: '추가 분담금', field: 'id', width: 108, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => { const r = c.getRow().getData() as SbExtraRequest; return (r.count * r.unitCost).toLocaleString('ko-KR') } },
  { title: '입금기한', field: 'depositDue', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '상태', field: 'sts', width: 108, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--${TONE[c.getValue() as ExtraSts]}">${EXTRA_LABEL[c.getValue() as ExtraSts]}</span>` },
])
const openDetail = (r: SbExtraRequest) => router.push({ path: routeOf('SP-PRT-031D'), query: { id: r.id } })
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="x-co">기업명</label></th>
        <td><InputText id="x-co" v-model="f.company" fluid placeholder="기업명 일부" /></td>
        <th scope="row"><label for="x-sts">상태</label></th>
        <td><Select v-model="f.sts" input-id="x-sts" :options="[{ l: '전체', v: '__ALL__' }, ...STS_OPTS.map((c) => ({ l: EXTRA_LABEL[c], v: c }))]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">인원추가심사 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">{{ bizLabel(ctx.biz) }} · 신청일시 최신순 · 행을 누르면 인원추가심사상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download-pii"><WsDownload :total="total" :limit="10000" modal-code="SP-PRT-031L-M1" /></SbCan>
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
        <li>이 목록에서는 처리하지 않는다. 보완필요 · 승인 · 취소는 인원추가심사상세에서 한다.</li>
        <li>신청은 기업 어드민 인원추가신청 화면에서 한다.</li>
      </ul>
    </div>
  </div>
</template>
