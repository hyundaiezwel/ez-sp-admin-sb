<!-- SB-DONE -->
<script setup lang="ts">
/** SP-BIZ-030P 인원관리 — 사업 · 기업구분별 「추가신청」 창구를 여닫는다. 위에는 실시간 집계, 아래에 설정 목록. */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import DatePicker from 'primevue/datepicker'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import { notify } from '../../ws/notify'
import { BIZ, CO_FG, coFgLabel, bizLabel, YEARS } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { WINDOWS, aggregateOf, bizOf, type SbWindow } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-030P'
const route = useRoute()
const router = useRouter()

const year = ref(2026)
const bizCode = ref(String(route.query.biz ?? 'BIZ-26-01'))

const agg = computed(() => aggregateOf(bizCode.value))
const aggTotal = computed(() => agg.value.reduce((a, r) => ({ companies: a.companies + r.companies, people: a.people + r.people, amount: a.amount + r.amount }), { companies: 0, people: 0, amount: 0 }))

/* --- 설정 목록 -------------------------------------------------------------- */
const windows = computed(() => WINDOWS.filter((w) => w.bizCode === bizCode.value))
const now = new Date()
const winState = (w: SbWindow) => (w.status === '닫힘' ? '닫힘' : now >= w.apply[0] && now <= w.apply[1] ? '신청 가능' : now > w.apply[1] ? '마감' : '대기')
const STATE_TONE: Record<string, string> = { '신청 가능': 'success', 닫힘: 'mute', 마감: 'warning', 대기: 'info' }

/* --- 창구 설정 폼 ------------------------------------------------------------ */
const editable = computed(() => can(CODE, 'update') && can(CODE, 'config'))
const editTip = computed(() => denyTip(CODE, 'update') || denyTip(CODE, 'config'))
const blank = () => ({ growthOnly: false, coFgs: [] as string[], status: '열림' as '열림' | '닫힘', applyStart: null as Date | null, applyEnd: null as Date | null, depositEnd: null as Date | null })
const form = ref(blank())
const editing = ref<SbWindow | null>(null)

function loadRow(w: SbWindow) {
  editing.value = w
  form.value = { growthOnly: w.growthOnly, coFgs: [w.coFg], status: w.status, applyStart: w.apply[0], applyEnd: w.apply[1], depositEnd: w.depositEnd }
}
function resetForm() { editing.value = null; form.value = blank() }

const confirmOpen = ref(false)
function requestSave() {
  if (!editable.value) return
  const biz = bizOf(bizCode.value)
  if (!biz?.extraAllow) return notify('이 사업은 추가참여를 허용하지 않아 창구를 열 수 없습니다.', 'danger')
  if (form.value.coFgs.length === 0) return notify('기업구분을 선택해 주세요.', 'danger')
  if (!form.value.applyStart || !form.value.applyEnd || !form.value.depositEnd) return notify('신청기간 · 입금기간을 모두 입력하세요.', 'danger')
  if (form.value.depositEnd < form.value.applyEnd) return notify('입금기간 종료를 신청기간 이후로 넣어 주세요.', 'danger')
  confirmOpen.value = true
}
const pending = computed(() => (editing.value && form.value.status === '닫힘' ? editing.value.pendingCount : 0))
function commit(p: ActionPayload) {
  const before = editing.value?.status ?? '(신규)'
  form.value.coFgs.forEach((coFg) => {
    const exist = editing.value && form.value.coFgs.length === 1 ? editing.value : WINDOWS.find((w) => w.bizCode === bizCode.value && w.coFg === coFg)
    const applyTuple: [Date, Date] = [form.value.applyStart!, form.value.applyEnd!]
    if (exist) {
      Object.assign(exist, { growthOnly: form.value.growthOnly, status: form.value.status, apply: applyTuple, depositEnd: form.value.depositEnd!, updatedBy: '나(미리보기)', updatedAt: new Date().toLocaleString('ko-KR'), pendingCount: form.value.status === '닫힘' ? 0 : exist.pendingCount })
    } else {
      WINDOWS.push({ id: `W-${WINDOWS.length + 1}`, bizCode: bizCode.value, growthOnly: form.value.growthOnly, coFg, status: form.value.status, apply: applyTuple, depositEnd: form.value.depositEnd!, updatedBy: '나(미리보기)', updatedAt: new Date().toLocaleString('ko-KR'), pendingCount: 0 })
    }
  })
  notify(`${bizLabel(bizCode.value)} 추가신청 창구를 ${before} → ${form.value.status}(으)로 저장했습니다.`, 'success')
  confirmOpen.value = false
  resetForm()
}

const won = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조건</h2></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row"><label for="p-year">참여년도</label></th>
            <td><Select v-model="year" input-id="p-year" :options="YEARS.filter((y) => y <= 2027)" style="width: 110px" /></td>
          </tr>
          <tr>
            <th scope="row"><label for="p-biz">사업</label></th>
            <td><Select v-model="bizCode" input-id="p-biz" :options="BIZ" option-label="label" option-value="code" style="width: 320px" @change="resetForm" /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">기업구분별 집계</h2><span class="ws-desc">조회 시점 실시간 값 — 통계 화면 배치 값과 다를 수 있습니다</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">기업구분</th><th scope="col">참여기업수</th><th scope="col">참여인원수</th><th scope="col">입금금액</th></tr></thead>
        <tbody>
          <tr v-for="r in agg" :key="r.coFg"><td>{{ r.label }}</td><td class="ws-num">{{ won(r.companies) }}</td><td class="ws-num">{{ won(r.people) }}</td><td class="ws-num">{{ won(r.amount) }}원</td></tr>
        </tbody>
        <tfoot><tr><th scope="row">합계</th><td class="ws-num">{{ won(aggTotal.companies) }}</td><td class="ws-num">{{ won(aggTotal.people) }}</td><td class="ws-num">{{ won(aggTotal.amount) }}원</td></tr></tfoot>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">추가신청 창구 설정</h2></div></div>
      <p v-if="!editable" class="ws-desc">{{ editTip }}</p>
      <fieldset :disabled="!editable" style="border: 0; margin: 0; padding: 0">
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /></colgroup>
          <tbody>
            <tr>
              <th scope="row">발전모델 여부</th>
              <td><label class="ws-radio"><Checkbox v-model="form.growthOnly" binary /> 발전모델 사업만</label></td>
            </tr>
            <tr>
              <th scope="row" class="req">기업구분</th>
              <td><MultiSelect v-model="form.coFgs" :options="CO_FG" option-label="label" option-value="code" placeholder="하나 이상 선택" fluid /></td>
            </tr>
            <tr>
              <th scope="row" class="req">추가신청 상태</th>
              <td>
                <div class="ws-choices" role="radiogroup" aria-label="추가신청 상태">
                  <div class="ws-radio"><RadioButton v-model="form.status" input-id="p-s-o" name="p-s" value="열림" /><label for="p-s-o">열림</label></div>
                  <div class="ws-radio"><RadioButton v-model="form.status" input-id="p-s-c" name="p-s" value="닫힘" /><label for="p-s-c">닫힘</label></div>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" class="req">신청기간</th>
              <td><DatePicker v-model="form.applyStart" show-time hour-format="24" placeholder="시작" /><span aria-hidden="true">~</span><DatePicker v-model="form.applyEnd" show-time hour-format="24" placeholder="종료" /></td>
            </tr>
            <tr>
              <th scope="row" class="req">입금기간 종료</th>
              <td><DatePicker v-model="form.depositEnd" date-format="yy.mm.dd" placeholder="입금기간 종료일" /></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 12px; display: flex; gap: 8px">
          <SbCan action="update"><SbCan action="config"><Button label="저장" severity="contrast" @click="requestSave" /></SbCan></SbCan>
          <Button v-if="editing" label="새 설정" severity="secondary" outlined @click="resetForm" />
        </div>
      </fieldset>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">설정 목록</h2><span class="ws-desc">{{ bizLabel(bizCode) }}</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">기업구분</th><th scope="col">발전모델</th><th scope="col">상태</th><th scope="col">신청기간</th><th scope="col">입금기간 종료</th><th scope="col">추가 인원 신청</th><th scope="col">최종수정</th></tr></thead>
        <tbody>
          <tr v-if="windows.length === 0"><td colspan="7" class="ws-desc" style="text-align: center">설정된 창구가 없습니다.</td></tr>
          <tr v-for="w in windows" :key="w.id" style="cursor: pointer" @click="loadRow(w)">
            <td>{{ coFgLabel(w.coFg) }}</td><td>{{ w.growthOnly ? '예' : '아니오' }}</td>
            <td><span :class="`ws-badge ws-badge--${STATE_TONE[winState(w)]}`">{{ winState(w) }}</span></td>
            <td>{{ w.apply[0].toLocaleDateString('ko-KR') }} ~ {{ w.apply[1].toLocaleDateString('ko-KR') }}</td>
            <td>{{ w.depositEnd.toLocaleDateString('ko-KR') }}</td>
            <td>
              <span v-if="w.pendingCount">{{ w.pendingCount }}건</span><span v-else class="ws-desc">—</span>
              <Button v-if="w.pendingCount" label="심사목록" severity="secondary" text size="small" @click.stop="router.push({ path: routeOf('SP-PRT-031L'), query: { biz: w.bizCode, coFg: w.coFg } })" />
            </td>
            <td>{{ w.updatedBy }} · {{ w.updatedAt }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>사업 상세(SP-BIZ-010D)의 참여인원은 최초 모집 상한이고, 여기는 참여를 시작한 기업이 인원을 더 신청하는 창구다.</li>
        <li>신청기간은 분 단위로 받는 유일한 화면이다. 입금기간 종료는 신청기간 종료 이후여야 한다.</li>
        <li>행을 누르면 그 설정이 폼에 불러와진다. '새 설정'으로 처음부터 다시 만들 수 있다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="confirmOpen" code="SP-BIZ-030P-M1" header="추가신청 창구 변경 확인"
      :target="`${bizLabel(bizCode)} · ${form.growthOnly ? '발전모델만' : '전체'} · ${form.coFgs.map(coFgLabel).join(', ')}`"
      :warn="pending ? `처리 중인 추가 인원 신청 ${pending}건이 있습니다.` : undefined"
      :notice="form.status === '열림' ? '추가신청 가능 기간이 기업 어드민에 노출됩니다.' : undefined"
      confirm-label="확정" @confirm="commit"
    >
      <p>{{ editing ? editing.status : '(신규)' }} → <b>{{ form.status }}</b></p>
      <p class="ws-desc">신청기간 {{ form.applyStart?.toLocaleString('ko-KR') }} ~ {{ form.applyEnd?.toLocaleString('ko-KR') }}</p>
      <p class="ws-desc">입금기간 종료 {{ form.depositEnd?.toLocaleDateString('ko-KR') }}</p>
    </WsActionDialog>
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
</style>
