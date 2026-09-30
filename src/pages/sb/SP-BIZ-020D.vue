<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-BIZ-020D 발전모델관리 상세 — 적용 조건(참여년수 · 기업구분 · 기업 지정)과 분담액 3칸을 등록·수정한다.
 * 적용기업 목록 · 연결 사업 · 변경이력을 함께 보인다. M1 기업 지정, M2 변경 확인.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import RadioButton from 'primevue/radiobutton'
import Checkbox from 'primevue/checkbox'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsPager from '../../ws/WsPager.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import { CO_FG, coFgLabel, bizLabel } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { GROWTH_MODELS, modelOf, appliedCompaniesOf, applicationCountOf, bizOf, YEAR_OPTS, type SbGrowthModel, type HistoryEntry } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-020D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.query.mode === 'new')
const source = computed<SbGrowthModel | undefined>(() => (isNew.value ? undefined : modelOf(String(route.query.id ?? ''))))
const blank = (): SbGrowthModel => ({
  id: '', year: Number(route.query.year ?? 2026), name: '', years: '5년 이상', coFgs: [],
  applyMode: '조건', designated: [], totalAmount: 0, share: { org: 0, company: 0, worker: 0 },
  linkedBizCode: null, updatedAt: '', updatedBy: '', history: [],
})
const form = ref<SbGrowthModel>(source.value ? structuredClone(source.value) : blank())
watch(source, (s) => { if (s) form.value = structuredClone(s) })

const editable = computed(() => can(CODE, isNew.value ? 'create' : 'update') && can(CODE, 'config'))
const editTip = computed(() => denyTip(CODE, isNew.value ? 'create' : 'update') || denyTip(CODE, 'config'))

const shareSum = computed(() => form.value.share.org + form.value.share.company + form.value.share.worker)
const shareDiff = computed(() => form.value.totalAmount - shareSum.value)

/* --- 적용 기업 지정(M1) ----------------------------------------------------- */
const pickOpen = ref(false)
const pickKw = ref('')
const pickChecked = ref<string[]>([])
const pickResults = computed(() => {
  const k = pickKw.value.trim()
  if (!k) return []
  return COMPANIES.filter((c) => !form.value.designated.includes(c.id) && (c.name.includes(k) || c.bizNo.replace(/-/g, '').includes(k.replace(/-/g, '')))).slice(0, 20)
})
function confirmPick() {
  form.value.designated = [...form.value.designated, ...pickChecked.value]
  notify(`${pickChecked.value.length}곳을 지정 목록에 추가했습니다 — 저장해야 반영됩니다.`, 'success')
  pickChecked.value = []
  pickKw.value = ''
  pickOpen.value = false
}

/* --- 저장 · 변경 확인(M2) --------------------------------------------------- */
const confirmOpen = ref(false)
const impact = computed(() => (!isNew.value && form.value.linkedBizCode && (JSON.stringify(form.value.share) !== JSON.stringify(source.value?.share) || form.value.coFgs.join() !== source.value?.coFgs.join()) ? applicationCountOf(form.value.linkedBizCode) : 0))
const diffs = computed(() => {
  if (!source.value) return []
  const s = source.value
  const out: { field: string; before: string; after: string }[] = []
  if (s.name !== form.value.name) out.push({ field: '발전모델명', before: s.name, after: form.value.name })
  if (s.years !== form.value.years) out.push({ field: '참여년수', before: s.years, after: form.value.years })
  if (s.coFgs.join() !== form.value.coFgs.join()) out.push({ field: '기업구분', before: s.coFgs.map(coFgLabel).join(','), after: form.value.coFgs.map(coFgLabel).join(',') })
  if (JSON.stringify(s.share) !== JSON.stringify(form.value.share)) out.push({ field: '분담액', before: `${s.share.org}/${s.share.company}/${s.share.worker}`, after: `${form.value.share.org}/${form.value.share.company}/${form.value.share.worker}` })
  if (s.designated.join() !== form.value.designated.join()) out.push({ field: '지정 기업 수', before: String(s.designated.length), after: String(form.value.designated.length) })
  return out
})

function requestSave() {
  if (!editable.value) return
  if (!form.value.name.trim()) return notify('발전모델명을 입력하세요.', 'danger')
  if (form.value.coFgs.length === 0) return notify('기업구분을 하나 이상 선택하세요.', 'danger')
  if (shareDiff.value !== 0) return notify(`분담액 합이 총 지원금액보다 ${Math.abs(shareDiff.value).toLocaleString()}원 ${shareDiff.value > 0 ? '적습니다' : '많습니다'}.`, 'danger')
  if (isNew.value) { commit(); return }
  if (diffs.value.length === 0) return notify('바뀐 항목이 없습니다.', 'info')
  confirmOpen.value = true
}
function commit(p?: ActionPayload) {
  if (isNew.value) {
    const id = `GM-${form.value.year}-${String(GROWTH_MODELS.filter((m) => m.year === form.value.year).length + 1).padStart(2, '0')}`
    form.value.id = id
    form.value.updatedBy = '나(미리보기)'
    form.value.updatedAt = new Date().toLocaleString('ko-KR')
    form.value.history = [{ id: `H-${id}-0`, at: form.value.updatedAt, by: form.value.updatedBy, reason: '등록', changes: [] }]
    GROWTH_MODELS.push(structuredClone(form.value))
    notify(`'${form.value.name}' 발전모델을 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id } })
    return
  }
  const s = source.value!
  const entry: HistoryEntry = { id: `H-${s.id}-${s.history.length}`, at: new Date().toLocaleString('ko-KR'), by: '나(미리보기)', reason: p?.text ?? '', changes: diffs.value }
  Object.assign(s, structuredClone(form.value), { history: [...s.history, entry] })
  notify(`저장했습니다${impact.value ? ` — 참여 건 ${impact.value}건에 영향` : ''}.`, 'success')
  confirmOpen.value = false
}

const histOpen = ref(false)
const histCurrent = ref<HistoryEntry | null>(null)
function openHist(h: HistoryEntry) { histCurrent.value = h; histOpen.value = true }

const applied = computed(() => (form.value.id ? appliedCompaniesOf(form.value) : []))
const first = ref(0)
const size = ref(20)
const appliedPage = computed(() => applied.value.slice(first.value, first.value + size.value))
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '발전모델 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l"><h2 class="ws-tit__h">{{ isNew ? '새 발전모델 등록' : form.name }}</h2><span v-if="!isNew" class="ws-desc">{{ form.id }} · {{ form.year }}년</span></div>
      <div class="ws-tit__r">
        <SbCan :action="isNew ? 'create' : 'update'"><SbCan action="config"><Button label="저장" severity="contrast" @click="requestSave" /></SbCan></SbCan>
      </div>
    </div>
    <p v-if="!editable" class="ws-desc">{{ editTip }}</p>

    <fieldset :disabled="!editable" style="border: 0; margin: 0; padding: 0">
      <table class="ws-tb">
        <colgroup><col style="width: 160px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req"><label for="m-name">발전모델명</label></th>
            <td><InputText id="m-name" v-model="form.name" fluid maxlength="50" /></td>
          </tr>
          <tr>
            <th scope="row">참여년도 · 참여년수</th>
            <td>
              <Select v-model="form.year" :options="[2026, 2027]" style="width: 110px; margin-right: 16px" :disabled="!isNew" aria-label="참여년도" />
              <Select v-model="form.years" :options="YEAR_OPTS" style="width: 140px" aria-label="참여년수" />
            </td>
          </tr>
          <tr>
            <th scope="row" class="req">기업구분</th>
            <td><MultiSelect v-model="form.coFgs" :options="CO_FG" option-label="label" option-value="code" placeholder="하나 이상 선택" fluid /></td>
          </tr>
          <tr>
            <th scope="row">1인 총 지원금액 · 분담액</th>
            <td>
              <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
                <label>총 지원금액 <InputNumber v-model="form.totalAmount" :min="0" suffix="원" style="width: 140px" /></label>
                <label>지원기관 <InputNumber v-model="form.share.org" :min="0" suffix="원" style="width: 130px" /></label>
                <label>기업 <InputNumber v-model="form.share.company" :min="0" suffix="원" style="width: 130px" /></label>
                <label>노동자 <InputNumber v-model="form.share.worker" :min="0" suffix="원" style="width: 130px" /></label>
              </div>
              <p class="ws-desc" :class="{ 'ws-err': shareDiff !== 0 }" style="margin-top: 6px">
                분담액 합 {{ shareSum.toLocaleString() }}원 <template v-if="shareDiff !== 0">— 총 지원금액과 {{ Math.abs(shareDiff).toLocaleString() }}원 {{ shareDiff > 0 ? '부족' : '초과' }}</template>
              </p>
            </td>
          </tr>
          <tr>
            <th scope="row">적용 방식</th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-label="적용 방식">
                <div class="ws-radio"><RadioButton v-model="form.applyMode" input-id="m-am-c" name="m-am" value="조건" /><label for="m-am-c">조건 일치 전체</label></div>
                <div class="ws-radio"><RadioButton v-model="form.applyMode" input-id="m-am-d" name="m-am" value="지정" /><label for="m-am-d">기업 지정</label></div>
              </div>
              <div v-if="form.applyMode === '지정'" style="margin-top: 8px">
                <SbCan action="config"><Button label="기업 지정" severity="secondary" outlined size="small" @click="pickOpen = true" /></SbCan>
                <span class="ws-desc" style="margin-left: 8px">지정 {{ form.designated.length }}곳</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </fieldset>

    <section class="ws-sec" style="margin-top: 16px">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">적용기업</h2><span class="ws-total">총<strong>{{ applied.length }}</strong>곳</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">기업구분</th><th scope="col">누적 참여년수</th><th scope="col">적용 근거</th></tr></thead>
        <tbody>
          <tr v-if="appliedPage.length === 0"><td colspan="5" class="ws-desc" style="text-align: center">적용기업이 없습니다.</td></tr>
          <tr v-for="a in appliedPage" :key="a.company.id">
            <td>{{ a.company.name }}</td><td>{{ a.company.bizNo }}</td><td>{{ coFgLabel(a.company.coFg) }}</td><td>{{ a.years }}년</td>
            <td><span :class="a.basis === '지정' ? 'ws-badge ws-badge--info' : 'ws-badge ws-badge--neutral'">{{ a.basis }}</span></td>
          </tr>
        </tbody>
      </table>
      <WsPager v-model:first="first" v-model:rows="size" :total="applied.length" :sizes="[20, 50]" />
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">연결 사업</h2></div></div>
      <p v-if="!form.linkedBizCode" class="ws-desc">연결된 사업이 없습니다.</p>
      <p v-else>
        <a href="javascript:void(0)" @click="router.push({ path: routeOf('SP-BIZ-010D'), query: { id: form.linkedBizCode } })">{{ bizLabel(form.linkedBizCode) }}</a>
        <span class="ws-desc" style="margin-left: 8px">참여 건 {{ applicationCountOf(form.linkedBizCode) }}건</span>
      </p>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">변경이력</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">변경일시</th><th scope="col">변경자</th><th scope="col">사유</th><th scope="col">항목 수</th></tr></thead>
        <tbody>
          <tr v-if="form.history.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">이력이 없습니다.</td></tr>
          <tr v-for="h in [...form.history].reverse()" :key="h.id" style="cursor: pointer" @click="openHist(h)">
            <td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.reason || '—' }}</td><td>{{ h.changes.length }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- M1 적용 기업 지정 -->
    <Dialog v-model:visible="pickOpen" modal header="적용 기업 지정" :style="{ width: '560px' }" :draggable="false">
      <InputText v-model="pickKw" fluid placeholder="사업자등록번호 또는 기업명" style="margin-bottom: 12px" />
      <table class="ws-gtb">
        <thead><tr><th scope="col" /><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">기업구분</th></tr></thead>
        <tbody>
          <tr v-if="pickKw && pickResults.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">검색 결과가 없습니다.</td></tr>
          <tr v-for="c in pickResults" :key="c.id">
            <td><Checkbox v-model="pickChecked" :value="c.id" :input-id="`pk-${c.id}`" /></td>
            <td><label :for="`pk-${c.id}`">{{ c.name }}</label></td><td>{{ c.bizNo }}</td><td>{{ coFgLabel(c.coFg) }}</td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <SbCode code="SP-BIZ-020D-M1" />
        <Button label="취소" severity="secondary" outlined @click="pickOpen = false" />
        <Button label="추가" :disabled="pickChecked.length === 0" @click="confirmPick" />
      </template>
    </Dialog>

    <!-- M2 변경 확인 -->
    <WsActionDialog
      v-model:visible="confirmOpen" code="SP-BIZ-020D-M2" header="발전모델 변경 확인"
      :target="`${form.name} — 변경 항목 ${diffs.length}건`" :warn="impact ? `연결 사업 참여 건 ${impact}건에 영향을 줍니다.` : undefined"
      :reason="{ label: '수정 사유', required: true, min: 5, max: 200 }" confirm-label="확정" @confirm="commit"
    >
      <table class="ws-gtb">
        <thead><tr><th scope="col">항목</th><th scope="col">전</th><th scope="col">후</th></tr></thead>
        <tbody><tr v-for="d in diffs" :key="d.field"><td>{{ d.field }}</td><td>{{ d.before }}</td><td>{{ d.after }}</td></tr></tbody>
      </table>
    </WsActionDialog>

    <Dialog v-model:visible="histOpen" modal header="변경이력 상세" :style="{ width: '480px' }" :draggable="false">
      <div v-if="histCurrent">
        <p class="ws-desc" style="margin-bottom: 8px">{{ histCurrent.at }} · {{ histCurrent.by }} · {{ histCurrent.reason || '등록' }}</p>
        <table class="ws-gtb">
          <thead><tr><th scope="col">항목</th><th scope="col">변경 전</th><th scope="col">변경 후</th></tr></thead>
          <tbody>
            <tr v-if="histCurrent.changes.length === 0"><td colspan="3" class="ws-desc" style="text-align: center">신규 등록 — 비교 항목 없음</td></tr>
            <tr v-for="c in histCurrent.changes" :key="c.field"><td>{{ c.field }}</td><td>{{ c.before }}</td><td>{{ c.after }}</td></tr>
          </tbody>
        </table>
      </div>
      <template #footer><Button label="닫기" severity="secondary" outlined @click="histOpen = false" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
</style>
