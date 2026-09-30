<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-040D 공지사항 상세(등록/수정) — 명세 src/specs/SP-OPS-040D.json */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import { notify } from '../../ws/notify'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsUpload from '../../ws/WsUpload.vue'
import SbCan from '../../sb/SbCan.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { noticeOf, notices, type Notice, type NoticeKind } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-040D'
const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.query.id === 'new')
const item = ref<Notice | null>(null)

const NOTICE_KIND: NoticeKind[] = ['공통공지', '사용자공지', '기업공지']
const NOTICE_TYPE = ['사업공지', '이벤트공지', '서비스이용공지']

const kind = ref<NoticeKind>('공통공지'); const type = ref(''); const title = ref(''); const content = ref('')
const pinned = ref(false); const from = ref<Date | null>(null); const to = ref<Date | null>(null); const display = ref<'전시' | '미전시'>('미전시')
const file = ref<File | null>(null)

function load() {
  const id = String(route.query.id ?? '')
  item.value = isNew.value ? null : noticeOf(id) ?? null
  kind.value = item.value?.kind ?? '공통공지'
  type.value = item.value?.type ?? ''
  title.value = item.value?.title ?? ''
  content.value = item.value?.content ?? ''
  pinned.value = item.value?.pinned ?? false
  display.value = item.value?.display ?? '미전시'
  from.value = item.value ? new Date(item.value.from) : null
  to.value = item.value ? new Date(item.value.to) : null
}
watch(() => route.query.id, load, { immediate: true })

const canDisplay = computed(() => can(CODE, 'config'))
const delOpen = ref(false)
const publishOpen = ref(false)
const ymd = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

function validate() {
  if (!kind.value || !type.value || !title.value.trim() || !content.value.trim()) { notify('공지구분 · 공지유형 · 제목 · 본문을 모두 입력하세요.', 'danger'); return false }
  if (title.value.length > 100) { notify('제목은 100자 이내로 입력하세요.', 'danger'); return false }
  return true
}
function saveDraft() {
  if (!validate()) return
  persist(canDisplay.value ? display.value : '미전시')
}
function persist(disp: '전시' | '미전시') {
  const fromS = from.value ? ymd(from.value) : '', toS = to.value ? ymd(to.value) : ''
  if (item.value) {
    Object.assign(item.value, { kind: kind.value, type: type.value, title: title.value.trim(), content: content.value.trim(), pinned: pinned.value, display: disp, from: fromS, to: toS, updater: '지금 계정' })
    notify('공지를 수정했습니다.', 'success')
  } else {
    notices.unshift({ id: `NT-NEW-${Date.now()}`, no: notices.length + 1, kind: kind.value, type: type.value, title: title.value.trim(), content: content.value.trim(), hasAttach: !!file.value, display: disp, pinned: pinned.value, from: fromS, to: toS, views: 0, writer: '지금 계정', updater: '', createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ') })
    notify('공지를 등록했습니다.', 'success')
  }
  router.push(routeOf('SP-OPS-040L'))
}
function doPublish() { persist('전시') }
function doDelete() {
  if (!item.value) return
  const i = notices.findIndex((n) => n.id === item.value!.id)
  if (i >= 0) notices.splice(i, 1)
  notify('공지를 삭제했습니다 — 모든 출력처에서 즉시 내려갑니다.', 'success')
  router.push(routeOf('SP-OPS-040L'))
}
const outlets = computed(() => (kind.value === '공통공지' ? '누리집 + 기업 어드민' : kind.value === '사용자공지' ? '누리집' : '기업 어드민'))
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '공지사항 등록' : '공지사항 상세'" />
    <section class="ws-sec">
      <table class="ws-tb">
        <tbody>
          <tr>
            <th scope="row"><label for="n-kind" class="ws-req">공지구분</label></th>
            <td><Select v-model="kind" input-id="n-kind" :options="NOTICE_KIND.map((t) => ({ l: t, v: t }))" option-label="l" option-value="v" fluid /></td>
            <th scope="row"><label for="n-type" class="ws-req">공지유형</label></th>
            <td><Select v-model="type" input-id="n-type" :options="NOTICE_TYPE.map((t) => ({ l: t, v: t }))" option-label="l" option-value="v" placeholder="고르세요" fluid /></td>
          </tr>
          <tr><th scope="row"><label for="n-title" class="ws-req">제목</label></th><td colspan="3"><InputText id="n-title" v-model="title" fluid maxlength="100" placeholder="제목 (100자 이내)" /></td></tr>
          <tr><th scope="row"><label for="n-body" class="ws-req">본문</label></th><td colspan="3"><Textarea id="n-body" v-model="content" rows="8" fluid placeholder="본문(에디터 자리 — 목업은 텍스트로 대체)" /></td></tr>
          <tr><th scope="row"><label for="n-file">첨부</label></th><td colspan="3"><WsUpload id="n-file" v-model="file" :max-kb="5120" :accept="['jpg', 'png', 'pdf']" /></td></tr>
          <tr>
            <th scope="row"><label for="n-from">전시기간</label></th>
            <td colspan="3">
              <SbCan action="config">
                <span style="display:flex; gap:8px; align-items:center">
                  <DatePicker v-model="from" input-id="n-from" date-format="yy.mm.dd" show-icon icon-display="input" placeholder="시작일" />
                  ~
                  <DatePicker v-model="to" date-format="yy.mm.dd" show-icon icon-display="input" placeholder="종료일" />
                  <label style="display:flex; gap:4px; align-items:center"><Checkbox v-model="pinned" binary input-id="n-pin" />상단 고정</label>
                </span>
              </SbCan>
            </td>
          </tr>
          <tr v-if="item">
            <th scope="row">조회 정보</th>
            <td colspan="3" class="ws-desc">등록자 {{ item.writer }} · 등록일 {{ item.createdAt }} · 조회수 {{ item.views.toLocaleString('ko-KR') }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!canDisplay" class="ws-desc" style="margin-top:8px">설정 권한이 없어 미전시로만 저장됩니다.</p>
    </section>
    <div class="ws-actions">
      <SbCan v-if="item" action="delete"><Button label="삭제" severity="danger" outlined @click="delOpen = true" /></SbCan>
      <Button label="취소" severity="secondary" outlined @click="router.back()" />
      <SbCan :action="item ? 'update' : 'create'"><Button label="저장(미전시)" severity="secondary" outlined @click="saveDraft" /></SbCan>
      <SbCan action="config"><Button label="게시(전시)" @click="publishOpen = true" /></SbCan>
    </div>
    <WsActionDialog v-model:visible="delOpen" code="SP-OPS-040D-M1" header="공지 삭제 확인" :target="item ? `${item.title} — ${item.kind} · ${item.display}` : ''" warn="삭제하면 모든 출력처에서 즉시 내려갑니다." confirm-label="삭제" danger @confirm="doDelete" />
    <WsActionDialog v-model:visible="publishOpen" code="SP-OPS-040D-M2" header="공지 게시 확인" :target="`출력처: ${outlets}`" :notice="`전시기간: ${from ? ymd(from) : '즉시'} ~ ${to ? ymd(to) : '별도 종료 없음'}${pinned ? ' · 상단 고정' : ''}`" confirm-label="게시" @confirm="doPublish" />
  </div>
</template>

<style scoped>
.ws-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
