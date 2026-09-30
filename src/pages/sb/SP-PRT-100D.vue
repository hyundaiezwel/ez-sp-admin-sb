<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-100D 참여불가회원 관리 상세(등록/수정). 대상 노동자 찾기(M2) · 적용상태 변경(M1).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsMasked from '../../ws/WsMasked.vue'
import SbCode from '../../sb/SbCode.vue'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { WORKERS_B4, type SbWorkerB4 } from '@fixtures/sb/B4'
import { BLOCKED_MEMBERS, blockMemberOf, type SbBlockMember } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-100D'
const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.query.mode === 'new')
const source = computed(() => (isNew.value ? undefined : blockMemberOf(String(route.query.id ?? ''))))
const blank = (): SbBlockMember => ({ id: '', workerName: '', birth: '', companyId: '', company: '', detectPath: '', caseRef: '', appliedAt: new Date().toLocaleDateString('ko-KR'), expireAt: '', applyState: '적용' })
const form = ref<SbBlockMember>(source.value ? structuredClone(source.value) : blank())
watch(source, (s) => { if (s) form.value = structuredClone(s) })

const editable = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update')))

function requestSave() {
  if (!editable.value) return
  if (!form.value.workerName.trim() || !form.value.detectPath.trim()) return notify('대상 노동자와 적발경로를 입력하세요.', 'danger')
  if (isNew.value) {
    form.value.id = `BM-${String(BLOCKED_MEMBERS.length + 1).padStart(3, '0')}`
    BLOCKED_MEMBERS.push(structuredClone(form.value))
    notify(`'${form.value.workerName}'을 참여불가회원으로 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: form.value.id } })
    return
  }
  Object.assign(source.value!, structuredClone(form.value))
  notify('저장했습니다.', 'success')
}

/* --- M2 대상 노동자 찾기 ---------------------------------------------------- */
const findOpen = ref(false)
const fName = ref('')
const fCompany = ref('')
const candidates = computed(() => WORKERS_B4.filter((w) => (!fName.value.trim() || w.name.includes(fName.value.trim())) && (!fCompany.value.trim() || w.company.includes(fCompany.value.trim()))).slice(0, 30))
const alreadyBlocked = (w: SbWorkerB4) => BLOCKED_MEMBERS.some((b) => b.workerName === w.name && b.company === w.company && b.applyState === '적용')
function pickWorker(w: SbWorkerB4) {
  form.value.workerName = w.name; form.value.birth = w.birth; form.value.companyId = w.companyId; form.value.company = w.company
  findOpen.value = false
}

/* --- M1 참여불가 적용상태 변경 --------------------------------------------- */
const stsOpen = ref(false)
const newExpire = ref<Date | null>(null)
function openStatus() { newExpire.value = null; stsOpen.value = true }
function doStatus(p: ActionPayload) {
  const to = form.value.applyState === '적용' ? '해제' : '적용'
  if (to === '적용' && form.value.expireAt === '' && !newExpire.value) return notify('만료 건을 적용으로 되돌리려면 새 만료일이 필요합니다.', 'danger')
  form.value.applyState = to
  if (newExpire.value) form.value.expireAt = newExpire.value.toLocaleDateString('ko-KR')
  if (source.value) Object.assign(source.value, { applyState: form.value.applyState, expireAt: form.value.expireAt })
  notify(`참여불가 상태를 ${to}(으)로 바꿨습니다.`, 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '참여불가회원 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l">
        <h2 class="ws-tit__h">{{ isNew ? '새 참여불가회원 등록' : form.workerName }}</h2>
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
          <tr>
            <th scope="row" class="req">대상 노동자</th>
            <td>
              <span v-if="form.workerName"><WsMasked :value="form.workerName" kind="name" label="성명" /> · {{ form.company }} · <WsMasked :value="form.birth" kind="birth" label="생년월일" /></span>
              <span v-else class="ws-desc">아직 선택하지 않았습니다</span>
              <Button v-if="isNew" label="찾기" size="small" severity="secondary" outlined style="margin-left: 8px" @click="findOpen = true" />
            </td>
          </tr>
          <tr><th scope="row" class="req"><label for="bm-path">적발경로</label></th><td><InputText id="bm-path" v-model="form.detectPath" fluid maxlength="60" placeholder="예: 중고거래 A 모니터링" /></td></tr>
          <tr><th scope="row">참조 부정행위 적발 건</th><td><InputText v-model="form.caseRef" fluid maxlength="30" placeholder="예: FD-2026-0001" /></td></tr>
          <tr><th scope="row">적용일</th><td>{{ form.appliedAt }}</td></tr>
          <tr><th scope="row">만료일</th><td><InputText v-model="form.expireAt" fluid placeholder="비우면 무기한 · 예: 2027.05.31" /></td></tr>
        </tbody>
      </table>
    </fieldset>

    <!-- M2 -->
    <Dialog v-model:visible="findOpen" modal header="대상 노동자 찾기" :style="{ width: '560px' }" :draggable="false">
      <div class="ad" style="margin-bottom: 8px">
        <InputText v-model="fName" placeholder="이름" style="width: 160px" />
        <InputText v-model="fCompany" placeholder="기업명" style="width: 200px" />
      </div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">성명</th><th scope="col">생년월일</th><th scope="col">기업명</th><th scope="col">회원 상태</th><th scope="col"></th></tr></thead>
        <tbody>
          <tr v-if="candidates.length === 0"><td colspan="5" class="ws-desc" style="text-align: center">조건에 맞는 후보가 없습니다.</td></tr>
          <tr v-for="w in candidates" :key="w.id" style="cursor: pointer" @click="pickWorker(w)">
            <td><WsMasked :value="w.name" kind="name" label="성명" /></td>
            <td><WsMasked :value="w.birth" kind="birth" label="생년월일" /></td>
            <td>{{ w.company }}</td>
            <td>{{ w.memberSts === '' ? '이용중' : w.memberSts }}</td>
            <td><span v-if="alreadyBlocked(w)" class="ws-badge ws-badge--warning">적용 중</span></td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <SbCode code="SP-PRT-100D-M2" />
        <Button label="닫기" severity="secondary" outlined @click="findOpen = false" />
      </template>
    </Dialog>

    <!-- M1 -->
    <WsActionDialog
      v-model:visible="stsOpen" code="SP-PRT-100D-M1" :header="`참여불가 ${form.applyState === '적용' ? '해제' : '적용'}`"
      :reason="{ label: '사유', required: true, min: 5, max: 200 }"
      :confirm-label="form.applyState === '적용' ? '해제' : '적용'" @confirm="doStatus"
    >
      <div v-if="form.applyState !== '적용' && form.expireAt === ''" style="display: grid; gap: 6px; margin-top: 8px">
        <label for="bm-exp2" class="ws-req">새 만료일(만료 건을 적용으로 되돌릴 때 필수)</label>
        <DatePicker id="bm-exp2" v-model="newExpire" date-format="yy.mm.dd" show-icon icon-display="input" />
      </div>
    </WsActionDialog>
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
.ad { display: flex; gap: 8px; }
</style>
