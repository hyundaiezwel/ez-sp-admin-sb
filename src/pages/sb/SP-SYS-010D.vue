<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-SYS-010D 관리자관리 관리자상세 — 계정 등록 · 수정, 역할 · 사업 범위 · 개별 권한 조정, 계정 상태 관리.
 * `?id=new`면 등록, 그 외에는 기존 계정 수정. id를 watch해 탭이 같은 화면 인스턴스로 다른 건을 연다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { ROLES, ACTIONS, type Action } from '../../sb/roles'
import { BIZ } from '../../sp/codes'
import { badgeClass } from '../../ws/badge'
import { notify } from '../../ws/notify'
import { adminOf, type AcctStatus, type SbAdmin } from '@fixtures/sb/B1'

const CODE = 'SP-SYS-010D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.query.id === 'new')
const admin = ref<SbAdmin | null>(null)
const form = ref({ loginId: '', name: '', role: 'AS' as SbAdmin['role'], email: '', phone: '', bizScope: [] as string[], grantAdd: [] as Action[], grantRemove: [] as Action[] })

function load() {
  if (isNew.value) {
    admin.value = null
    form.value = { loginId: '', name: '', role: 'AS', email: '', phone: '', bizScope: [], grantAdd: [], grantRemove: [] }
    return
  }
  const a = adminOf(String(route.query.id ?? ''))
  admin.value = a ?? null
  if (a) form.value = { loginId: a.loginId, name: a.name, role: a.role, email: a.email, phone: a.phone, bizScope: [...a.bizScope], grantAdd: [...a.grantAdd] as Action[], grantRemove: [...a.grantRemove] as Action[] }
}
watch(() => route.query.id, load, { immediate: true })

const TONE: Record<AcctStatus, 'success' | 'warning' | 'danger' | 'mute'> = { 사용: 'success', '임시 비밀번호': 'warning', 휴면: 'mute', 잠금: 'danger', 사용중지: 'danger' }
const HISTORY = computed(() => admin.value ? [
  { at: admin.value.createdAt, by: admin.value.createdBy, what: '계정 등록', reason: '신규 발급' },
  ...(admin.value.status === '잠금' ? [{ at: admin.value.lastLoginAt, by: '시스템', what: '잠금 전환', reason: '로그인 5회 실패' }] : []),
] : [])

/* --- 저장(등록·수정) ------------------------------------------------------- */
function save() {
  if (!form.value.loginId.trim() || !form.value.name.trim()) return notify('아이디 · 이름을 입력하세요.', 'danger')
  if (isNew.value) {
    notify(`${form.value.name} 계정을 임시 비밀번호로 발급했습니다 — 이메일로 안내를 보냅니다.`, 'success')
    router.push(routeOf('SP-SYS-010L'))
  } else {
    notify('기본정보를 저장했습니다.', 'success')
  }
}

/* --- 역할 · 개별 권한 조정(M3) ---------------------------------------------- */
const permOpen = ref(false)
const pendingRole = ref<SbAdmin['role'] | null>(null)
function applyRole() {
  if (!admin.value) return
  pendingRole.value = form.value.role
  permOpen.value = true
}
function confirmPerm(p: ActionPayload) {
  if (!admin.value || !pendingRole.value) return
  if (p.text.trim().length < 10) return notify('사유를 10자 이상 입력하세요.', 'danger')
  admin.value.role = pendingRole.value
  admin.value.bizScope = [...form.value.bizScope]
  notify('역할 · 권한을 바꾸고 권한 변경 이력에 남겼습니다(3년 이상 보관).', 'success')
}
const grantOptions = ACTIONS.map((a) => ({ label: a.label, value: a.code }))

/* --- 계정 상태(M1) ---------------------------------------------------------- */
const stsOpen = ref(false)
function doStatus(p: ActionPayload) {
  if (!admin.value || !p.option) return
  if (p.text.trim().length < 5) return notify('사유를 5자 이상 입력하세요.', 'danger')
  admin.value.status = p.option as AcctStatus
  notify(`계정을 ${p.option}(으)로 바꿨습니다.`, 'success')
}

/* --- 잠금 해제 · 비밀번호 초기화(M2) ----------------------------------------- */
const unlockOpen = ref(false)
function doUnlock(p: ActionPayload) {
  if (!admin.value || !p.option) return
  if (p.option === '잠금 해제') { admin.value.status = '사용'; admin.value.failCount = 0; notify('잠금을 해제했습니다.', 'success') }
  else { admin.value.status = '임시 비밀번호'; notify('비밀번호를 초기화하고 등록 이메일로 임시 비밀번호를 보냈습니다.', 'success') }
}

/* --- 계정 신청 승인 · 거부 --------------------------------------------------- */
function approvePending(ok: boolean) {
  if (!admin.value) return
  admin.value.pending = false
  notify(ok ? '계정 신청을 승인했습니다.' : '계정 신청을 거부했습니다.', ok ? 'success' : 'warning')
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '관리자상세 — 신규 등록' : '관리자상세'" />

    <template v-if="!isNew && !admin">
      <p class="ws-desc">계정을 찾을 수 없습니다. <RouterLink :to="routeOf('SP-SYS-010L')">목록으로</RouterLink></p>
    </template>

    <template v-else>
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">기본정보</h2>
            <span v-if="admin" :class="badgeClass(TONE[admin.status])">{{ admin.status }}</span>
            <span v-if="admin?.pending" class="ws-badge ws-badge--warning">발급대기</span>
          </div>
          <div class="ws-tit__r" v-if="admin">
            <RouterLink :to="`${routeOf('SP-SYS-020P')}?admin=${admin.id}`" class="ws-desc">접속이력 보기</RouterLink>
          </div>
        </div>
        <table class="ws-tb">
          <tbody>
            <tr>
              <th scope="row" class="req">아이디</th>
              <td><InputText v-model="form.loginId" :disabled="!isNew" fluid /></td>
              <th scope="row" class="req">이름</th>
              <td><InputText v-model="form.name" fluid /></td>
            </tr>
            <tr>
              <th scope="row">이메일</th>
              <td><InputText v-model="form.email" fluid placeholder="op001@example.com" /></td>
              <th scope="row">휴대폰</th>
              <td><InputText v-model="form.phone" fluid placeholder="010-0000-0000" /></td>
            </tr>
            <tr>
              <th scope="row" class="req">역할</th>
              <td><Select v-model="form.role" :options="ROLES.filter((r) => r.org !== '기업')" option-label="label" option-value="code" fluid /></td>
              <th scope="row">사업 범위</th>
              <td><MultiSelect v-model="form.bizScope" :options="BIZ" option-label="label" option-value="code" placeholder="전체(비우면 전체)" fluid /></td>
            </tr>
          </tbody>
        </table>
        <div class="d-actions">
          <SbCan v-if="isNew" action="account"><Button label="발급" @click="save" /></SbCan>
          <SbCan v-else action="account"><Button label="기본정보 저장" severity="secondary" outlined @click="save" /></SbCan>
        </div>
      </section>

      <template v-if="admin">
        <section class="ws-sec">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">역할 · 개별 권한 조정</h2><span class="ws-desc">역할 기본값 위에 개별로 얹는다 · account · money는 한 계정에 같이 줄 수 없다</span></div></div>
          <table class="ws-tb">
            <tbody>
              <tr>
                <th scope="row">추가 허용</th>
                <td><MultiSelect v-model="form.grantAdd" :options="grantOptions" option-label="label" option-value="value" placeholder="없음" fluid /></td>
                <th scope="row">회수</th>
                <td><MultiSelect v-model="form.grantRemove" :options="grantOptions" option-label="label" option-value="value" placeholder="없음" fluid /></td>
              </tr>
            </tbody>
          </table>
          <div class="d-actions">
            <SbCan action="account"><Button label="역할 · 권한 저장" severity="secondary" outlined @click="applyRole" /></SbCan>
          </div>
        </section>

        <section class="ws-sec" v-if="admin.pending">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">계정 신청 처리</h2></div></div>
          <div class="d-actions">
            <SbCan action="account"><Button label="승인" @click="approvePending(true)" /></SbCan>
            <SbCan action="account"><Button label="거부" severity="danger" outlined @click="approvePending(false)" /></SbCan>
          </div>
        </section>

        <section class="ws-sec">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">계정 상태</h2></div></div>
          <div class="d-actions">
            <SbCan action="account"><Button :label="admin.status === '사용중지' ? '사용으로 되돌리기' : '사용중지'" severity="danger" outlined @click="stsOpen = true" /></SbCan>
            <SbCan action="account"><Button label="잠금 해제 · 비밀번호 초기화" severity="secondary" outlined @click="unlockOpen = true" /></SbCan>
          </div>
        </section>

        <section class="ws-sec">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">권한 변경 이력</h2><span class="ws-desc">3년 이상 보관 · 수정 불가</span></div></div>
          <table class="ws-tb">
            <thead><tr><th scope="col">일시</th><th scope="col">처리자</th><th scope="col">내용</th><th scope="col">사유</th></tr></thead>
            <tbody>
              <tr v-for="(h, i) in HISTORY" :key="i"><td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.what }}</td><td>{{ h.reason }}</td></tr>
              <tr v-if="!HISTORY.length"><td colspan="4" class="ws-desc" style="text-align:center">이력 없음</td></tr>
            </tbody>
          </table>
        </section>
      </template>
    </template>

    <WsActionDialog
      v-model:visible="permOpen" code="SP-SYS-010D-M3" header="권한 변경 사유"
      :target="admin ? `${admin.name} — 역할 ${admin.role} → ${pendingRole}` : ''"
      :reason="{ label: '사유', required: true, min: 10, max: 200, placeholder: '10자 이상' }"
      confirm-label="변경" @confirm="confirmPerm"
    />

    <WsActionDialog
      v-model:visible="stsOpen" code="SP-SYS-010D-M1" header="계정 상태 변경"
      :target="admin ? `${admin.name} — 지금 ${admin.status}` : ''"
      :reason="{ label: '처리', options: admin?.status === '사용중지' ? ['사용'] : ['사용중지'], required: true, min: 5, max: 200 }"
      notice="사용중지하면 다음 로그인 시도부터 거부됩니다."
      confirm-label="변경" danger @confirm="doStatus"
    />

    <WsActionDialog
      v-model:visible="unlockOpen" code="SP-SYS-010D-M2" header="잠금 해제 · 비밀번호 초기화"
      :target="admin ? admin.name : ''"
      :reason="{ label: '처리', options: ['잠금 해제', '비밀번호 초기화'] }"
      notice="비밀번호 초기화는 등록 이메일로 임시 비밀번호를 보냅니다."
      confirm-label="처리" @confirm="doUnlock"
    />
  </div>
</template>

<style scoped>
.d-actions { display: flex; gap: 8px; margin-top: 12px; }
</style>
