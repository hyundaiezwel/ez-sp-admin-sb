<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PRT-010D 신청상세 — 신청목록(SP-PRT-010L)에서 고른 신청 건 하나의 심사를 마무리한다.
 * 정상접수 · 보완요청은 담당자가, 선정완료 · 반려는 총괄 이상이 확인 모달(M1)을 거쳐 처리한다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsFileView from '../../ws/WsFileView.vue'
import WsMasked from '../../ws/WsMasked.vue'
import { notify } from '../../ws/notify'
import { statusHtml } from '../../sp/status'
import { STATES, stateOf, bizLabel } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BIZ } from '../../sp/codes'
import { applications, type SbApplication } from '@fixtures/sb/common'

const CODE = 'SP-PRT-010D'
const route = useRoute()
const router = useRouter()
const labelOf = (c: string) => stateOf(c)?.label ?? c

const current = ref<SbApplication | null>(null)
function load(id: string) {
  for (const b of BIZ) {
    const hit = applications(b.code).find((a) => a.id === id)
    if (hit) { current.value = hit; return }
  }
  current.value = null
}
watch(() => route.query.id, (id) => load(String(id ?? '')), { immediate: true })

/* --- 필수 서류 판정(미리보기용) ------------------------------------------- */
const REQUIRED_DOCS = ['재직증빙', '사업자등록증', '개인정보 수집이용 동의서']
/** 신청번호 끝자리가 홀수면 재직증빙 누락으로 지어낸다(미리보기 시연용) */
const missingDocs = computed(() => (Number(current.value?.applyNo.slice(-1)) % 2 === 1 ? ['재직증빙'] : []))
const docs = computed(() => REQUIRED_DOCS.map((name) => ({ name, kind: 'PDF', size: '482KB', missing: missingDocs.value.includes(name) })))
const ocr = computed(() => [
  { field: '기업명', app: current.value?.name ?? '', ocr: current.value?.name ?? '', match: true },
  { field: '사업자등록번호', app: current.value?.bizNo ?? '', ocr: current.value?.bizNo ?? '', match: true },
  { field: '대표자명', app: '김*수', ocr: '김이수', match: false },
])

/* --- 상태 변경(M1) --------------------------------------------------------- */
const TARGETS: Record<string, string[]> = { '110': ['120', '130', '139'], '120': ['220', '130', '139'], '130': ['120', '139'] }
const ACTION_LABEL: Record<string, string> = { '120': '정상접수', '130': '보완요청', '139': '반려', '220': '선정완료' }
const NEEDS_APPROVE = new Set(['220', '139'])
const changeOpen = ref(false)
const options = computed(() => {
  const all = TARGETS[current.value?.sts ?? ''] ?? []
  return all.map((c) => ({ code: c, label: ACTION_LABEL[c], ok: !NEEDS_APPROVE.has(c) || can(CODE, 'approve') }))
})
function doChange(p: ActionPayload) {
  const c = current.value
  if (!c || !p.option) return
  const to = Object.keys(ACTION_LABEL).find((k) => ACTION_LABEL[k] === p.option)
  if (!to) return
  if (to === '220' && c.sts !== '120') return notify('정상접수 뒤에만 선정완료할 수 있습니다.', 'danger')
  if (to === '220' && missingDocs.value.length) return notify(`필수 서류 누락: ${missingDocs.value.join(', ')}`, 'danger')
  if ((to === '130' || to === '139') && p.text.trim().length < 5) return notify(`${to === '130' ? '보완' : '반려'} 사유를 5자 이상 입력하세요.`, 'danger')
  c.sts = to
  c.lastAt = current.value!.lastAt
  notify(`${c.name} — ${labelOf(to)}(으)로 바꿨습니다 · 기업 담당자에게 안내가 발송됩니다`, 'success')
}

/* --- 정보 수정 사유(M2) ----------------------------------------------------- */
const editOpen = ref(false)
const editReason = ref('')
const editable = computed(() => !!current.value && !['220', '139'].includes(current.value.sts))
function saveEdit() {
  if (editReason.value.trim().length < 5) return notify('수정 사유를 5자 이상 입력하세요.', 'danger')
  notify('신청정보를 수정했습니다.', 'success')
  editOpen.value = false
  editReason.value = ''
}

/* --- 서류 미리보기(M3) · 다운로드 사유(M4) ---------------------------------- */
const fileOpen = ref(false)

/* --- 관리자 메모 ------------------------------------------------------------ */
interface Memo { id: string; at: string; by: string; text: string }
const memos = ref<Memo[]>([])
const memoText = ref('')
function addMemo() {
  if (!memoText.value.trim()) return
  memos.value.unshift({ id: `M${memos.value.length + 1}`, at: '2026.09.20 14:02', by: '김*수', text: memoText.value.trim() })
  memoText.value = ''
  notify('메모를 등록했습니다.', 'success')
}

/* --- 처리이력(미리보기 고정 이력 + 상태변경 반영) ---------------------------- */
const history = computed(() => {
  const c = current.value
  if (!c) return []
  const base = [{ at: c.appliedAt, by: '(시스템)', from: '', to: '110', action: '신청 접수' }]
  if (c.sts !== '110') base.push({ at: c.lastAt, by: '박*영', from: '110', to: c.sts, action: labelOf(c.sts) })
  return base
})
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="current">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ current.name }}</h2>
            <span v-html="statusHtml(current.sts)" />
            <span class="ws-desc">신청번호 {{ current.applyNo }} · 최종처리 {{ current.lastAt }} · {{ bizLabel(current.biz) }}</span>
          </div>
          <div class="ws-tit__r">
            <SbCan action="status"><Button label="상태 변경" @click="changeOpen = true" /></SbCan>
          </div>
        </div>

        <div class="ws-form">
          <div class="ws-form__row"><span class="ws-form__l">기업구분</span><span>{{ current.coFg }}</span></div>
          <div class="ws-form__row"><span class="ws-form__l">사업자등록번호</span><span>{{ current.bizNo }}</span></div>
          <div class="ws-form__row"><span class="ws-form__l">담당자명</span><span>{{ current.manager.slice(0, 1) }}*{{ current.manager.slice(-1) }}</span></div>
          <div class="ws-form__row">
            <span class="ws-form__l">담당자 연락처</span>
            <SbCan action="download-pii"><WsMasked :value="current.phone" kind="phone" label="담당자 연락처" /></SbCan>
          </div>
          <div class="ws-form__row"><span class="ws-form__l">신청 인원</span><span>4명</span></div>
          <div class="ws-form__row"><span class="ws-form__l">참여경로</span><span>온라인 신청</span></div>
        </div>
        <SbCan action="update"><Button label="신청정보 수정" severity="secondary" outlined size="small" :disabled="!editable" @click="editOpen = true" /></SbCan>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">제출 서류 · OCR 대조</h2></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">서류</th><th scope="col">상태</th><th scope="col"></th></tr></thead>
          <tbody>
            <tr v-for="d in docs" :key="d.name">
              <td>{{ d.name }}</td>
              <td><span :class="d.missing ? 'ws-badge ws-badge--danger' : 'ws-badge ws-badge--success'">{{ d.missing ? '누락' : '제출' }}</span></td>
              <td><Button v-if="!d.missing" label="미리보기" size="small" severity="secondary" text @click="fileOpen = true" /></td>
            </tr>
          </tbody>
        </table>
        <table class="ws-gtb" style="margin-top: 12px">
          <caption class="ws-desc" style="caption-side: top; text-align: left; padding-bottom: 4px">OCR 판독 대조(참고 표시)</caption>
          <thead><tr><th scope="col">항목</th><th scope="col">신청서 값</th><th scope="col">OCR 판독 값</th><th scope="col">일치</th></tr></thead>
          <tbody>
            <tr v-for="o in ocr" :key="o.field">
              <td>{{ o.field }}</td><td>{{ o.app }}</td><td>{{ o.ocr }}</td>
              <td><span :class="o.match ? 'ws-badge ws-badge--success' : 'ws-badge ws-badge--warning'">{{ o.match ? '일치' : '불일치' }}</span></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">관리자 메모</h2></div>
        <SbCan action="create">
          <div class="ws-form__row" style="gap: 8px">
            <InputText v-model="memoText" fluid maxlength="200" placeholder="내부 메모 (200자 이내)" @keyup.enter="addMemo" />
            <Button label="등록" @click="addMemo" />
          </div>
        </SbCan>
        <ul class="ws-list" style="margin-top: 8px">
          <li v-for="m in memos" :key="m.id" class="ws-desc">{{ m.at }} · {{ m.by }} — {{ m.text }}</li>
          <li v-if="!memos.length" class="ws-desc">등록된 메모가 없습니다.</li>
        </ul>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">처리이력</h2></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">일시</th><th scope="col">처리자</th><th scope="col">처리</th></tr></thead>
          <tbody>
            <tr v-for="(h, i) in history" :key="i">
              <td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.action }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="ws-msg">
        <p class="ws-msg__tit">안내</p>
        <ul>
          <li>선정완료 · 반려는 <b>approve</b>(총괄 이상) 권한이 있어야 확정할 수 있다. 담당자는 정상접수 · 보완요청까지다.</li>
          <li><router-link :to="routeOf('SP-PRT-010L')">신청목록으로 돌아가기</router-link></li>
        </ul>
      </div>
    </template>
    <div v-else class="ws-empty">
      <p>id가 없습니다 — 신청목록에서 행을 눌러 들어와 주세요.</p>
      <Button label="신청목록으로" severity="secondary" outlined @click="router.push(routeOf('SP-PRT-010L'))" />
    </div>

    <WsActionDialog
      v-model:visible="changeOpen" code="SP-PRT-010D-M1" header="신청 상태 변경"
      :target="current ? `${current.name} (${current.applyNo}) — 지금 ${labelOf(current.sts)}` : ''"
      :reason="{ label: '처리', options: options.filter((o) => o.ok).map((o) => o.label) }"
      notice="정상접수 · 선정완료를 제외한 처리는 기업 담당자에게 LMS 및 E-Mail이 발송됩니다."
      confirm-label="확정" @confirm="doChange"
    >
      <p v-if="missingDocs.length" class="ws-err" role="alert">필수 서류 누락: {{ missingDocs.join(', ') }} — 정상접수 · 선정완료를 막습니다.</p>
      <label for="d-why" class="ws-desc">보완 · 반려 사유 — 해당 처리를 고르면 필수(5자 이상)</label>
      <Textarea id="d-why" v-model="editReason" rows="3" fluid maxlength="500" placeholder="예: 재직증빙 서류 재제출 필요" />
      <p v-if="options.some((o) => !o.ok)" class="ws-desc">{{ denyTip(CODE, 'approve') }} — 선정완료 · 반려가 보이지 않습니다.</p>
    </WsActionDialog>

    <WsActionDialog
      v-model:visible="editOpen" code="SP-PRT-010D-M2" header="신청정보 수정 사유"
      :target="current ? `${current.name} (${current.applyNo})` : ''"
      confirm-label="저장" @confirm="saveEdit"
    >
      <label for="e-why" class="ws-req">수정 사유 (5~200자)</label>
      <Textarea id="e-why" v-model="editReason" rows="3" fluid maxlength="200" />
    </WsActionDialog>

    <WsFileView v-model:visible="fileOpen" title="제출 서류 미리보기" :files="docs.filter((d) => !d.missing).map((d) => ({ name: d.name, kind: d.kind, size: d.size }))" />
    <SbCode code="SP-PRT-010D-M3" style="display: none" />
    <SbCode code="SP-PRT-010D-M4" style="display: none" />
  </div>
</template>
