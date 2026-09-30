<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-060D 부정행위 모니터링 상세(조치) — 명세 src/specs/SP-OPS-060D.json */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import RadioButton from 'primevue/radiobutton'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import PageHead from '../../app/PageHead.vue'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsMasked from '../../ws/WsMasked.vue'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { notify } from '../../ws/notify'
import { routeOf } from '../../sb/screens'
import { fraudCaseOf, type FraudCase, HANDLE_LABEL } from '@fixtures/sb/B6'
import { HANDLE, REPORT, USED_AFTER, SUSPEND_REASONS } from '../../sp/codes'

const CODE = 'SP-OPS-060D'
const route = useRoute()
const router = useRouter()
const item = ref<FraudCase | null>(null)
watch(() => route.query.id, () => { item.value = fraudCaseOf(String(route.query.id ?? '')) ?? null }, { immediate: true })

const handle = ref(''); const report = ref(''); const deleted = ref(false); const action = ref('')
watch(item, (v) => { handle.value = v?.handle ?? ''; report.value = v?.report ?? ''; deleted.value = v?.deleted ?? false; action.value = v?.action ?? '' }, { immediate: true })
const dirty = computed(() => !!item.value && (handle.value !== item.value.handle || report.value !== item.value.report || deleted.value !== item.value.deleted || action.value !== item.value.action))

const STEPS = [{ label: '수집' }, { label: '대조' }, { label: '소명' }, { label: '조치' }, { label: '제재' }]
const stepIdx = computed(() => {
  if (!item.value) return 0
  if (item.value.matched?.sts === '710') return 4
  if (item.value.handle === '2' || item.value.handle === '3') return 3
  if (item.value.report === '1' || item.value.report === '2') return 2
  return 1
})

function saveAction() {
  if (!can(CODE, 'status')) return notify(denyTip(CODE, 'status'), 'danger')
  if (!item.value) return
  if (handle.value === '3' && !action.value.trim()) return notify('조치불가 사유를 조치내용에 적으세요.', 'danger')
  Object.assign(item.value, { handle: handle.value, report: report.value, deleted: deleted.value, action: action.value.trim() })
  if (handle.value === '2') { item.value.actionAt = new Date().toISOString().slice(0, 10); item.value.actionBy = '지금 계정' }
  notify('조치 내용을 저장했습니다.', 'success')
}

/* --- 이용정지(M1) ---------------------------------------------------------- */
const suspendOpen = ref(false)
const suspendReason = ref(''); const suspendEtc = ref('')
function doSuspend() {
  if (!can(CODE, 'status')) return notify(denyTip(CODE, 'status'), 'danger')
  if (!item.value?.matched) return
  if (!suspendReason.value) return notify('이용정지 사유를 선택하세요.', 'danger')
  if (suspendReason.value === '기타' && suspendEtc.value.trim().length < 1) return notify('기타 사유를 입력하세요.', 'danger')
  item.value.matched.sts = '710'
  item.value.handle = '2'; item.value.actionAt = new Date().toISOString().slice(0, 10); item.value.actionBy = '지금 계정'
  notify('이용정지 처리했습니다 — 대상자에게 이용정지(협약파기) 안내를 보냅니다.', 'success')
}

/* --- 참여불가회원 등록(M2) --------------------------------------------------- */
const blockOpen = ref(false)
function doBlock() {
  if (!can(CODE, 'create')) return notify(denyTip(CODE, 'create'), 'danger')
  notify('참여불가회원으로 등록했습니다 — SP-PRT-100D에서 관리합니다(미리보기).', 'success')
}

/* --- 정지철회 ---------------------------------------------------------------- */
function withdrawSuspend() {
  if (!can(CODE, 'status')) return notify(denyTip(CODE, 'status'), 'danger')
  if (!item.value?.matched) return
  item.value.matched.sts = '610'
  item.value.report = '2'
  notify('소명을 받아들여 이용정지를 철회했습니다.', 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead title="부정행위 모니터링 상세(조치)" />
    <template v-if="!item"><div class="ws-empty"><p>적발 건을 찾을 수 없습니다.</p></div></template>
    <template v-else>
      <section class="ws-sec"><WsStepTrack :steps="STEPS" :current="stepIdx" label="처리 절차" /></section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">적발 대상자</h2></div>
        <table v-if="item.matched" class="ws-tb ws-tb--view">
          <tbody>
            <tr><th scope="row">이름</th><td>{{ item.matched.name }}</td><th scope="row">소속기업</th><td>{{ item.matched.company }}</td></tr>
            <tr><th scope="row">생년월일</th><td><WsMasked :value="item.matched.birth" kind="birth" label="생년월일" /></td><th scope="row">현재 참여 상태</th><td><span class="ws-badge" :class="item.matched.sts === '710' ? 'ws-badge--danger' : 'ws-badge--success'">{{ item.matched.sts === '710' ? '이용정지' : '참여개시' }}</span></td></tr>
            <tr><th scope="row">휴대전화</th><td><WsMasked :value="item.matched.phone" kind="phone" label="대상자 휴대전화" /></td><th scope="row">잔여포인트</th><td>{{ item.matched.point.toLocaleString('ko-KR') }}P</td></tr>
            <tr><th scope="row">기업 담당자</th><td colspan="3"><WsMasked :value="item.matched.managerPhone" kind="phone" label="기업 담당자 연락처" /> · {{ item.matched.managerEmail }}</td></tr>
          </tbody>
        </table>
        <p v-else class="ws-desc">아직 참여 노동자로 특정되지 않았다 — 이용정지 · 참여불가회원 등록 버튼이 꺼져 있다.</p>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">게시글</h2></div>
        <table class="ws-tb ws-tb--view">
          <tbody>
            <tr><th scope="row">등록일</th><td>{{ item.regAt }}</td><th scope="row">거래사이트</th><td>{{ item.site }}</td></tr>
            <tr><th scope="row">아이디</th><td>{{ item.nick }}</td><th scope="row">게시 후 포인트 이용여부</th><td>{{ USED_AFTER.find((x) => x.code === item!.usedAfter)?.label }}</td></tr>
            <tr><th scope="row">연락처</th><td><WsMasked :value="item.phone" kind="phone" label="게시글 연락처" /></td><th scope="row">이메일</th><td><WsMasked :value="item.email" kind="email" label="게시글 이메일" /></td></tr>
            <tr><th scope="row">글제목</th><td colspan="3">{{ item.title }}</td></tr>
            <tr><th scope="row">글내용</th><td colspan="3">{{ item.body }}</td></tr>
            <tr><th scope="row">게시글 주소</th><td colspan="3"><a href="#" class="ws-link" @click.prevent="notify('원문 링크(미리보기)')">원문 보기 ↗</a><span v-if="item.deleted" class="ws-desc"> — 이미 삭제된 원문이라 첨부 캡처를 증빙으로 본다</span></td></tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">처리 정보</h2></div>
        <table class="ws-tb">
          <tbody>
            <tr>
              <th scope="row"><label for="d-report">소명서 제출여부</label></th>
              <td><Select v-model="report" input-id="d-report" :options="REPORT.map((r) => ({ l: r.label, v: r.code }))" option-label="l" option-value="v" fluid /></td>
              <th scope="row"><label for="d-del">게시글 삭제여부</label></th>
              <td><Select v-model="deleted" input-id="d-del" :options="[{ l: 'O', v: true }, { l: '—', v: false }]" option-label="l" option-value="v" fluid /></td>
            </tr>
            <tr>
              <th scope="row"><label for="d-handle" class="ws-req">조치여부</label></th>
              <td colspan="3"><Select v-model="handle" input-id="d-handle" :options="HANDLE.map((h) => ({ l: h.label, v: h.code }))" option-label="l" option-value="v" fluid style="max-width: 200px" /></td>
            </tr>
            <tr>
              <th scope="row"><label for="d-action" :class="{ 'ws-req': handle === '3' }">조치내용</label></th>
              <td colspan="3"><Textarea id="d-action" v-model="action" rows="3" fluid placeholder="조치 경과를 적는다. 조치불가는 사유 필수" /></td>
            </tr>
            <tr v-if="item.actionAt"><th scope="row">조치 완료일</th><td colspan="3">{{ item.actionAt }} · {{ item.actionBy }}</td></tr>
          </tbody>
        </table>
        <div class="ws-actions">
          <SbCan action="status"><Button label="조치 저장" :disabled="!dirty" @click="saveAction" /></SbCan>
        </div>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">이용정지 · 제재</h2></div>
        <div class="ws-actions">
          <template v-if="item.matched?.sts === '710'">
            <SbCan action="status"><Button label="정지철회(소명 수용)" severity="secondary" outlined @click="withdrawSuspend" /></SbCan>
          </template>
          <template v-else>
            <SbCan action="status"><Button label="이용정지" severity="danger" outlined :disabled="!item.matched" @click="suspendOpen = true" /></SbCan>
            <SbCan action="create"><Button label="참여불가회원 등록" :disabled="!item.matched" @click="blockOpen = true" /></SbCan>
          </template>
        </div>
      </section>
    </template>

    <Dialog v-model:visible="suspendOpen" modal header="이용정지 사유 선택" :style="{ width: '440px' }" :draggable="false">
      <fieldset style="display:grid; gap:8px; margin:0; padding:0; border:0">
        <legend class="ws-req">이용정지 사유</legend>
        <div v-for="s in SUSPEND_REASONS" :key="s" class="ws-radio"><RadioButton v-model="suspendReason" :input-id="`sr-${s}`" name="sr" :value="s" /><label :for="`sr-${s}`">{{ s }}</label></div>
      </fieldset>
      <InputText v-if="suspendReason === '기타'" v-model="suspendEtc" fluid maxlength="200" placeholder="기타 사유(200자)" style="margin-top:8px" />
      <p class="ad__notice" style="margin-top:12px"><b>대외 통지</b>이용정지(협약파기) 안내 LMS · Email이 발송됩니다.</p>
      <template #footer><SbCode code="SP-OPS-060D-M1" /><Button label="취소" severity="secondary" outlined @click="suspendOpen = false" /><Button label="이용정지" severity="danger" @click="() => { doSuspend(); suspendOpen = false }" /></template>
    </Dialog>

    <Dialog v-model:visible="blockOpen" modal header="참여불가회원 등록" :style="{ width: '440px' }" :draggable="false">
      <table class="ws-tb ws-tb--view">
        <tbody>
          <tr><th scope="row">적발경로</th><td>스크래핑(고정)</td></tr>
          <tr><th scope="row">참여불가 사유</th><td>부정행위 적발(포인트 재판매 의심)</td></tr>
          <tr><th scope="row">적발일</th><td>{{ item?.regAt }}(게시글 등록일)</td></tr>
          <tr><th scope="row">적용일</th><td>오늘</td></tr>
          <tr><th scope="row">참여불가기간 만료일</th><td>적용일 + 3년(기본값)</td></tr>
        </tbody>
      </table>
      <template #footer><SbCode code="SP-OPS-060D-M2" /><Button label="취소" severity="secondary" outlined @click="blockOpen = false" /><Button label="등록" @click="() => { doBlock(); blockOpen = false }" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.ws-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.ad__notice { display: flex; gap: 8px; padding: 10px 12px; border-radius: var(--ws-radius); background: var(--ws-surface-info); color: var(--ws-text); line-height: 1.5; }
.ad__notice b { flex: none; color: var(--ws-text-link); }
</style>
