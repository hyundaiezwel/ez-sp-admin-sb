<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-BIZ-040D 동반성장 협력사업관리 동반성장기업 상세 — 기본정보 · 지원기업 · 지원현황 · 담당자 · 변경이력 탭.
 * M1 지원기업 연계, M2 연계 해제, M3 기관 포인트 사용기한 변경(복지몰 반영 요청 흉내).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Checkbox from 'primevue/checkbox'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsMasked from '../../ws/WsMasked.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import { coFgLabel, stateOf } from '../../sp/codes'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { COMPANIES } from '@fixtures/sb/common'
import { PARTNERS, partnerOf, participantsOf, linkedElsewhere, type SbPartner, type HistoryEntry } from '@fixtures/sb/B2'

const CODE = 'SP-BIZ-040D'
const route = useRoute()
const router = useRouter()

const partner = computed<SbPartner | undefined>(() => partnerOf(String(route.query.id ?? '')))
const tab = ref(String(route.query.tab ?? 'basic'))
watch(() => route.query.id, () => { tab.value = String(route.query.tab ?? 'basic') })

/* --- 기본정보 수정 ----------------------------------------------------------- */
const editBasic = ref(false)
const basicForm = ref({ name: '', note: '' })
function startEditBasic() { if (!partner.value) return; basicForm.value = { name: partner.value.name, note: partner.value.note }; editBasic.value = true }
const basicConfirm = ref(false)
function requestSaveBasic() {
  if (!basicForm.value.name.trim()) return notify('기관명을 입력하세요.', 'danger')
  basicConfirm.value = true
}
function saveBasic(p: ActionPayload) {
  const t = partner.value!
  const changes = [] as { field: string; before: string; after: string }[]
  if (t.name !== basicForm.value.name) changes.push({ field: '기관명', before: t.name, after: basicForm.value.name })
  if (t.note !== basicForm.value.note) changes.push({ field: '비고', before: t.note || '—', after: basicForm.value.note || '—' })
  t.name = basicForm.value.name; t.note = basicForm.value.note
  t.updatedAt = new Date().toLocaleString('ko-KR')
  t.history.push({ id: `H-${t.id}-${t.history.length}`, at: t.updatedAt, by: '나(미리보기)', reason: p.text, changes })
  notify('기본정보를 저장했습니다.', 'success')
  editBasic.value = false; basicConfirm.value = false
}

/* --- 지원기업 연계(M1) ------------------------------------------------------- */
const linkOpen = ref(false)
const linkKw = ref('')
const linkChecked = ref<string[]>([])
const linkedIds = computed(() => new Set((partner.value?.links ?? []).filter((l) => !l.releasedAt).map((l) => l.companyId)))
const linkResults = computed(() => {
  const k = linkKw.value.trim()
  if (!k || !partner.value) return []
  return COMPANIES.filter((c) => c.name.includes(k) || c.bizNo.replace(/-/g, '').includes(k.replace(/-/g, ''))).slice(0, 20)
})
function elsewhereOf(companyId: string) { return partner.value ? linkedElsewhere(companyId, partner.value.id) : undefined }
function confirmLink() {
  const t = partner.value!
  const at = new Date().toLocaleString('ko-KR')
  linkChecked.value.forEach((id) => t.links.push({ companyId: id, linkedAt: at, linkedBy: '나(미리보기)' }))
  t.history.push({ id: `H-${t.id}-${t.history.length}`, at, by: '나(미리보기)', reason: '지원기업 연계', changes: linkChecked.value.map((id) => ({ field: '지원기업 연계', before: '—', after: COMPANIES.find((c) => c.id === id)?.name ?? id })) })
  notify(`${linkChecked.value.length}곳을 연계했습니다.`, 'success')
  linkChecked.value = []; linkKw.value = ''; linkOpen.value = false
}

/* --- 연계 해제(M2) ----------------------------------------------------------- */
const releaseOpen = ref(false)
const releaseTarget = ref<{ companyId: string; started: number } | null>(null)
function openRelease(companyId: string) {
  const p = participantsOf(partner.value!).find((x) => x.companyId === companyId)
  releaseTarget.value = { companyId, started: p?.started ?? 0 }
  releaseOpen.value = true
}
function confirmRelease(p: ActionPayload) {
  const t = partner.value!
  const link = t.links.find((l) => l.companyId === releaseTarget.value!.companyId && !l.releasedAt)
  if (!link) return
  link.releasedAt = new Date().toLocaleString('ko-KR'); link.releasedBy = '나(미리보기)'; link.releasedReason = p.text
  t.history.push({ id: `H-${t.id}-${t.history.length}`, at: link.releasedAt, by: '나(미리보기)', reason: p.text, changes: [{ field: '지원기업 연계 해제', before: COMPANIES.find((c) => c.id === link.companyId)?.name ?? link.companyId, after: '해제' }] })
  notify('연계를 해제했습니다.', 'success')
  releaseOpen.value = false
}

/* --- 기관 포인트 사용기한 변경(M3) -------------------------------------------- */
const deadlineOpen = ref(false)
const newDeadline = ref<Date | null>(null)
const deadlineReq = ref(false)
const deadlineFailed = ref(false)
const activeCount = computed(() => (partner.value ? participantsOf(partner.value).reduce((s, x) => s + x.started, 0) : 0))
function requestDeadline() {
  if (!newDeadline.value) return notify('새 사용기한을 선택하세요.', 'danger')
  if (newDeadline.value < new Date()) return notify('새 사용기한은 오늘 이후여야 합니다.', 'danger')
  deadlineReq.value = true
}
function confirmDeadline(p: ActionPayload) {
  const t = partner.value!
  deadlineReq.value = false
  const ok = !p.text.includes('실패')
  if (!ok) { deadlineFailed.value = true; notify('복지몰 반영 요청이 실패했습니다 — 사용기한을 바꾸지 않았습니다.', 'danger'); return }
  const before = t.pointDeadline
  const d = newDeadline.value!
  t.pointDeadline = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  t.updatedAt = new Date().toLocaleString('ko-KR')
  t.history.push({ id: `H-${t.id}-${t.history.length}`, at: t.updatedAt, by: '나(미리보기)', reason: p.text, changes: [{ field: '포인트 사용기한', before, after: t.pointDeadline }] })
  deadlineFailed.value = false
  notify(`복지몰 반영에 성공했습니다 — 사용기한 ${t.pointDeadline}.`, 'success')
  deadlineOpen.value = false
}

/* --- 담당자 등록 -------------------------------------------------------------- */
const mgrOpen = ref(false)
const mgrForm = ref({ name: '', phone: '', email: '' })
function saveMgr() {
  if (!mgrForm.value.name.trim()) return notify('담당자명을 입력하세요.', 'danger')
  const t = partner.value!
  t.managers.push({ id: `MG-${t.id}-${t.managers.length}`, name: mgrForm.value.name, phone: mgrForm.value.phone, email: mgrForm.value.email, status: '미등록' })
  notify('담당자를 등록했습니다 — 가입 안내 메일이 발송됩니다.', 'success')
  mgrOpen.value = false
}

const histOpen = ref(false)
const histCurrent = ref<HistoryEntry | null>(null)
function openHist(h: HistoryEntry) { histCurrent.value = h; histOpen.value = true }
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <QueryState :loading="false" :error="null" :empty="!partner" empty-text="동반성장기업을 찾을 수 없습니다.">
      <template v-if="partner">
        <div class="ws-tit" style="margin-bottom: 8px">
          <div class="ws-tit__l"><h2 class="ws-tit__h">{{ partner.name }}</h2><span class="ws-desc">{{ partner.bizNo }} · {{ partner.year }}년 · 포인트 사용기한 {{ partner.pointDeadline }}</span></div>
        </div>

        <Tabs v-model:value="tab">
          <TabList>
            <Tab value="basic">기본정보</Tab>
            <Tab value="companies">지원기업</Tab>
            <Tab value="status">지원현황</Tab>
            <Tab value="managers">담당자</Tab>
            <Tab value="hist">변경이력</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="basic">
              <table class="ws-tb">
                <colgroup><col style="width: 140px" /><col /></colgroup>
                <tbody>
                  <tr><th scope="row">기관명</th><td>{{ partner.name }}</td></tr>
                  <tr><th scope="row">사업자등록번호</th><td>{{ partner.bizNo }}</td></tr>
                  <tr><th scope="row">참여년도</th><td>{{ partner.year }}</td></tr>
                  <tr><th scope="row">포인트 사용기한</th>
                    <td>
                      {{ partner.pointDeadline }}
                      <SbCan action="config"><Button label="사용기한 변경" severity="secondary" outlined size="small" style="margin-left: 8px" @click="deadlineOpen = true; newDeadline = null" /></SbCan>
                    </td>
                  </tr>
                  <tr><th scope="row">비고</th><td>{{ partner.note || '—' }}</td></tr>
                </tbody>
              </table>
              <div style="margin-top: 12px"><SbCan action="update"><Button label="기본정보 수정" severity="secondary" outlined @click="startEditBasic" /></SbCan></div>
            </TabPanel>

            <TabPanel value="companies">
              <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">지원기업</h2><span class="ws-total">총<strong>{{ partner.links.filter((l) => !l.releasedAt).length }}</strong>곳</span></div>
                <div class="ws-tit__r"><SbCan action="create"><Button label="지원기업 연계" severity="contrast" @click="linkOpen = true" /></SbCan></div>
              </div>
              <table class="ws-gtb">
                <thead><tr><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">기업구분</th><th scope="col">참여 상태</th><th scope="col">연계일 · 연계자</th><th scope="col" /></tr></thead>
                <tbody>
                  <tr v-if="partner.links.filter((l) => !l.releasedAt).length === 0"><td colspan="6" class="ws-desc" style="text-align: center">연계된 지원기업이 없습니다.</td></tr>
                  <tr v-for="l in partner.links.filter((x) => !x.releasedAt)" :key="l.companyId">
                    <template v-if="COMPANIES.find((c) => c.id === l.companyId)">
                      <td>{{ COMPANIES.find((c) => c.id === l.companyId)!.name }}</td>
                      <td>{{ COMPANIES.find((c) => c.id === l.companyId)!.bizNo }}</td>
                      <td>{{ coFgLabel(COMPANIES.find((c) => c.id === l.companyId)!.coFg) }}</td>
                      <td>{{ stateOf(COMPANIES.find((c) => c.id === l.companyId)!.sts)?.label ?? '-' }}</td>
                      <td>{{ l.linkedAt }} · {{ l.linkedBy }}</td>
                      <td><SbCan action="delete"><Button label="연계 해제" severity="danger" outlined size="small" @click="openRelease(l.companyId)" /></SbCan></td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </TabPanel>

            <TabPanel value="status">
              <table class="ws-gtb">
                <thead><tr><th scope="col">지원기업</th><th scope="col">참가자(전체)</th><th scope="col">참가자(참여개시)</th></tr></thead>
                <tbody>
                  <tr v-if="participantsOf(partner).length === 0"><td colspan="3" class="ws-desc" style="text-align: center">지원현황이 없습니다.</td></tr>
                  <tr v-for="s in participantsOf(partner)" :key="s.companyId">
                    <td>{{ COMPANIES.find((c) => c.id === s.companyId)?.name }}</td>
                    <td class="ws-num"><a href="javascript:void(0)" @click="router.push({ path: routeOf('SP-PRT-030L'), query: { company: s.companyId } })">{{ s.total }}</a></td>
                    <td class="ws-num">{{ s.started }}</td>
                  </tr>
                </tbody>
                <tfoot><tr><th scope="row">합계</th><td class="ws-num">{{ participantsOf(partner).reduce((a, x) => a + x.total, 0) }}</td><td class="ws-num">{{ participantsOf(partner).reduce((a, x) => a + x.started, 0) }}</td></tr></tfoot>
              </table>
            </TabPanel>

            <TabPanel value="managers">
              <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">기관 담당자</h2></div><div class="ws-tit__r"><SbCan action="create"><Button label="담당자 등록" severity="secondary" outlined @click="mgrForm = { name: '', phone: '', email: '' }; mgrOpen = true" /></SbCan></div></div>
              <table class="ws-gtb">
                <thead><tr><th scope="col">이름</th><th scope="col">연락처</th><th scope="col">이메일</th><th scope="col">등록상태</th></tr></thead>
                <tbody>
                  <tr v-if="partner.managers.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">등록된 담당자가 없습니다.</td></tr>
                  <tr v-for="m in partner.managers" :key="m.id">
                    <td><WsMasked :value="m.name" kind="name" :label="`담당자 ${m.name}`" /></td>
                    <td><WsMasked :value="m.phone" kind="phone" label="담당자 연락처" /></td>
                    <td>{{ m.email }}</td>
                    <td>{{ m.status }}</td>
                  </tr>
                </tbody>
              </table>
            </TabPanel>

            <TabPanel value="hist">
              <table class="ws-gtb">
                <thead><tr><th scope="col">변경일시</th><th scope="col">변경자</th><th scope="col">사유</th><th scope="col">항목 수</th></tr></thead>
                <tbody>
                  <tr v-if="partner.history.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">이력이 없습니다.</td></tr>
                  <tr v-for="h in [...partner.history].reverse()" :key="h.id" style="cursor: pointer" @click="openHist(h)">
                    <td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.reason || '—' }}</td><td>{{ h.changes.length }}</td>
                  </tr>
                </tbody>
              </table>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <!-- 기본정보 수정 -->
        <Dialog v-model:visible="editBasic" modal header="기본정보 수정" :style="{ width: '440px' }" :draggable="false">
          <table class="ws-tb">
            <colgroup><col style="width: 100px" /><col /></colgroup>
            <tbody>
              <tr><th scope="row"><label for="bf-name">기관명</label></th><td><InputText id="bf-name" v-model="basicForm.name" fluid /></td></tr>
              <tr><th scope="row"><label for="bf-note">비고</label></th><td><InputText id="bf-note" v-model="basicForm.note" fluid /></td></tr>
            </tbody>
          </table>
          <template #footer><Button label="취소" severity="secondary" outlined @click="editBasic = false" /><Button label="저장" @click="requestSaveBasic" /></template>
        </Dialog>
        <WsActionDialog v-model:visible="basicConfirm" header="기본정보 변경 확인" :target="partner.name" :reason="{ label: '수정 사유', required: true, min: 5, max: 200 }" confirm-label="확정" @confirm="saveBasic" />

        <!-- M1 지원기업 연계 -->
        <Dialog v-model:visible="linkOpen" modal header="지원기업 연계" :style="{ width: '600px' }" :draggable="false">
          <InputText v-model="linkKw" fluid placeholder="사업자등록번호 또는 기업명" style="margin-bottom: 12px" />
          <table class="ws-gtb">
            <thead><tr><th scope="col" /><th scope="col">기업명</th><th scope="col">사업자등록번호</th><th scope="col">기업구분</th><th scope="col">올해 참여 상태</th><th scope="col">기존 연계 기관</th></tr></thead>
            <tbody>
              <tr v-if="linkKw && linkResults.length === 0"><td colspan="6" class="ws-desc" style="text-align: center">검색 결과가 없습니다.</td></tr>
              <tr v-for="c in linkResults" :key="c.id">
                <td><Checkbox v-model="linkChecked" :value="c.id" :input-id="`lk-${c.id}`" :disabled="linkedIds.has(c.id) || !!elsewhereOf(c.id)" /></td>
                <td><label :for="`lk-${c.id}`">{{ c.name }}</label></td><td>{{ c.bizNo }}</td><td>{{ coFgLabel(c.coFg) }}</td><td>{{ stateOf(c.sts)?.label ?? '-' }}</td>
                <td>
                  <span v-if="linkedIds.has(c.id)" class="ws-desc">이미 이 기관에 연계됨</span>
                  <span v-else-if="elsewhereOf(c.id)" class="ws-desc">이미 다른 동반성장기업에 연계된 기업입니다 — {{ elsewhereOf(c.id)!.name }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <template #footer>
            <SbCode code="SP-BIZ-040D-M1" />
            <Button label="취소" severity="secondary" outlined @click="linkOpen = false" />
            <Button label="연계" :disabled="linkChecked.length === 0" @click="confirmLink" />
          </template>
        </Dialog>

        <!-- M2 연계 해제 -->
        <WsActionDialog
          v-model:visible="releaseOpen" code="SP-BIZ-040D-M2" header="지원기업 연계 해제"
          :target="releaseTarget ? COMPANIES.find((c) => c.id === releaseTarget!.companyId)?.name : ''"
          :warn="releaseTarget && releaseTarget.started > 0 ? `참여개시 노동자 ${releaseTarget.started}명에게 영향을 줍니다.` : undefined"
          :reason="{ label: '해제 사유', required: true, min: 5, max: 200 }" danger confirm-label="해제" @confirm="confirmRelease"
        />

        <!-- M3 포인트 사용기한 변경 -->
        <Dialog v-model:visible="deadlineOpen" modal header="기관 포인트 사용기한 변경" :style="{ width: '440px' }" :draggable="false">
          <table class="ws-tb">
            <colgroup><col style="width: 120px" /><col /></colgroup>
            <tbody>
              <tr><th scope="row">현재 사용기한</th><td>{{ partner.pointDeadline }}</td></tr>
              <tr><th scope="row" class="req"><label for="dl-new">새 사용기한</label></th><td><DatePicker id="dl-new" v-model="newDeadline" date-format="yy.mm.dd" :min-date="new Date()" /></td></tr>
              <tr><th scope="row">영향 노동자</th><td>{{ activeCount }}명</td></tr>
            </tbody>
          </table>
          <p class="ws-desc" style="margin-top: 8px">사유에 '실패'를 넣으면 복지몰 반영 실패를 미리 볼 수 있다(미리보기 전용).</p>
          <template #footer>
            <SbCode code="SP-BIZ-040D-M3" />
            <Button label="취소" severity="secondary" outlined @click="deadlineOpen = false" />
            <Button label="변경 요청" @click="requestDeadline" />
          </template>
        </Dialog>
        <WsActionDialog
          v-model:visible="deadlineReq" header="사용기한 변경 확인" :target="`${partner.pointDeadline} → ${newDeadline?.toLocaleDateString('ko-KR')}`"
          :warn="`영향 노동자 ${activeCount}명`" :reason="{ label: '변경 사유', required: true, min: 5, max: 200 }"
          notice="복지몰에 사용기한 반영을 요청합니다. 성공한 뒤에만 화면 값이 바뀝니다." confirm-label="확정" @confirm="confirmDeadline"
        />

        <!-- 담당자 등록 -->
        <Dialog v-model:visible="mgrOpen" modal header="담당자 등록" :style="{ width: '400px' }" :draggable="false">
          <table class="ws-tb">
            <colgroup><col style="width: 90px" /><col /></colgroup>
            <tbody>
              <tr><th scope="row"><label for="mg-name">이름</label></th><td><InputText id="mg-name" v-model="mgrForm.name" fluid /></td></tr>
              <tr><th scope="row"><label for="mg-phone">연락처</label></th><td><InputText id="mg-phone" v-model="mgrForm.phone" fluid placeholder="010-0000-0000" /></td></tr>
              <tr><th scope="row"><label for="mg-email">이메일</label></th><td><InputText id="mg-email" v-model="mgrForm.email" fluid placeholder="example@example.com" /></td></tr>
            </tbody>
          </table>
          <template #footer><Button label="취소" severity="secondary" outlined @click="mgrOpen = false" /><Button label="등록" @click="saveMgr" /></template>
        </Dialog>

        <Dialog v-model:visible="histOpen" modal header="변경이력 상세" :style="{ width: '480px' }" :draggable="false">
          <div v-if="histCurrent">
            <p class="ws-desc" style="margin-bottom: 8px">{{ histCurrent.at }} · {{ histCurrent.by }} · {{ histCurrent.reason || '등록' }}</p>
            <table class="ws-gtb">
              <thead><tr><th scope="col">항목</th><th scope="col">변경 전</th><th scope="col">변경 후</th></tr></thead>
              <tbody>
                <tr v-if="histCurrent.changes.length === 0"><td colspan="3" class="ws-desc" style="text-align: center">비교 항목 없음</td></tr>
                <tr v-for="c in histCurrent.changes" :key="c.field"><td>{{ c.field }}</td><td>{{ c.before }}</td><td>{{ c.after }}</td></tr>
              </tbody>
            </table>
          </div>
          <template #footer><Button label="닫기" severity="secondary" outlined @click="histOpen = false" /></template>
        </Dialog>
      </template>
    </QueryState>
  </div>
</template>

<style scoped>
th.req::after { content: ' *'; color: var(--ws-text-danger); }
</style>
