<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-040L 공지사항 목록 — 명세 src/specs/SP-OPS-040L.json */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsCountTabs, { type CountTab } from '../../ws/WsCountTabs.vue'
import { presetRange, periodError, PRESETS, type Range } from '../../ws/period'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { notices, type Notice, type NoticeKind } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-040L'
const router = useRouter()
const NOTICE_TYPE = ['사업공지', '이벤트공지', '서비스이용공지']

const blank = () => ({ range: presetRange(PRESETS[4]) as Range, title: '', type: '', display: '' as string })
const f = ref(blank())
const applied = ref(blank())
const kind = ref<string>('전체')

const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: Notice) => {
  const a = applied.value
  const d = day(r.createdAt.slice(0, 10))
  return (kind.value === '전체' || r.kind === kind.value) && (!a.type || r.type === a.type) && (!a.display || r.display === a.display) &&
    (!a.title.trim() || r.title.includes(a.title.trim())) && (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const sorted = computed(() => [...notices].sort((x, y) => (Number(y.pinned) - Number(x.pinned)) || y.createdAt.localeCompare(x.createdAt)))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => sorted.value.filter(hit), { failIf: () => applied.value.title.includes(ERROR_KEYWORD) })
onMounted(reload)
function search() {
  if (periodError(f.value.range, { maxYears: 4 })) return notify('조회 기간을 확인하세요 — 시작일이 종료일보다 늦습니다.', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); kind.value = '전체'; search() }

const tabs = computed<CountTab[]>(() => (['전체', '공통공지', '사용자공지', '기업공지'] as const).map((k) => ({ id: k, label: k, count: k === '전체' ? notices.length : notices.filter((n) => n.kind === (k as NoticeKind)).length })))
watch(kind, search)

const columns = computed(() => [
  { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '공지구분', field: 'kind', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '공지유형', field: 'type', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '제목', field: 'title', minWidth: 200, formatter: (c: any) => `${c.getRow().getData().pinned ? '<span class="ws-badge ws-badge--brand">고정</span> ' : ''}${c.getValue()}` },
  { title: '첨부', field: 'hasAttach', width: 60, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? 'O' : '—') },
  { title: '전시여부', field: 'display', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '미전시' ? ' ws-badge--mute' : ' ws-badge--success'}">${c.getValue()}</span>` },
  { title: '조회수', field: 'views', width: 80, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '등록자', field: 'writer', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '등록일시', field: 'createdAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  {
    title: '미리보기', field: 'id', width: 80, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: () => '<button type="button" class="ws-cellbtn">보기</button>',
    cellClick: (_: any, c: any) => openPreview(c.getRow().getData()),
  },
])
const openDetail = (r: Notice) => router.push({ path: routeOf('SP-OPS-040D'), query: { id: r.id } })
const create = () => { if (can(CODE, 'create')) router.push({ path: routeOf('SP-OPS-040D'), query: { id: 'new' } }) }
const fmt = (n: number) => n.toLocaleString('ko-KR')

const preview = ref<Notice | null>(null)
const previewOpen = ref(false)
const previewTab = ref<'누리집' | '기업 어드민'>('누리집')
function openPreview(r: Notice) { preview.value = r; previewTab.value = '누리집'; previewOpen.value = true }
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-from">등록기간</label></th>
        <td colspan="3"><WsPeriod id="q-from" v-model="f.range" :limit="{ maxYears: 4 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-title">제목</label></th>
        <td><InputText id="q-title" v-model="f.title" fluid placeholder="제목 일부" /></td>
        <th scope="row"><label for="q-type">공지유형</label></th>
        <td><Select v-model="f.type" input-id="q-type" :options="[{ l: '전체', v: '' }, ...NOTICE_TYPE.map((t) => ({ l: t, v: t }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-disp">전시여부</label></th>
        <td><Select v-model="f.display" input-id="q-disp" :options="[{ l: '전체', v: '' }, { l: '전시', v: '전시' }, { l: '미전시', v: '미전시' }]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
        <td colspan="2" />
      </tr>
    </WsSearch>
    <section class="ws-sec">
      <WsCountTabs v-model="kind" label="공지구분" :tabs="tabs" />
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">공지사항 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span><span class="ws-desc">등록일 최신순 · 상단 고정 우선</span></div>
        <div class="ws-tit__r"><SbCan action="create"><Button label="등록" @click="create" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <Dialog v-model:visible="previewOpen" modal header="공지 미리보기" :style="{ width: '520px' }" :draggable="false">
      <div v-if="preview">
        <div v-if="preview.kind === '공통공지'" class="ws-chips" style="margin-bottom:10px">
          <button type="button" class="ws-chip" :aria-pressed="previewTab === '누리집'" @click="previewTab = '누리집'">누리집</button>
          <button type="button" class="ws-chip" :aria-pressed="previewTab === '기업 어드민'" @click="previewTab = '기업 어드민'">기업 어드민</button>
        </div>
        <h3 style="margin:0 0 8px">{{ preview.title }}</h3>
        <p class="ws-desc">{{ preview.type }} · {{ preview.createdAt }}</p>
        <p style="margin-top:10px">{{ preview.content }}</p>
        <p v-if="preview.hasAttach" class="ws-desc">첨부: 공지첨부.pdf</p>
      </div>
      <template #footer><SbCode code="SP-OPS-040L-M1" /><Button label="닫기" @click="previewOpen = false" /></template>
    </Dialog>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>상단 고정 공지는 등록일과 관계없이 맨 위에 보인다.</li><li>등록 · 삭제는 상세(SP-OPS-040D)에서 한다.</li></ul></div>
  </div>
</template>

<style scoped>
.ws-chips { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
