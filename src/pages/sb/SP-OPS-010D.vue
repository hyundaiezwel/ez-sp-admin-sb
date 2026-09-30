<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-010D 업무요청 상세(조회 및 답변) — 명세 src/specs/SP-OPS-010D.json */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { opsRequestOf, type OpsRequest } from '@fixtures/sb/B6'
import { COMPANIES } from '@fixtures/sb/common'

const CODE = 'SP-OPS-010D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => route.query.id === 'new')
const item = ref<OpsRequest | null>(null)
const newCompany = ref<string>('')

function load() {
  if (isNew.value) { item.value = null; newCompany.value = ''; return }
  const id = String(route.query.id ?? '')
  item.value = opsRequestOf(id) ?? null
}
watch(() => route.query.id, load, { immediate: true })

/* --- 답변 등록 · 수정 ----------------------------------------------------- */
const answer = ref('')
watch(item, (v) => { answer.value = v?.cycles.at(-1)?.ans ?? '' }, { immediate: true })
const canAnswerMore = computed(() => !!item.value && item.value.cycles.length < 5)

function saveAnswer() {
  if (!item.value) return
  if (!answer.value.trim()) return notify('답변 내용을 입력하세요.', 'danger')
  const now = new Date()
  const stamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  item.value.cycles.push({ req: '(추가 요청 — 미리보기)', reqAt: stamp, ans: answer.value.trim(), ansAt: stamp, answerer: '지금 계정' })
  item.value.answerer = '지금 계정'
  item.value.answeredAt = stamp
  item.value.lastBy = '지금 계정'
  item.value.lastAt = stamp
  item.value.sts = '처리완료'
  notify('답변을 저장했습니다 — 요청상태가 처리완료로 바뀌었습니다.', 'success')
}
function startWork() {
  if (!item.value) return
  item.value.sts = '처리중'
  notify('요청상태를 처리중으로 바꿨습니다.', 'success')
}

/* --- 요청상태 변경(M1) ----------------------------------------------------- */
const stsOpen = ref(false)
const STS_TARGETS: Record<string, string[]> = { '접수': ['처리중', '처리완료'], '처리중': ['처리완료', '접수'], '처리완료': ['접수'] }
const stsOptions = computed(() => STS_TARGETS[item.value?.sts ?? ''] ?? [])
function doSts(p: ActionPayload) {
  if (!item.value || !p.option) return
  item.value.sts = p.option as any
  notify(`요청상태를 ${p.option}(으)로 바꿨습니다.`, 'success')
}

/* --- 담당 이관(M2) ---------------------------------------------------------- */
const transferOpen = ref(false)
function doTransfer(p: ActionPayload) {
  if (!item.value) return
  item.value.transferTo = p.option ?? ''
  item.value.transferReason = p.text
  notify(`${p.option}에게 이관했습니다.`, 'success')
}
const TRANSFER_TARGETS = ['지원기관 담당자 A', '지원기관 담당자 B', '운영사 CS팀']

function saveNew() {
  if (!can(CODE, 'create')) return notify(denyTip(CODE, 'create'), 'danger')
  if (!newCompany.value) return notify('대리 등록할 기업을 고르세요.', 'danger')
  notify('업무요청을 접수 상태로 대리 등록했습니다(미리보기).', 'success')
  router.push(routeOf('SP-OPS-010L'))
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '업무요청 대리 등록' : '업무요청 상세'" />

    <template v-if="isNew">
      <section class="ws-sec">
        <table class="ws-tb">
          <tbody>
            <tr>
              <th scope="row"><label for="n-co" class="ws-req">기업</label></th>
              <td><Select v-model="newCompany" input-id="n-co" :options="COMPANIES.map((c) => ({ l: c.name, v: c.id }))" option-label="l" option-value="v" filter placeholder="기업을 고르세요" fluid /></td>
            </tr>
          </tbody>
        </table>
        <p class="ws-desc">초기 상태는 접수로 고정된다. 요청자 칸에는 대리 등록한 계정이 함께 남는다.</p>
      </section>
      <div class="ws-actions"><Button label="취소" severity="secondary" outlined @click="router.back()" /><SbCan action="create"><Button label="등록" @click="saveNew" /></SbCan></div>
    </template>

    <template v-else-if="!item">
      <div class="ws-empty"><p>업무요청을 찾을 수 없습니다.</p></div>
    </template>

    <template v-else>
      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">요청 정보</h2></div>
        <table class="ws-tb ws-tb--view">
          <tbody>
            <tr><th scope="row">요청번호</th><td>{{ item.id }}</td><th scope="row">요청상태</th><td><span class="ws-badge" :class="{ 'ws-badge--warning': item.sts === '접수', 'ws-badge--info': item.sts === '처리중' }">{{ item.sts }}</span></td></tr>
            <tr><th scope="row">요청유형</th><td>{{ item.type }}</td><th scope="row">요청일시</th><td>{{ item.requestedAt }}</td></tr>
            <tr><th scope="row">제목</th><td colspan="3">{{ item.title }}</td></tr>
            <tr><th scope="row">요청자</th><td>{{ item.requester }}({{ item.company }})</td><th scope="row">회신메일</th><td>{{ item.replyEmail }}</td></tr>
            <tr><th scope="row">요청내용</th><td colspan="3">{{ item.content }}</td></tr>
            <tr><th scope="row">첨부파일</th><td colspan="3">{{ item.hasAttach ? '요청서.pdf' : '없음' }}</td></tr>
          </tbody>
        </table>
        <p class="ws-desc" style="margin-top: 8px">요청 본문이나 첨부에 개인정보가 들어 있을 수 있습니다 — 답변에 재게재하지 않도록 주의하세요.</p>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">요청 · 답변 타임라인 <span class="ws-desc">({{ item.cycles.length }}/5 사이클)</span></h2></div>
        <ol class="tl">
          <li v-for="(c, i) in item.cycles" :key="i" class="tl__i">
            <p class="tl__req"><b>요청</b>{{ c.req }}<small>{{ c.reqAt }}</small></p>
            <p class="tl__ans"><b>답변({{ c.answerer }})</b>{{ c.ans }}<small>{{ c.ansAt }}</small></p>
          </li>
          <li v-if="!item.cycles.length" class="ws-desc">아직 답변이 없습니다.</li>
        </ol>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">답변 등록 · 수정</h2></div>
          <div class="ws-tit__r">
            <SbCan action="status"><Button v-if="item.sts === '접수'" label="처리중으로" severity="secondary" outlined @click="startWork" /></SbCan>
            <SbCan action="status"><Button label="요청상태 변경" severity="secondary" outlined @click="stsOpen = true" /></SbCan>
            <SbCan action="status"><Button label="담당 이관" severity="secondary" outlined @click="transferOpen = true" /></SbCan>
          </div>
        </div>
        <SbCan action="update">
          <Textarea v-model="answer" rows="6" fluid :disabled="!canAnswerMore" placeholder="답변 내용을 입력하세요" />
        </SbCan>
        <p v-if="!canAnswerMore" class="ws-err">5사이클을 모두 썼습니다 — 새 업무요청으로 등록해 주세요.</p>
        <div class="ws-actions">
          <SbCan action="update"><Button label="답변 저장" :disabled="!canAnswerMore" @click="saveAnswer" /></SbCan>
        </div>
        <p v-if="item.transferTo" class="ws-desc">최근 이관 — {{ item.transferTo }} · {{ item.transferReason }}</p>
      </section>
    </template>

    <WsActionDialog v-model:visible="stsOpen" code="SP-OPS-010D-M1" header="요청상태 변경" :target="item ? `${item.id} — 지금 ${item.sts}` : ''" :reason="{ label: '변경할 상태', options: stsOptions }" confirm-label="변경" @confirm="doSts" />
    <WsActionDialog v-model:visible="transferOpen" code="SP-OPS-010D-M2" header="담당 이관" :target="item ? item.id : ''" :reason="{ label: '이관 대상 계정', options: TRANSFER_TARGETS }" confirm-label="이관" @confirm="doTransfer">
      <p class="ws-desc">이관 사유는 위 칸(직접 입력 시)에 200자까지 남는다.</p>
    </WsActionDialog>
  </div>
</template>

<style scoped>
.ws-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.tl { display: grid; gap: 12px; }
.tl__i { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.tl__req, .tl__ans { display: flex; gap: 8px; align-items: baseline; }
.tl__req b, .tl__ans b { flex: none; color: var(--ws-text-sub); }
.tl__req small, .tl__ans small { margin-left: auto; color: var(--ws-text-muted); }
</style>
