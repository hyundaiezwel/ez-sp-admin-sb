<script setup lang="ts">
/**
 * 기초정보 심사 — AS-IS S-003-04 기초정보관리 + S-003-10 RPA 사본(난이도 5).
 *
 * 복합 셀을 **열로 나눴다**(결정 2026-09-28). AS-IS `참여근로자수 (최초/추가/최종)`는 한 칸에
 * 세 값을 줄바꿈으로 넣어 행이 35를 넘고 정렬도 안 됐다. 2단 머리글로 묶으면 행 35가 유지되고
 * 칸마다 정렬된다.
 *
 * 승인 흐름에 참여불가회원 검출이 물려 있다(A2 §2) — **막지 않고 경고한다.**
 * `다음단계`로 넘어갈 수 있게 둔 AS-IS 판단을 따르되, 건수와 해당 기업을 보여 준다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import { fmtDate, parseDate, presetRange, PRESETS, type Range } from '../../ws/period'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { BASIC_INFO, CO_FG, bizLabel, coFgLabel, stateOf } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { makeBasic, type BasicRow } from '@fixtures/sp'
import { basicStore } from '../../sp/stores'

const router = useRouter()
const blank = () => ({ range: presetRange(PRESETS[4]) as Range, growth: '', coFg: '', sts: '', kwType: '기업명', kw: '' })
const f = ref(blank())
const applied = ref(blank())

const all = computed(() => basicStore(ctxKey(), () => makeBasic(ctxKey(), ctx.year)))
const hit = (r: BasicRow) => {
  const a = applied.value
  const k = a.kw.trim()
  const field = a.kwType === '기업명' ? r.name : a.kwType === '사업자번호' ? r.bizNo : r.receiptNo
  const d = parseDate(r.appliedAt)
  return (!a.sts || r.sts === a.sts) && (!a.coFg || r.coFg === a.coFg) && (!a.growth || (a.growth === 'Y') === r.growth) &&
    (!k || field.includes(k)) && (!a.range[0] || !d || d >= a.range[0]) && (!a.range[1] || !d || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit), {
  failIf: () => applied.value.kw.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(ctxKey, () => { grid.value?.clearSelection(); requery() })
function search() { applied.value = { ...f.value }; grid.value?.clearSelection(); requery() }
function reset() { f.value = blank(); search() }

const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const selected = ref(0)
const n = (c: any) => Number(c.getValue()).toLocaleString('ko-KR')
const columns = [
  { title: '번호', field: 'no', width: 68, hozAlign: 'right', headerHozAlign: 'center' },
  {
    title: '기업명', field: 'name', minWidth: 170, sorter: 'string',
    formatter: (c: any) => `<a class="ws-celllink">${c.getValue()}</a>`,
    cellClick: (_: any, c: any) => router.push(`/sp/basic-info/${c.getRow().getData().id}`),
  },
  { title: '기업구분', field: 'coFg', width: 110, formatter: (c: any) => coFgLabel(c.getValue()) },
  { title: '사업자번호', field: 'bizNo', width: 120, hozAlign: 'center', headerHozAlign: 'center', sorter: 'string' },
  { title: '차수', field: 'round', width: 60, hozAlign: 'center', headerHozAlign: 'center' },
  {
    title: '참여근로자수', headerHozAlign: 'center',
    columns: [
      { title: '최초', field: 'first', width: 68, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n },
      { title: '추가', field: 'added', width: 68, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n },
      { title: '최종', field: 'final', width: 68, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n },
    ],
  },
  {
    title: '참여신청일', headerHozAlign: 'center',
    columns: [
      { title: '최초', field: 'appliedAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
      { title: '최종', field: 'appliedLast', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    ],
  },
  { title: '입금기한', field: 'due', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '상태', field: 'sts', width: 140, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
  {
    title: '참여불가', field: 'banned', width: 80, hozAlign: 'center', headerHozAlign: 'center',
    formatter: (c: any) => (c.getValue() ? `<span class="ws-badge ws-badge--danger">${c.getValue()}명</span>` : ''),
  },
  { title: '메모', field: 'memo', minWidth: 140, editor: 'input', editorParams: { elementAttributes: { maxlength: '100' } } },
]

/* --- 처리 --------------------------------------------------------------- */
const picked = () => (grid.value?.selectedData() ?? []) as BasicRow[]
const apprOpen = ref(false)
const dueOpen = ref(false)
const breakOpen = ref(false)
const warnOpen = ref(false)
const bannedRows = ref<BasicRow[]>([])
const result = ref<{ open: boolean; header: string; ok: number; fails: ResultItem[]; auditId?: string }>({ open: false, header: '', ok: 0, fails: [] })

/** 등록승인 — 참여불가회원이 섞여 있으면 먼저 경고한다. 경고는 차단이 아니다 */
function startApprove() {
  bannedRows.value = picked().filter((r) => r.banned)
  if (bannedRows.value.length) warnOpen.value = true
  else apprOpen.value = true
}
function finish(header: string, to: string | null, p: ActionPayload, allow: string[]) {
  const rows = picked()
  const bad = rows.filter((r) => !allow.includes(r.sts))
  const good = rows.filter((r) => !bad.includes(r))
  good.forEach((r) => { if (to) r.sts = to; if (p.date) r.due = fmtDate(p.date) })
  result.value = {
    open: true, header, ok: good.length, auditId: `AUD-${Date.now().toString(36).toUpperCase()}`,
    fails: [
      ...bad.map((r) => ({ target: r.name, reason: `지금 상태(${stateOf(r.sts)?.label})에서는 할 수 없다`, kind: 'process' as const })),
      ...good.filter((_, i) => i % 6 === 4).map((r) => ({ target: r.name, reason: '휴대전화번호 정보가 없어 LMS 전송 실패', kind: 'notice' as const })),
    ],
  }
  grid.value?.clearSelection()
  reload()
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="b-from">참여신청일</label></th>
        <td colspan="3"><WsPeriod id="b-from" v-model="f.range" /></td>
      </tr>
      <tr>
        <th scope="row">상태</th>
        <td colspan="3">
          <div class="ws-choices" role="radiogroup" aria-label="상태">
            <div class="ws-radio"><RadioButton v-model="f.sts" input-id="b-s-all" name="b-sts" value="" /><label for="b-s-all">전체</label></div>
            <div v-for="c in BASIC_INFO" :key="c" class="ws-radio"><RadioButton v-model="f.sts" :input-id="`b-s-${c}`" name="b-sts" :value="c" /><label :for="`b-s-${c}`">{{ stateOf(c)?.label }}</label></div>
          </div>
        </td>
      </tr>
      <tr>
        <th scope="row"><label for="b-kw">검색어</label></th>
        <td>
          <div style="display: flex; gap: 6px">
            <Select v-model="f.kwType" :options="['기업명', '사업자번호', '접수번호']" aria-label="검색어 구분" style="width: 120px; flex: none" />
            <InputText id="b-kw" v-model="f.kw" fluid :placeholder="`${f.kwType} 입력`" />
          </div>
        </td>
        <th scope="row"><label for="b-co">기업구분</label></th>
        <td><Select v-model="f.coFg" input-id="b-co" :options="[{ code: '', label: '전체' }, ...CO_FG]" option-label="label" option-value="code" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">기업 목록</h2>
          <span class="ws-total">총<strong>{{ total.toLocaleString('ko-KR') }}</strong>건</span>
          <span class="ws-desc">선택 {{ selected }}건 · {{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span>
        </div>
        <div class="ws-tit__r">
          <WsDownload :total="total" :limit="20000" />
          <span class="ws-sep" aria-hidden="true" />
          <Button label="확인서 파기" severity="danger" outlined :disabled="!selected" @click="breakOpen = true" />
          <Button label="입금기한 변경" severity="secondary" outlined :disabled="!selected" @click="dueOpen = true" />
          <Button label="등록승인" severity="contrast" :disabled="!selected" @click="startApprove" />
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid ref="grid" :columns="columns" :rows="rows" height="auto" editable @selection-change="selected = $event" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li><b>참여근로자수 · 참여신청일</b>은 AS-IS에서 한 칸에 줄바꿈으로 묶여 있던 값이다. 2단 머리글로 나눠 칸마다 정렬된다.</li>
        <li>기업명을 누르면 상세가 <b>새 탭</b>으로 열린다. 상세는 주소가 있어 새로고침·공유가 된다 — AS-IS는 폼 전송으로만 열렸다.</li>
        <li>메모 칸은 바로 고칠 수 있다(100자).</li>
      </ul>
    </div>

    <!-- 참여불가회원 경고 — AS-IS 문구와 버튼 셋(페이지 이동 · 다음단계 · 닫기)을 따른다 -->
    <Dialog v-model:visible="warnOpen" modal header="참여불가회원 알림" :style="{ width: '480px' }" :draggable="false">
      <p class="ws-callout ws-callout--warn"><b>확인 필요</b> 선택한 기업의 참여 근로자 중 <b>{{ bannedRows.reduce((s, r) => s + r.banned, 0) }}명</b>이 참여불가회원으로 등록돼 있습니다.</p>
      <ul class="bn">
        <li v-for="r in bannedRows" :key="r.id"><span>{{ r.name }}</span><span class="ws-badge ws-badge--danger">{{ r.banned }}명</span></li>
      </ul>
      <p class="ws-desc">경고만 한다 — 확인하고 그대로 승인할 수 있다.</p>
      <template #footer>
        <Button label="닫기" severity="secondary" outlined @click="warnOpen = false" />
        <Button label="참여불가 회원 보기" severity="secondary" outlined @click="warnOpen = false; router.push('/sp/p/banmem')" />
        <Button label="확인하고 계속" @click="warnOpen = false; apprOpen = true" />
      </template>
    </Dialog>

    <WsActionDialog
      v-model:visible="apprOpen" header="등록승인" :target="`선택한 ${selected}개 기업`"
      :date="{ label: '입금기한' }" notice="선택한 입금기한으로 기업담당자에게 입금 요청 LMS 및 E-Mail이 발송됩니다."
      confirm-label="승인" @confirm="(p) => finish('등록승인 결과', '510', p, ['410'])"
    />
    <WsActionDialog
      v-model:visible="dueOpen" header="입금기한 변경" :target="`선택한 ${selected}개 기업`"
      :date="{ label: '새 입금기한' }" notice="바뀐 입금기한으로 입금 요청 LMS 및 E-Mail이 다시 발송됩니다."
      confirm-label="변경" @confirm="(p) => finish('입금기한 변경 결과', null, p, ['510'])"
    />
    <WsActionDialog
      v-model:visible="breakOpen" header="확인서 파기" :target="`선택한 ${selected}개 기업`" danger
      warn="파기 전에 입금 여부를 다시 확인하세요. 입금했는데 입금완료로 바뀌지 않은 상태에서 파기하면 환불을 시스템에서 진행할 수 없어 수기로 처리해야 합니다."
      :reason="{ label: '파기 사유', required: true, max: 200 }"
      notice="기업담당자에게 확인서 파기 LMS 및 E-Mail이 발송됩니다. 확인서 파기 철회로 되돌릴 수 있습니다."
      confirm-label="파기" @confirm="(p) => finish('확인서 파기 결과', '390', p, ['410', '510'])"
    />
    <WsResultDialog v-model:visible="result.open" :header="result.header" :ok="result.ok" :fails="result.fails" :audit-id="result.auditId" />
  </div>
</template>

<style scoped>
.bn { display: grid; gap: 4px; margin: 12px 0; }
.bn li { display: flex; justify-content: space-between; padding: 6px 10px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius-sm); }
</style>
