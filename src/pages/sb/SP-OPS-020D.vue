<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-020D 누리집 문의 상세(조회 및 답변) — 명세 src/specs/SP-OPS-020D.json */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsMasked from '../../ws/WsMasked.vue'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { webInquiryOf, type WebInquiry } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-020D'
const route = useRoute()
const item = ref<WebInquiry | null>(null)
watch(() => route.query.id, () => { item.value = webInquiryOf(String(route.query.id ?? '')) ?? null }, { immediate: true })

const answer = ref('')
watch(item, (v) => { answer.value = v?.answer ?? '' }, { immediate: true })

const mailOpen = ref(false)
const mailMode = ref<'최초' | '재발송'>('최초')
function openSend(mode: '최초' | '재발송') {
  if (!can(CODE, 'send')) return notify(denyTip(CODE, 'send'), 'danger')
  if (!answer.value.trim()) return notify('답변 내용을 입력하세요.', 'danger')
  const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.value?.email ?? '')
  if (!okEmail) { item.value!.answer = answer.value.trim(); return notify('이메일 형식이 올바르지 않아 답변만 저장했습니다. 발송하지 않았습니다.', 'warning') }
  mailMode.value = mode
  mailOpen.value = true
}
function doSend() {
  if (!item.value) return
  item.value.answer = answer.value.trim()
  const ok = Math.random() > 0.12
  item.value.sendResult = ok ? '성공' : '실패'
  if (mailMode.value === '최초') {
    item.value.ansSts = '답변완료'
    item.value.answerer = '지금 계정'
    item.value.answeredAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
  notify(ok ? '회신 메일을 보냈습니다.' : '회신 메일 발송에 실패했습니다 — 답변은 저장됐습니다. 재발송할 수 있습니다.', ok ? 'success' : 'danger')
}
</script>

<template>
  <div class="ws-page">
    <PageHead title="누리집 문의 상세" />
    <template v-if="!item"><div class="ws-empty"><p>문의를 찾을 수 없습니다.</p></div></template>
    <template v-else>
      <section class="ws-sec">
        <div class="ws-tit"><h2 class="ws-tit__h">문의 정보</h2></div>
        <table class="ws-tb ws-tb--view">
          <tbody>
            <tr><th scope="row">문의번호</th><td>{{ item.id }}</td><th scope="row">문의유형</th><td>{{ item.type }}</td></tr>
            <tr><th scope="row">제목</th><td colspan="3">{{ item.title }}</td></tr>
            <tr><th scope="row">문의자</th><td>{{ item.name }}</td><th scope="row">접수일시</th><td>{{ item.receivedAt }}</td></tr>
            <tr><th scope="row">이메일</th><td>{{ item.email }}</td><th scope="row">연락처</th><td><WsMasked :value="item.phone" kind="phone" label="문의자 연락처" /></td></tr>
            <tr><th scope="row">문의내용</th><td colspan="3">{{ item.content }}</td></tr>
            <tr><th scope="row">첨부</th><td colspan="3">{{ item.hasAttach ? '문의첨부.pdf' : '없음' }}</td></tr>
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
            <SbCan action="update"><Button label="답변 수정" severity="secondary" outlined @click="() => { item!.answer = answer.trim(); notify('답변을 수정했습니다.', 'success') }" /></SbCan>
            <SbCan action="send"><Button label="재발송" @click="openSend('재발송')" /></SbCan>
          </template>
        </div>
        <p v-if="item.answeredAt" class="ws-desc">최종 답변 — {{ item.answerer }} · {{ item.answeredAt }}</p>
      </section>
    </template>

    <WsActionDialog
      v-model:visible="mailOpen" code="SP-OPS-020D-M1" :header="`회신 메일 발송 확인(${mailMode})`"
      :target="item ? `수신 ${item.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')} — ${mailMode}` : ''"
      notice="접수 시 입력한 메일 주소로 답변 내용이 발송됩니다."
      confirm-label="발송" @confirm="doSend"
    >
      <p class="ws-desc">본문 미리보기: {{ answer.slice(0, 60) }}{{ answer.length > 60 ? '…' : '' }}</p>
    </WsActionDialog>
  </div>
</template>

<style scoped>
.ws-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
