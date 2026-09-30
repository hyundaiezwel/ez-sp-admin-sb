<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-050D 부정행위 신고 상세(조회 및 답변) — 명세 src/specs/SP-OPS-050D.json */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsMasked from '../../ws/WsMasked.vue'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { fraudReportOf, type FraudReport } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-050D'
const route = useRoute()
const router = useRouter()
const item = ref<FraudReport | null>(null)
watch(() => route.query.id, () => { item.value = fraudReportOf(String(route.query.id ?? '')) ?? null }, { immediate: true })

const answer = ref('')
const memo = ref('')
watch(item, (v) => { answer.value = v?.answer ?? ''; memo.value = v?.memo ?? '' }, { immediate: true })

const mailOpen = ref(false)
const mailMode = ref<'최초' | '재발송'>('최초')
function openSend(mode: '최초' | '재발송') {
  if (!answer.value.trim()) return notify('답변 내용을 입력하세요.', 'danger')
  mailMode.value = mode
  mailOpen.value = true
}
function doSend() {
  if (!item.value) return
  item.value.answer = answer.value.trim()
  const ok = Math.random() > 0.1
  item.value.sendResult = ok ? '성공' : '실패'
  if (mailMode.value === '최초') { item.value.ansSts = '답변완료'; item.value.answeredAt = new Date().toISOString().slice(0, 16).replace('T', ' ') }
  notify(ok ? '회신 메일을 보냈습니다.' : '발송에 실패했습니다 — 답변은 저장됐습니다.', ok ? 'success' : 'danger')
}
function saveMemo() {
  if (!can(CODE, 'status')) return notify(denyTip(CODE, 'status'), 'danger')
  if (item.value) { item.value.memo = memo.value.trim(); notify('내부 처리 메모를 저장했습니다.', 'success') }
}
function toBlock() {
  if (!can(CODE, 'create')) return notify(denyTip(CODE, 'create'), 'danger')
  router.push({ path: routeOf('SP-PRT-100D'), query: { id: 'new', source: item.value?.id ?? '', route: '기타' } })
}
</script>

<template>
  <div class="ws-page">
    <PageHead title="부정행위 신고 상세" />
    <template v-if="!item"><div class="ws-empty"><p>신고를 찾을 수 없습니다.</p></div></template>
    <template v-else>
      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">신고 정보</h2></div>
        <table class="ws-tb ws-tb--view">
          <tbody>
            <tr><th scope="row">신고번호</th><td>{{ item.id }}</td><th scope="row">등록일</th><td>{{ item.regAt }}</td></tr>
            <tr><th scope="row">제목</th><td colspan="3">{{ item.title }}</td></tr>
            <tr><th scope="row">신고자 이메일</th><td><WsMasked :value="item.email" kind="email" label="신고자 이메일" /></td><th scope="row">첨부</th><td>{{ item.hasAttach ? '증빙.pdf' : '없음' }}</td></tr>
            <tr><th scope="row">신고내용</th><td colspan="3">{{ item.content }}</td></tr>
            <tr><th scope="row">답변상태</th><td colspan="3"><span class="ws-badge" :class="{ 'ws-badge--warning': item.ansSts === '미답변' }">{{ item.ansSts }}</span><span v-if="item.sendResult === '실패'" class="ws-badge ws-badge--danger" style="margin-left:6px">발송실패</span></td></tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">답변</h2></div>
        <SbCan action="create"><Textarea v-model="answer" rows="6" fluid placeholder="답변 내용을 입력하세요" /></SbCan>
        <div class="ws-actions">
          <SbCan action="send" v-if="item.ansSts === '미답변'"><Button label="답변 저장 · 발송" @click="openSend('최초')" /></SbCan>
          <template v-else>
            <SbCan action="status"><Button label="답변 수정" severity="secondary" outlined @click="() => { item!.answer = answer.trim(); notify('답변을 수정했습니다.', 'success') }" /></SbCan>
            <SbCan action="send"><Button label="재발송" @click="openSend('재발송')" /></SbCan>
          </template>
        </div>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">내부 처리 메모 <span class="ws-desc">(신고자에게 보내지 않는다)</span></h2></div>
        <SbCan action="status"><Textarea v-model="memo" rows="3" fluid placeholder="내부 처리 경과" /></SbCan>
        <div class="ws-actions"><SbCan action="status"><Button label="메모 저장" severity="secondary" outlined @click="saveMemo" /></SbCan></div>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">참여불가 등록 연결</h2></div>
        <p class="ws-desc">신고 대상이 참여 노동자로 특정되면 참여불가회원 등록으로 이어 간다. 등록 권한은 SP-PRT-100D를 따른다.</p>
        <div class="ws-actions"><SbCan action="create"><Button label="참여불가회원 등록으로 이동" severity="secondary" outlined @click="toBlock" /></SbCan></div>
      </section>
    </template>

    <WsActionDialog
      v-model:visible="mailOpen" code="SP-OPS-050D-M1" :header="`회신 메일 발송 확인(${mailMode})`"
      :target="item ? `수신 ${item.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')} — ${mailMode}` : ''"
      notice="신고 시 입력한 메일 주소로 답변 내용이 발송됩니다."
      confirm-label="발송" @confirm="doSend"
    >
      <p class="ws-desc">본문 미리보기: {{ answer.slice(0, 60) }}{{ answer.length > 60 ? '…' : '' }}</p>
    </WsActionDialog>
  </div>
</template>

<style scoped>
.ws-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
