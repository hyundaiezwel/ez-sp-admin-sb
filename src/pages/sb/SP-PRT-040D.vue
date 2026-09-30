<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-040D 기업담당자관리 담당자상세(등록/수정). 계정 상태 변경 · 잠금 해제 · 비밀번호 초기화 · 중복인증키 확인.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { MANAGERS, managerOf, managersOfCompany, type SbManager, type AcctSts } from '@fixtures/sb/B4'

const CODE = 'SP-PRT-040D'
const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.query.mode === 'new')
const source = computed(() => (isNew.value ? undefined : managerOf(String(route.query.id ?? ''))))
const blank = (): SbManager => ({ id: '', companyId: String(route.query.companyId ?? ''), company: String(route.query.company ?? ''), bizNo: '', name: '', loginId: '', phone: '', email: '', position: '담당자', acctSts: '사용', lastLoginAt: '', createdAt: '', onlyManager: false })
const form = ref<SbManager>(source.value ? structuredClone(source.value) : blank())
watch(source, (s) => { if (s) form.value = structuredClone(s) })

const editable = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update')))

function save() {
  if (!editable.value) return
  if (!form.value.name.trim() || !form.value.loginId.trim() || !form.value.phone.trim()) return notify('담당자명 · 아이디 · 연락처를 입력하세요.', 'danger')
  if (isNew.value) {
    form.value.id = `MG-${String(MANAGERS.length + 1).padStart(4, '0')}`
    form.value.createdAt = new Date().toLocaleString('ko-KR')
    MANAGERS.push(structuredClone(form.value))
    notify(`'${form.value.name}' 담당자를 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: form.value.id } })
    return
  }
  Object.assign(source.value!, structuredClone(form.value))
  notify('저장했습니다.', 'success')
}

/* --- M1 계정 상태 변경 ------------------------------------------------------ */
const stsOpen = ref(false)
const stsTarget = ref<AcctSts>('사용중지')
function openStatus(v: AcctSts) { stsTarget.value = v; stsOpen.value = true }
function doStatus(p: ActionPayload) {
  form.value.acctSts = stsTarget.value
  if (source.value) source.value.acctSts = stsTarget.value
  notify(`계정 상태를 ${stsTarget.value}(으)로 바꿨습니다${stsTarget.value === '사용중지' ? ' — 즉시 로그인이 차단됩니다' : ''}.`, 'success')
}

/* --- M2 로그인 잠금 해제 ------------------------------------------------------ */
const unlockOpen = ref(false)
function doUnlock() {
  form.value.acctSts = '사용'
  if (source.value) source.value.acctSts = '사용'
  notify('잠금을 해제했습니다.', 'success')
  unlockOpen.value = false
}

/* --- M3 비밀번호 초기화 ------------------------------------------------------- */
const resetOpen = ref(false)
function doReset(p: ActionPayload) { notify('임시 비밀번호를 발급했습니다 — 담당자에게 LMS가 발송됩니다.', 'success') }

/* --- M4 중복인증키 확인 ------------------------------------------------------- */
const dupOpen = ref(false)
const dupList = computed(() => (source.value ? managersOfCompany(source.value.companyId).filter((m) => m.id !== source.value!.id) : []))
function gotoManager(m: SbManager) { dupOpen.value = false; router.push({ path: routeOf(CODE), query: { id: m.id } }) }

const onlyManagerLeft = computed(() => source.value?.onlyManager && dupList.value.length === 0)
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '담당자 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l">
        <h2 class="ws-tit__h">{{ isNew ? '새 담당자 등록' : form.name }}</h2>
        <span v-if="!isNew" class="ws-badge" :class="form.acctSts === '사용' ? 'ws-badge--success' : form.acctSts === '잠금' ? 'ws-badge--warning' : form.acctSts === '사용중지' ? 'ws-badge--danger' : 'ws-badge--mute'">{{ form.acctSts }}</span>
        <span v-if="!isNew" class="ws-desc">{{ form.company }} · {{ form.loginId }}</span>
      </div>
      <div class="ws-tit__r">
        <SbCan v-if="!isNew" action="account"><Button label="중복인증키 확인" severity="secondary" outlined @click="dupOpen = true" /></SbCan>
        <SbCan v-if="!isNew && form.acctSts === '잠금'" action="account"><Button label="잠금 해제" severity="secondary" outlined @click="unlockOpen = true" /></SbCan>
        <SbCan v-if="!isNew" action="account"><Button label="비밀번호 초기화" severity="secondary" outlined @click="resetOpen = true" /></SbCan>
        <SbCan v-if="!isNew" action="account">
          <Button v-if="form.acctSts !== '사용중지'" label="사용중지" severity="danger" outlined @click="openStatus('사용중지')" />
          <Button v-else label="사용 전환" @click="openStatus('사용')" />
        </SbCan>
        <SbCan :action="isNew ? 'create' : 'update'"><Button :label="isNew ? '등록' : '저장'" severity="contrast" @click="save" /></SbCan>
      </div>
    </div>
    <p v-if="!can(CODE, isNew ? 'create' : 'update')" class="ws-desc">{{ denyTip(CODE, isNew ? 'create' : 'update') }}</p>

    <fieldset :disabled="!editable" style="border: 0; margin: 0; padding: 0">
      <table class="ws-tb">
        <colgroup><col style="width: 160px" /><col /></colgroup>
        <tbody>
          <tr><th scope="row">소속 기업</th><td>{{ form.company || '—' }}</td></tr>
          <tr><th scope="row" class="req"><label for="d-name">담당자명</label></th><td><InputText id="d-name" v-model="form.name" fluid maxlength="20" /></td></tr>
          <tr><th scope="row" class="req"><label for="d-id">아이디</label></th><td><InputText id="d-id" v-model="form.loginId" fluid maxlength="20" :disabled="!isNew" /></td></tr>
          <tr><th scope="row" class="req"><label for="d-phone">연락처</label></th><td><InputText id="d-phone" v-model="form.phone" fluid placeholder="010-0000-0000" /></td></tr>
          <tr><th scope="row"><label for="d-mail">이메일</label></th><td><InputText id="d-mail" v-model="form.email" fluid /></td></tr>
          <tr><th scope="row">직위</th><td><Select v-model="form.position" :options="['담당자', '팀장', '인사담당']" style="width: 160px" /></td></tr>
          <tr v-if="!isNew"><th scope="row">최근 로그인</th><td>{{ form.lastLoginAt || '-' }}</td></tr>
          <tr v-if="!isNew"><th scope="row">등록일시</th><td>{{ form.createdAt }}</td></tr>
          <tr v-if="onlyManagerLeft"><th scope="row">주의</th><td class="ws-desc">이 기업의 마지막 사용 담당자입니다 — 사용중지 처리 시 경고가 한 번 더 나타납니다.</td></tr>
        </tbody>
      </table>
    </fieldset>

    <!-- M1 -->
    <WsActionDialog
      v-model:visible="stsOpen" code="SP-PRT-040D-M1" :header="`계정 상태 변경 — ${stsTarget}`"
      :warn="onlyManagerLeft && stsTarget === '사용중지' ? '마지막 사용 담당자입니다. 사용중지하면 이 기업에 로그인 가능한 담당자가 없어집니다.' : undefined"
      :reason="{ label: '사유', required: true, min: 5, max: 100 }"
      :confirm-label="stsTarget" :danger="stsTarget === '사용중지'" @confirm="doStatus"
    />
    <!-- M2 -->
    <WsActionDialog v-model:visible="unlockOpen" code="SP-PRT-040D-M2" header="로그인 잠금 해제" :reason="{ label: '처리 사유' }" confirm-label="해제" @confirm="doUnlock" />
    <!-- M3 -->
    <WsActionDialog
      v-model:visible="resetOpen" code="SP-PRT-040D-M3" header="비밀번호 초기화"
      :reason="{ label: '초기화 사유', required: true, min: 5, max: 100 }"
      notice="담당자에게 임시 비밀번호 LMS가 발송됩니다." confirm-label="초기화" @confirm="doReset"
    />
    <!-- M4 -->
    <Dialog v-model:visible="dupOpen" modal header="중복인증키 확인" :style="{ width: '520px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 8px">같은 기업에 등록된 다른 담당자 계정이다. 행을 누르면 그 담당자 상세로 바꾼다.</p>
      <table class="ws-gtb">
        <thead><tr><th scope="col">기업명</th><th scope="col">아이디</th><th scope="col">이름</th><th scope="col">계정 상태</th></tr></thead>
        <tbody>
          <tr v-if="dupList.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">다른 계정이 없습니다.</td></tr>
          <tr v-for="m in dupList" :key="m.id" style="cursor: pointer" @click="gotoManager(m)">
            <td>{{ m.company }}</td><td>{{ m.loginId }}</td><td>{{ m.name[0] }}*{{ m.name.slice(-1) }}</td><td>{{ m.acctSts }}</td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <SbCode code="SP-PRT-040D-M4" />
        <Button label="닫기" severity="secondary" outlined @click="dupOpen = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
</style>
