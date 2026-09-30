<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-030D 자주 하는 질문 상세(등록/수정) — 명세 src/specs/SP-OPS-030D.json */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsUpload from '../../ws/WsUpload.vue'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { faqOf, faqs, FAQ_CATEGORY, type Faq } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-030D'
const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.query.id === 'new')
const item = ref<Faq | null>(null)

const category = ref(''); const question = ref(''); const answer = ref(''); const display = ref<'전시' | '미전시'>('미전시')
const file = ref<File | null>(null)

function load() {
  const id = String(route.query.id ?? '')
  item.value = isNew.value ? null : faqOf(id) ?? null
  category.value = item.value?.category ?? ''
  question.value = item.value?.question ?? ''
  answer.value = item.value?.answer ?? ''
  display.value = item.value?.display ?? '미전시'
}
watch(() => route.query.id, load, { immediate: true })

const canDisplay = computed(() => can(CODE, 'config'))
const delOpen = ref(false)

function save() {
  if (!category.value || !question.value.trim() || !answer.value.trim()) return notify('질문 분류 · 질문 · 답변을 모두 입력하세요.', 'danger')
  if (question.value.length > 200) return notify('질문은 200자 이내로 입력하세요.', 'danger')
  const disp = canDisplay.value ? display.value : '미전시'
  if (item.value) {
    Object.assign(item.value, { category: category.value, question: question.value.trim(), answer: answer.value.trim(), display: disp })
    notify('FAQ를 수정했습니다.', 'success')
  } else {
    const order = faqs.filter((f) => f.category === category.value).length + 1
    faqs.push({ id: `FQ-NEW-${Date.now()}`, no: 0, category: category.value, question: question.value.trim(), answer: answer.value.trim(), display: disp, order, writer: '지금 계정', createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) })
    notify('FAQ를 등록했습니다.', 'success')
  }
  router.push(routeOf('SP-OPS-030L'))
}
function doDelete() {
  if (!item.value) return
  const i = faqs.findIndex((f) => f.id === item.value!.id)
  if (i >= 0) faqs.splice(i, 1)
  notify('FAQ를 삭제했습니다 — 누리집 노출이 내려갑니다.', 'success')
  router.push(routeOf('SP-OPS-030L'))
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? 'FAQ 등록' : 'FAQ 수정'" />
    <section class="ws-sec">
      <table class="ws-tb">
        <tbody>
          <tr>
            <th scope="row"><label for="f-cat" class="ws-req">질문 분류</label></th>
            <td><Select v-model="category" input-id="f-cat" :options="FAQ_CATEGORY.map((t) => ({ l: t, v: t }))" option-label="l" option-value="v" placeholder="분류를 고르세요" fluid /></td>
          </tr>
          <tr>
            <th scope="row"><label for="f-q" class="ws-req">질문</label></th>
            <td><InputText id="f-q" v-model="question" fluid maxlength="200" placeholder="질문 (200자 이내)" /></td>
          </tr>
          <tr>
            <th scope="row"><label for="f-a" class="ws-req">답변</label></th>
            <td><Textarea id="f-a" v-model="answer" rows="8" fluid placeholder="답변 내용(에디터 자리 — 목업은 텍스트로 대체)" /></td>
          </tr>
          <tr>
            <th scope="row"><label for="f-file">첨부</label></th>
            <td><WsUpload id="f-file" v-model="file" /></td>
          </tr>
          <tr>
            <th scope="row"><label for="f-disp">전시상태</label></th>
            <td>
              <SbCan action="config">
                <Select v-model="display" input-id="f-disp" :options="[{ l: '전시', v: '전시' }, { l: '미전시', v: '미전시' }]" option-label="l" option-value="v" fluid />
              </SbCan>
              <p v-if="!canDisplay" class="ws-desc">설정 권한이 없어 미전시로만 저장됩니다.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <div class="ws-actions">
      <SbCan v-if="item" action="delete"><Button label="삭제" severity="danger" outlined @click="delOpen = true" /></SbCan>
      <Button label="취소" severity="secondary" outlined @click="router.back()" />
      <SbCan :action="item ? 'update' : 'create'"><Button label="저장" @click="save" /></SbCan>
    </div>
    <WsActionDialog v-model:visible="delOpen" code="SP-OPS-030D-M1" header="FAQ 삭제 확인" :target="item ? `${item.question} — 지금 ${item.display}` : ''" warn="삭제하면 누리집 노출이 즉시 내려갑니다." confirm-label="삭제" danger @confirm="doDelete" />
  </div>
</template>

<style scoped>
.ws-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
