<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-BIZ-010D 사업관리 상세 — 등록 · 수정. 탭: 기본정보 · 발전모델 설정(지원구분 발전일 때만) · 추가신청 설정 · 변경이력.
 * 저장은 M1(변경 확인 · 사유)을 거치고 변경이력에 남긴다. 신규 등록은 M1을 건너뛴다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import { CO_FG } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BIZ_LIST, bizOf, applicationCountOf, modelOf, GROWTH_MODELS, type SbBiz, type HistoryEntry } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-010D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.query.mode === 'new')
const source = computed<SbBiz | undefined>(() => (isNew.value ? undefined : bizOf(String(route.query.id ?? ''))))
const blank = (): SbBiz => ({
  code: '', year: 2026, round: (BIZ_LIST.filter((b) => b.year === 2026).length || 0) + 1, type: '일반', name: '',
  recruit: [null as any, null as any], review: [null as any, null as any], announceAt: null as any,
  participate: [null as any, null as any], deposit: [null as any, null as any], pointUse: [null as any, null as any],
  status: '준비', growthModelId: null, participantType: '일반', extraAllow: true,
  caps: Object.fromEntries(CO_FG.map((c) => [c.code, { cap: 0, overAllow: false, minRate: 0 }])),
  cost: { worker: 0, company: 0, org: 0 }, noticeText: '', bulkNotifyUse: false,
  registeredBy: '', registeredAt: '', history: [],
})
const form = ref<SbBiz>(source.value ? structuredClone(source.value) : blank())
watch(source, (s) => { if (s) form.value = structuredClone(s) }, { immediate: false })

const editable = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update') && can(CODE, 'config')))
const editTip = computed(() => (isNew.value ? denyTip(CODE, 'create') : (denyTip(CODE, 'update') || denyTip(CODE, 'config'))))

const tab = ref('basic')
const impact = computed(() => (!isNew.value && (form.value.cost.worker !== source.value?.cost.worker || form.value.cost.company !== source.value?.cost.company || form.value.cost.org !== source.value?.cost.org || form.value.type !== source.value?.type) ? applicationCountOf(form.value.code) : 0))

/* --- 저장 · 변경 확인(M1) --------------------------------------------------- */
const confirmOpen = ref(false)
const FIELD_LABEL: Record<string, string> = { name: '사업명', type: '지원구분', status: '진행상태', noticeText: '모집 마감 안내 문구', extraAllow: '추가참여 허용' }
const diffs = computed(() => {
  if (!source.value) return []
  const s = source.value
  const out: { field: string; before: string; after: string }[] = []
  ;(['name', 'type', 'status', 'noticeText', 'extraAllow'] as const).forEach((k) => {
    const before = String(s[k]), after = String(form.value[k])
    if (before !== after) out.push({ field: FIELD_LABEL[k] ?? k, before, after })
  })
  if (JSON.stringify(s.cost) !== JSON.stringify(form.value.cost)) out.push({ field: '분담금', before: `${s.cost.worker.toLocaleString()}/${s.cost.company.toLocaleString()}/${s.cost.org.toLocaleString()}`, after: `${form.value.cost.worker.toLocaleString()}/${form.value.cost.company.toLocaleString()}/${form.value.cost.org.toLocaleString()}` })
  return out
})

function requestSave() {
  if (!editable.value) return
  if (!form.value.name.trim()) return notify('사업명을 입력하세요.', 'danger')
  if (!form.value.recruit[0] || !form.value.recruit[1]) return notify('모집기간을 입력하세요 — 시작일과 종료일 모두 필요합니다.', 'danger')
  if (isNew.value) { commit(); return }
  if (diffs.value.length === 0) return notify('바뀐 항목이 없습니다.', 'info')
  confirmOpen.value = true
}
function commit(p?: ActionPayload) {
  if (isNew.value) {
    const code = `BIZ-27-${String(BIZ_LIST.length + 1).padStart(2, '0')}`
    form.value.code = code
    form.value.registeredBy = '나(미리보기)'
    form.value.registeredAt = new Date().toLocaleString('ko-KR')
    form.value.history = [{ id: `H-${code}-0`, at: form.value.registeredAt, by: form.value.registeredBy, reason: '등록', changes: [] }]
    BIZ_LIST.push(structuredClone(form.value))
    notify(`'${form.value.name}' 사업을 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: code } })
    return
  }
  const s = source.value!
  const entry: HistoryEntry = { id: `H-${s.code}-${s.history.length}`, at: new Date().toLocaleString('ko-KR'), by: '나(미리보기)', reason: p?.text ?? '', changes: diffs.value }
  Object.assign(s, structuredClone(form.value), { history: [...s.history, entry] })
  notify(`저장했습니다${impact.value ? ` — 참여 건 ${impact.value}건에 영향` : ''}.`, 'success')
  confirmOpen.value = false
}

/* --- 변경이력 상세(M2) ------------------------------------------------------ */
const histOpen = ref(false)
const histCurrent = ref<HistoryEntry | null>(null)
function openHist(h: HistoryEntry) { histCurrent.value = h; histOpen.value = true }

const growthModelsOfYear = computed(() => GROWTH_MODELS.filter((m) => m.year === form.value.year))
const won = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '사업 등록' : undefined" />

    <div v-if="!isNew && form.code" class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l"><h2 class="ws-tit__h">{{ form.name }}</h2><span class="ws-desc">{{ form.code }} · {{ form.year }}년 {{ form.round }}차</span></div>
      <div class="ws-tit__r">
        <SbCan action="update"><SbCan action="config"><Button label="저장" severity="contrast" @click="requestSave" /></SbCan></SbCan>
      </div>
    </div>
    <div v-else class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l"><h2 class="ws-tit__h">새 사업 등록</h2></div>
      <div class="ws-tit__r"><SbCan action="create"><Button label="등록" severity="contrast" @click="requestSave" /></SbCan></div>
    </div>
    <p v-if="!can(CODE, isNew ? 'create' : 'update')" class="ws-desc">{{ editTip }}</p>

    <Tabs v-model:value="tab">
      <TabList>
        <Tab value="basic">기본정보</Tab>
        <Tab v-if="form.type === '발전'" value="growth">발전모델 설정</Tab>
        <Tab value="extra">추가신청 설정</Tab>
        <Tab value="hist">변경이력</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="basic">
          <fieldset :disabled="!editable" style="border: 0; margin: 0; padding: 0">
            <table class="ws-tb">
              <colgroup><col style="width: 160px" /><col /></colgroup>
              <tbody>
                <tr>
                  <th scope="row" class="req"><label for="d-name">사업명</label></th>
                  <td><InputText id="d-name" v-model="form.name" fluid maxlength="50" /></td>
                </tr>
                <tr>
                  <th scope="row">사업진행년도 · 차수 · 지원구분</th>
                  <td>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap">
                      <Select v-model="form.year" :options="[2026, 2027]" style="width: 110px" aria-label="사업진행년도" :disabled="!isNew" />
                      <InputNumber v-model="form.round" :min="1" :max="9" style="width: 90px" aria-label="차수" :disabled="!isNew" />
                      <div class="ws-choices" role="radiogroup" aria-label="지원구분">
                        <div v-for="v in ['일반', '발전']" :key="v" class="ws-radio"><RadioButton v-model="form.type" :input-id="`d-ty-${v}`" name="d-ty" :value="v" /><label :for="`d-ty-${v}`">{{ v }}</label></div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th scope="row" class="req">모집기간</th>
                  <td>
                    <DatePicker v-model="form.recruit[0]" show-time hour-format="24" date-format="yy.mm.dd" placeholder="시작" />
                    <span aria-hidden="true">~</span>
                    <DatePicker v-model="form.recruit[1]" show-time hour-format="24" date-format="yy.mm.dd" placeholder="종료" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">자격심사기간</th>
                  <td>
                    <DatePicker v-model="form.review[0]" show-time hour-format="24" date-format="yy.mm.dd" placeholder="시작" />
                    <span aria-hidden="true">~</span>
                    <DatePicker v-model="form.review[1]" show-time hour-format="24" date-format="yy.mm.dd" placeholder="종료" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">심사발표일 · 진행상태</th>
                  <td>
                    <DatePicker v-model="form.announceAt" show-time hour-format="24" date-format="yy.mm.dd" style="margin-right: 16px" />
                    <Select v-model="form.status" :options="['준비', '모집중', '심사중', '발표', '운영', '종료']" style="width: 120px" aria-label="진행상태" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">참여기간 · 입금기간 · 포인트 사용기간</th>
                  <td>
                    <div class="ws-desc" style="margin-bottom: 4px">참여 {{ form.participate[0]?.toLocaleDateString?.() ?? '-' }} ~ {{ form.participate[1]?.toLocaleDateString?.() ?? '-' }}</div>
                    <div class="ws-desc" style="margin-bottom: 4px">입금 {{ form.deposit[0]?.toLocaleDateString?.() ?? '-' }} ~ {{ form.deposit[1]?.toLocaleDateString?.() ?? '-' }}</div>
                    <div class="ws-desc">포인트 사용 {{ form.pointUse[0]?.toLocaleDateString?.() ?? '-' }} ~ {{ form.pointUse[1]?.toLocaleDateString?.() ?? '-' }}</div>
                  </td>
                </tr>
                <tr>
                  <th scope="row">기업구분별 참여인원 · 초과 허용</th>
                  <td>
                    <table class="ws-gtb">
                      <thead><tr><th scope="col">기업구분</th><th scope="col">참여인원 상한</th><th scope="col">상한 초과 허용</th><th scope="col">최소 참여율(%)</th></tr></thead>
                      <tbody>
                        <tr v-for="c in CO_FG" :key="c.code">
                          <th scope="row">{{ c.label }}</th>
                          <td><InputNumber v-model="form.caps[c.code].cap" :min="0" :max="999999" style="width: 100px" :aria-label="`${c.label} 참여인원 상한`" /></td>
                          <td style="text-align: center"><Checkbox v-model="form.caps[c.code].overAllow" binary :aria-label="`${c.label} 상한 초과 허용`" /></td>
                          <td><InputNumber v-model="form.caps[c.code].minRate" :min="0" :max="100" suffix="%" style="width: 90px" :aria-label="`${c.label} 최소 참여율`" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <th scope="row">분담금(1인 기준)</th>
                  <td>
                    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
                      <label>노동자 <InputNumber v-model="form.cost.worker" :min="0" suffix="원" style="width: 130px" /></label>
                      <label>기업 <InputNumber v-model="form.cost.company" :min="0" suffix="원" style="width: 130px" /></label>
                      <label>지원기관 <InputNumber v-model="form.cost.org" :min="0" suffix="원" style="width: 130px" /></label>
                      <b>합계 {{ won(form.cost.worker + form.cost.company + form.cost.org) }}원</b>
                    </div>
                    <p class="ws-desc" style="margin-top: 6px">기본 모델 비율 참고 — 개인 : 기업 : 정부 = 2 : 1 : 1</p>
                  </td>
                </tr>
                <tr>
                  <th scope="row">참여유형 · 추가참여 허용</th>
                  <td>
                    <div style="display: flex; gap: 16px; align-items: center">
                      <Select v-model="form.participantType" :options="['일반', '동반성장']" style="width: 140px" aria-label="참여유형" />
                      <label class="ws-radio"><Checkbox v-model="form.extraAllow" binary /> 추가참여 허용</label>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th scope="row"><label for="d-notice">모집 마감 안내 문구</label></th>
                  <td><Textarea id="d-notice" v-model="form.noticeText" rows="2" fluid maxlength="250" /><span class="ws-desc">{{ form.noticeText.length }} / 250자</span></td>
                </tr>
                <tr>
                  <th scope="row">일괄 통보 버튼 사용</th>
                  <td><label class="ws-radio"><Checkbox v-model="form.bulkNotifyUse" binary /> 심사 결과 일괄 통보 버튼을 쓴다</label></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </TabPanel>

        <TabPanel v-if="form.type === '발전'" value="growth">
          <p class="ws-desc" style="margin-bottom: 8px">같은 참여년도({{ form.year }}년)의 발전모델만 고를 수 있다. 발전모델 자체의 편집은 발전모델관리 상세(SP-BIZ-020D)에서 한다.</p>
          <fieldset :disabled="!editable" style="border: 0; margin: 0; padding: 0">
            <table class="ws-tb">
              <colgroup><col style="width: 160px" /><col /></colgroup>
              <tbody>
                <tr>
                  <th scope="row">연결 발전모델</th>
                  <td>
                    <Select v-model="form.growthModelId" :options="[{ l: '연결 안 함', v: null }, ...growthModelsOfYear.map((m) => ({ l: m.name, v: m.id }))]" option-label="l" option-value="v" style="width: 320px" />
                  </td>
                </tr>
                <tr v-if="form.growthModelId">
                  <th scope="row">분담 비율(참고)</th>
                  <td v-if="modelOf(form.growthModelId)">
                    지원기관 {{ won(modelOf(form.growthModelId)!.share.org) }} · 기업 {{ won(modelOf(form.growthModelId)!.share.company) }} · 노동자 {{ won(modelOf(form.growthModelId)!.share.worker) }}원
                    <p class="ws-desc" style="margin-top: 4px">발전모델의 분담 비율이 기본정보 분담금보다 앞선다(추정).</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </TabPanel>

        <TabPanel value="extra">
          <p class="ws-desc" style="margin-bottom: 8px">이 사업의 기업구분별 추가신청 창구 요약이다 — 읽기 전용. 변경은 인원관리(SP-BIZ-030P)에서 한다.</p>
          <table class="ws-gtb">
            <thead><tr><th scope="col">추가참여 허용</th><th scope="col">창구 변경</th></tr></thead>
            <tbody>
              <tr>
                <td>{{ form.extraAllow ? '예' : '아니오' }}</td>
                <td><Button label="인원관리로 이동" severity="secondary" outlined size="small" :disabled="!form.code" @click="router.push({ path: routeOf('SP-BIZ-030P'), query: { biz: form.code } })" /></td>
              </tr>
            </tbody>
          </table>
        </TabPanel>

        <TabPanel value="hist">
          <table class="ws-gtb">
            <thead><tr><th scope="col">변경일시</th><th scope="col">변경자</th><th scope="col">사유</th><th scope="col">항목 수</th></tr></thead>
            <tbody>
              <tr v-if="form.history.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">이력이 없습니다.</td></tr>
              <tr v-for="h in [...form.history].reverse()" :key="h.id" style="cursor: pointer" @click="openHist(h)">
                <td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.reason || '—' }}</td><td>{{ h.changes.length }}</td>
              </tr>
            </tbody>
          </table>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- M1 변경 확인 -->
    <WsActionDialog
      v-model:visible="confirmOpen" code="SP-BIZ-010D-M1" header="사업 변경 확인"
      :target="`${form.name} — 변경 항목 ${diffs.length}건`" :warn="impact ? `참여 건 ${impact}건에 영향을 줍니다.` : undefined"
      :reason="{ label: '수정 사유', required: true, min: 5, max: 200 }" confirm-label="확정" @confirm="commit"
    >
      <table class="ws-gtb">
        <thead><tr><th scope="col">항목</th><th scope="col">전</th><th scope="col">후</th></tr></thead>
        <tbody><tr v-for="d in diffs" :key="d.field"><td>{{ d.field }}</td><td>{{ d.before }}</td><td>{{ d.after }}</td></tr></tbody>
      </table>
    </WsActionDialog>

    <!-- M2 변경이력 상세 -->
    <Dialog v-model:visible="histOpen" modal header="변경이력 상세" :style="{ width: '520px' }" :draggable="false">
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
      <template #footer>
        <SbCode code="SP-BIZ-010D-M2" />
        <Button label="닫기" severity="secondary" outlined @click="histOpen = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
</style>
