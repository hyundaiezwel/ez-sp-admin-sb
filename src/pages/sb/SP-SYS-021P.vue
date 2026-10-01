<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-SYS-021P 이력 개인정보 접근이력 — 누가 언제 어느 화면에서 조회 · 가림 해제 · 다운로드했는지 조회.
 * 엑셀 다운로드 사유 등록(SP-CMN-040D)의 사유 · 건수 · 사유 확인 대상 표시가 여기 모인다.
 * 마스터가 사유 확인 대상을 열어 적정 · 소명 요청으로 확인 메모를 남긴다(M1). 기록 자체는 고치지 않는다.
 */
import { computed, onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { presetRange, PRESETS, type Range } from '../../ws/period'
import { badgeClass } from '../../ws/badge'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { notify } from '../../ws/notify'
import { PII_LOGS, type SbPiiLog, type PiiAction } from '@fixtures/sb/B1'

const CODE = 'SP-SYS-021P'
const ACTIONS: PiiAction[] = ['조회', '가림 해제', '다운로드']

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, name: '', action: 'ALL', flaggedOnly: false })
const f = ref(blank())
const applied = ref(blank())
const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: SbPiiLog) => {
  const a = applied.value
  const d = day(r.at)
  return (!a.name.trim() || r.adminName.includes(a.name.trim()) || r.screen.includes(a.name.trim())) &&
    (a.action === 'ALL' || r.action === a.action) && (!a.flaggedOnly || r.flagged) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => PII_LOGS.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

/* --- 접근 상세 · 사유 확인(M1) ----------------------------------------------- */
const detailOpen = ref(false)
const current = ref<SbPiiLog | null>(null)
const result = ref<'적정' | '소명 요청' | null>(null)
const note = ref('')
function openDetail(r: SbPiiLog) {
  current.value = r
  result.value = r.reviewResult
  note.value = r.reviewNote
  detailOpen.value = true
}
function confirmReview() {
  if (!current.value) return
  if (!result.value) return notify('확인 결과를 고르세요.', 'danger')
  if (note.value.trim().length < 10) return notify('확인 메모를 10자 이상 입력하세요.', 'danger')
  current.value.reviewResult = result.value
  current.value.reviewNote = note.value.trim()
  current.value.reviewBy = '나'
  current.value.reviewAt = '방금'
  detailOpen.value = false
  notify(`확인 결과를 ${result.value}(으)로 남겼습니다.`, 'success')
}

const columns = computed(() => {
  const ok = can(CODE, 'status'), tip = denyTip(CODE, 'status')
  return [
    { title: '일시', field: 'at', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '사용자', field: 'adminName', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '화면', field: 'screen', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '행위', field: 'action', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '건수', field: 'count', width: 84, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
    { title: '사유', field: 'reason', minWidth: 160 },
    {
      title: '확인', field: 'flagged', width: 130, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => {
        const row = c.getRow().getData() as SbPiiLog
        if (!row.flagged) return '<span class="ws-desc">—</span>'
        if (row.reviewResult) return `<span class="${badgeClass(row.reviewResult === '적정' ? 'success' : 'warning')}">${row.reviewResult}</span>`
        return `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>확인 대상</button>`
      },
      cellClick: (_: any, c: any) => { if (ok) openDetail(c.getRow().getData()) },
    },
  ]
})
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="p-from">조회기간</label></th>
        <td colspan="3"><WsPeriod id="p-from" v-model="f.range" :limit="{ maxYears: 3 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="p-name">사용자 · 화면</label></th>
        <td><InputText id="p-name" v-model="f.name" fluid /></td>
        <th scope="row"><label for="p-act">행위</label></th>
        <td><Select v-model="f.action" input-id="p-act" :options="[{ l: '전체', v: 'ALL' }, ...ACTIONS.map((a) => ({ l: a, v: a }))]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="p-flag">사유 확인 대상</label></th>
        <td colspan="3"><div class="ws-check"><Checkbox v-model="f.flaggedOnly" input-id="p-flag" binary /><label for="p-flag">확인 대상만 보기</label></div></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">개인정보 접근이력</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">조회 · 가림 해제 · 다운로드 · 확인 대상 행을 누르면 상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download"><WsDownload :total="total" :limit="50000" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>업무시간(09~18시) 밖이거나 1,000건을 넘는 다운로드는 사유 확인 대상으로 표시한다(SP-CMN-040D REQ-08 값을 그대로 따른다).</li>
        <li>확인은 마스터만 한다 — 다른 역할은 상단 <b>역할</b>을 바꿔 버튼이 꺼지는 것을 확인한다.</li>
        <li>기록 자체(일시 · 사용자 · 건수)는 고치지 않는다 — 확인 결과 · 메모만 더한다.</li>
      </ul>
    </div>

    <Dialog v-model:visible="detailOpen" modal header="접근 상세 · 사유 확인" :style="{ width: '480px' }" :draggable="false">
      <div v-if="current" class="pii-detail">
        <dl class="pii-detail__ro">
          <dt>일시 · 사용자</dt><dd>{{ current.at }} · {{ current.adminName }}({{ current.org }})</dd>
          <dt>화면 · 행위</dt><dd>{{ current.screen }} · {{ current.action }}</dd>
          <dt>조회 조건</dt><dd>{{ current.queryCond }}</dd>
          <dt>사유 원문</dt><dd>{{ current.reason }}</dd>
          <dt>건수 · 파일명</dt><dd>{{ current.count.toLocaleString('ko-KR') }}건{{ current.fileName ? ` · ${current.fileName}` : '' }}</dd>
        </dl>
        <fieldset class="pii-detail__opts">
          <legend class="ws-req">확인 결과</legend>
          <div class="ws-radio"><RadioButton v-model="result" input-id="pv-ok" name="pv" value="적정" /><label for="pv-ok">적정</label></div>
          <div class="ws-radio"><RadioButton v-model="result" input-id="pv-ask" name="pv" value="소명 요청" /><label for="pv-ask">소명 요청</label></div>
        </fieldset>
        <label for="pv-note" class="ws-req">확인 메모(10~200자)</label>
        <Textarea id="pv-note" v-model="note" rows="3" fluid maxlength="200" placeholder="확인한 근거를 남긴다" />
        <p v-if="current.reviewBy" class="ws-desc">이전 확인: {{ current.reviewBy }} · {{ current.reviewAt }}</p>
      </div>
      <template #footer>
        <SbCode code="SP-SYS-021P-M1" />
        <Button label="취소" severity="secondary" outlined @click="detailOpen = false" />
        <Button label="확인 등록" @click="confirmReview" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.pii-detail { display: grid; gap: 12px; }
.pii-detail__ro { display: grid; grid-template-columns: 96px 1fr; gap: 6px 10px; margin: 0; }
.pii-detail__ro dt { color: var(--ws-text-sub); }
.pii-detail__ro dd { margin: 0; }
.pii-detail__opts { display: flex; gap: 16px; margin: 0; padding: 0; border: 0; }
</style>
