<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-090D 참여불가기업 관리 상세(등록/수정). 적용으로 바꿀 때 진행 중 참여 건이 있으면 먼저 경고(M1).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import AutoComplete from 'primevue/autocomplete'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES, type SbCompany } from '@fixtures/sb/common'
import { BLOCKED_COMPANIES, blockCoOf, type SbBlockCo } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-090D'
const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.query.mode === 'new')
const source = computed(() => (isNew.value ? undefined : blockCoOf(String(route.query.id ?? ''))))
const blank = (): SbBlockCo => ({ id: '', companyId: '', company: '', bizNo: '', reason: '', basis: '부정행위', appliedAt: new Date().toLocaleDateString('ko-KR'), expireAt: '', applyState: '적용', activeParticipations: [] })
const form = ref<SbBlockCo>(source.value ? structuredClone(source.value) : blank())
watch(source, (s) => { if (s) form.value = structuredClone(s) })

const editable = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update')))
const coQuery = ref('')
const coSuggest = ref<SbCompany[]>([])
function searchCo(e: { query: string }) { coSuggest.value = COMPANIES.filter((c) => c.name.includes(e.query)).slice(0, 8) }
function pickCo(c: SbCompany) { form.value.companyId = c.id; form.value.company = c.name; form.value.bizNo = c.bizNo }

function requestSave() {
  if (!editable.value) return
  if (!form.value.company.trim() || !form.value.reason.trim()) return notify('기업명과 사유를 입력하세요.', 'danger')
  if (isNew.value) { commit(); return }
  if (form.value.applyState === '적용' && form.value.activeParticipations.length > 0) { warnOpen.value = true; return }
  commit()
}
function commit() {
  if (isNew.value) {
    form.value.id = `BC-${String(BLOCKED_COMPANIES.length + 1).padStart(3, '0')}`
    BLOCKED_COMPANIES.push(structuredClone(form.value))
    notify(`'${form.value.company}'를 참여불가기업으로 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: form.value.id } })
    return
  }
  Object.assign(source.value!, structuredClone(form.value))
  notify('저장했습니다.', 'success')
}

/* --- M1 진행 중 참여 건 경고 ------------------------------------------------ */
const warnOpen = ref(false)
function warnCommit() { warnOpen.value = false; commit() }

/* --- M2 참여불가 적용상태 변경(빠른 전환) ----------------------------------- */
const stsOpen = ref(false)
function openStatus() { stsOpen.value = true }
function doStatus(p: ActionPayload) {
  const to = form.value.applyState === '적용' ? '해제' : '적용'
  form.value.applyState = to
  if (source.value) source.value.applyState = to
  notify(`참여불가 상태를 ${to}(으)로 바꿨습니다.`, 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '참여불가기업 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l">
        <h2 class="ws-tit__h">{{ isNew ? '새 참여불가기업 등록' : form.company }}</h2>
        <span v-if="!isNew" class="ws-badge" :class="form.applyState === '적용' ? 'ws-badge--danger' : 'ws-badge--mute'">{{ form.applyState }}</span>
      </div>
      <div class="ws-tit__r">
        <SbCan v-if="!isNew" action="status"><Button :label="form.applyState === '적용' ? '해제' : '적용'" severity="secondary" outlined @click="openStatus" /></SbCan>
        <SbCan :action="isNew ? 'create' : 'update'"><Button :label="isNew ? '등록' : '저장'" severity="contrast" @click="requestSave" /></SbCan>
      </div>
    </div>
    <p v-if="!can(CODE, isNew ? 'create' : 'update')" class="ws-desc">{{ denyTip(CODE, isNew ? 'create' : 'update') }}</p>

    <fieldset :disabled="!editable" style="border: 0; margin: 0; padding: 0">
      <table class="ws-tb">
        <colgroup><col style="width: 160px" /><col /></colgroup>
        <tbody>
          <tr v-if="isNew">
            <th scope="row" class="req">기업명</th>
            <td>
              <AutoComplete v-model="coQuery" :suggestions="coSuggest" fluid placeholder="기업명 검색" @complete="searchCo" @item-select="(e: any) => pickCo(e.value)">
                <template #option="{ option }"><span>{{ option.name }} · {{ option.bizNo }}</span></template>
              </AutoComplete>
              <p v-if="form.company" class="ws-desc" style="margin-top: 4px">선택 — {{ form.company }} · {{ form.bizNo }}</p>
            </td>
          </tr>
          <tr v-else><th scope="row">기업명</th><td>{{ form.company }} · {{ form.bizNo }}</td></tr>
          <tr>
            <th scope="row">근거</th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-label="근거">
                <label v-for="b in ['부정행위', '기업분류'] as const" :key="b" class="ws-radio"><input type="radio" :checked="form.basis === b" @change="form.basis = b" /> {{ b }}</label>
              </div>
            </td>
          </tr>
          <tr><th scope="row" class="req"><label for="bc-reason">사유</label></th><td><Textarea id="bc-reason" v-model="form.reason" rows="3" fluid maxlength="200" /></td></tr>
          <tr><th scope="row">만료일</th><td><InputText v-model="form.expireAt" fluid placeholder="비우면 무기한 · 예: 2027.05.31" /></td></tr>
          <tr v-if="!isNew && form.activeParticipations.length">
            <th scope="row">진행 중 참여 건</th>
            <td>
              <table class="ws-gtb">
                <thead><tr><th scope="col">사업</th><th scope="col">상태</th><th scope="col">신청번호</th></tr></thead>
                <tbody><tr v-for="p in form.activeParticipations" :key="p.applyNo"><td>{{ p.biz }}</td><td>{{ p.sts }}</td><td>{{ p.applyNo }}</td></tr></tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </fieldset>

    <!-- M1 -->
    <Dialog v-model:visible="warnOpen" modal header="진행 중 참여 건 경고" :style="{ width: '480px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 8px">이 기업의 참여 건 상태는 바꾸지 않습니다 — 신규 참여만 막습니다.</p>
      <table class="ws-gtb">
        <thead><tr><th scope="col">사업</th><th scope="col">상태</th><th scope="col">신청번호</th></tr></thead>
        <tbody><tr v-for="p in form.activeParticipations" :key="p.applyNo"><td>{{ p.biz }}</td><td>{{ p.sts }}</td><td>{{ p.applyNo }}</td></tr></tbody>
      </table>
      <template #footer>
        <SbCode code="SP-PRT-090D-M1" />
        <Button label="취소" severity="secondary" outlined @click="warnOpen = false" />
        <Button label="확인 후 저장" @click="warnCommit" />
      </template>
    </Dialog>

    <!-- M2 -->
    <WsActionDialog
      v-model:visible="stsOpen" code="SP-PRT-090D-M2" :header="`참여불가 ${form.applyState === '적용' ? '해제' : '적용'}`"
      :reason="{ label: '사유', required: true, min: 5, max: 200 }"
      :confirm-label="form.applyState === '적용' ? '해제' : '적용'" @confirm="doStatus"
    />
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
</style>
