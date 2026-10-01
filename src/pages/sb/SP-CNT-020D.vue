<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CNT-020D 팝업관리 팝업 상세(등록/수정). 유형에 따라 위치 · 크기 입력을 켜고 끈다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import WsUpload from '../../ws/WsUpload.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import { fmtDate, parseDate } from '../../ws/period'
import { notify } from '../../ws/notify'
import SbCode from '../../sb/SbCode.vue'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { POPUPS, popupPhase, type CntPopup } from '@fixtures/sb/B7'

const CODE = 'SP-CNT-020D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => !route.query.id)
const source = computed(() => POPUPS.find((p) => p.id === String(route.query.id ?? '')))
const blank = (): CntPopup => ({
  id: '', type: '레이어팝업', name: '', page: '메인', content: '', width: 400, posX: 40, posY: 120,
  rank: 1, linkUrl: '', startDate: '', endDate: '', displayStatus: '미전시', hideToday: false, hideDays: 0,
  registrant: '나(미리보기)', registeredAt: '',
})
const form = ref<CntPopup>(source.value ? structuredClone(source.value) : blank())
const range = ref<[Date | null, Date | null]>(source.value ? [parseDate(source.value.startDate), parseDate(source.value.endDate)] : [new Date(), null])
const file = ref<File | null>(null)
const fileErr = ref<string | null>(null)
watch(() => route.query.id, () => {
  form.value = source.value ? structuredClone(source.value) : blank()
  range.value = source.value ? [parseDate(source.value.startDate), parseDate(source.value.endDate)] : [new Date(), null]
  file.value = null
})

const canWrite = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update')))
const canConfig = computed(() => can(CODE, 'config'))
watch(canConfig, (ok) => { if (!ok) form.value.displayStatus = '미전시' }, { immediate: true })

const touched = ref(false)
const errors = computed(() => ({
  name: !form.value.name.trim() ? '팝업명을 입력하세요.' : '',
  page: !form.value.page.trim() ? '노출 페이지를 입력하세요.' : '',
  content: !file.value && !form.value.imageFile && !form.value.content.trim() ? '이미지 또는 내용을 입력하세요.' : '',
  range: !range.value[0] || !range.value[1] ? '전시기간을 입력하세요.' : range.value[0] > range.value[1] ? '시작일이 종료일보다 늦습니다.' : '',
  link: form.value.linkUrl && !/^https?:\/\//.test(form.value.linkUrl) ? 'http:// 또는 https://로 시작해야 합니다.' : '',
}))

function requestSave() {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  commit()
}
function commit() {
  const now = new Date().toLocaleString('ko-KR')
  form.value.startDate = fmtDate(range.value[0]); form.value.endDate = fmtDate(range.value[1])
  if (file.value) form.value.imageFile = file.value.name
  if (isNew.value) {
    form.value.id = `POP-${String(POPUPS.length + 1).padStart(4, '0')}`
    form.value.registeredAt = now
    POPUPS.push(structuredClone(form.value))
    notify(`'${form.value.name}'을(를) 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: form.value.id } })
    return
  }
  Object.assign(source.value!, structuredClone(form.value))
  notify('저장했습니다.', 'success')
}

const deleteOpen = ref(false)
function doDelete() {
  const i = POPUPS.findIndex((p) => p.id === source.value?.id)
  if (i >= 0) POPUPS.splice(i, 1)
  notify('팝업을 삭제했습니다.', 'success')
  router.push(routeOf('SP-CNT-020L'))
}
const previewOpen = ref(false)
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '팝업 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l"><h2 class="ws-tit__h">{{ isNew ? '새 팝업 등록' : form.name }}</h2><span v-if="!isNew" class="ws-desc">{{ form.id }} · {{ popupPhase(form) }}</span></div>
      <div class="ws-tit__r">
        <Button severity="secondary" outlined label="미리보기" @click="previewOpen = true" />
        <SbCan v-if="!isNew" action="delete"><Button label="삭제" severity="danger" outlined @click="deleteOpen = true" /></SbCan>
        <SbCan :action="isNew ? 'create' : 'update'"><Button :label="isNew ? '등록' : '저장'" severity="contrast" @click="requestSave" /></SbCan>
      </div>
    </div>
    <p v-if="!canWrite" class="ws-desc">{{ denyTip(CODE, isNew ? 'create' : 'update') }}</p>

    <fieldset :disabled="!canWrite" style="border: 0; margin: 0; padding: 0">
      <table class="ws-tb">
        <colgroup><col style="width: 156px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req">팝업 유형</th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-label="팝업 유형">
                <div v-for="v in ['상단배너', '레이어팝업'] as const" :key="v" class="ws-radio"><RadioButton v-model="form.type" :input-id="`p-t-${v}`" name="p-ty" :value="v" /><label :for="`p-t-${v}`">{{ v }}</label></div>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="p-name">팝업명</label></th>
            <td><InputText id="p-name" v-model="form.name" fluid maxlength="60" :invalid="touched && !!errors.name" /><span v-if="touched && errors.name" class="ws-err">{{ errors.name }}</span></td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="p-page">노출 페이지</label></th>
            <td><InputText id="p-page" v-model="form.page" fluid maxlength="500" :invalid="touched && !!errors.page" /><span v-if="touched && errors.page" class="ws-err">{{ errors.page }}</span></td>
          </tr>
          <tr>
            <th scope="row" class="req">이미지 · 내용</th>
            <td>
              <WsUpload id="p-img" v-model="file" :accept="['jpg', 'png']" :max-kb="1024" @invalid="fileErr = $event" />
              <p v-if="!file && form.imageFile" class="ws-desc">지금 이미지: {{ form.imageFile }}</p>
              <Textarea v-model="form.content" rows="2" fluid maxlength="300" placeholder="이미지 없이 글자만 보일 때 쓴다" style="margin-top: 6px" />
              <span v-if="touched && errors.content && !fileErr" class="ws-err">{{ errors.content }}</span>
            </td>
          </tr>
          <tr v-if="form.type === '레이어팝업'">
            <th scope="row">가로 크기 · 위치 X · Y</th>
            <td>
              <InputNumber v-model="form.width" :min="0" :max="9999" style="width: 100px" aria-label="가로 크기" />
              <InputNumber v-model="form.posX" :min="0" :max="9999" style="width: 100px; margin-left: 8px" aria-label="위치 X" />
              <InputNumber v-model="form.posY" :min="0" :max="9999" style="width: 100px; margin-left: 8px" aria-label="위치 Y" />
            </td>
          </tr>
          <tr>
            <th scope="row">노출 순위</th>
            <td><InputNumber v-model="form.rank" :min="1" :max="99" style="width: 90px" /></td>
          </tr>
          <tr>
            <th scope="row">링크 주소</th>
            <td><InputText v-model="form.linkUrl" fluid maxlength="500" placeholder="https://" :invalid="touched && !!errors.link" /><span v-if="touched && errors.link" class="ws-err">{{ errors.link }}</span></td>
          </tr>
          <tr>
            <th scope="row" class="req">전시기간</th>
            <td>
              <div style="display: flex; align-items: center; gap: 6px">
                <DatePicker v-model="range[0]" date-format="yy.mm.dd" placeholder="시작" show-icon icon-display="input" :invalid="touched && !!errors.range" aria-label="전시 시작일" />
                <span aria-hidden="true">~</span>
                <DatePicker v-model="range[1]" date-format="yy.mm.dd" placeholder="종료" show-icon icon-display="input" :invalid="touched && !!errors.range" aria-label="전시 종료일" />
              </div>
              <span v-if="touched && errors.range" class="ws-err">{{ errors.range }}</span>
              <p class="ws-desc">저장하면 진행상태 = {{ popupPhase({ startDate: fmtDate(range[0]) || '9999.99.99', endDate: fmtDate(range[1]) || '0000.00.00' }) }}(계산값)</p>
            </td>
          </tr>
          <tr>
            <th scope="row">오늘 하루 보지 않기</th>
            <td>
              <ToggleSwitch v-model="form.hideToday" aria-label="오늘 하루 보지 않기 사용" />
              <InputNumber v-if="form.hideToday" v-model="form.hideDays" :min="1" :max="9999" suffix="일" style="width: 100px; margin-left: 8px" aria-label="다시 보이지 않을 일수" />
            </td>
          </tr>
          <tr>
            <th scope="row">전시상태</th>
            <td>
              <SbCan action="config"><Select v-model="form.displayStatus" :options="['전시', '미전시']" style="width: 140px" /></SbCan>
              <span v-if="!canConfig" class="ws-desc">설정 권한이 없어 미전시로만 저장됩니다.</span>
            </td>
          </tr>
        </tbody>
      </table>
    </fieldset>

    <WsActionDialog
      v-model:visible="deleteOpen" code="SP-CNT-020D-M1" header="팝업 삭제 확인"
      :target="`${form.name} · ${form.type} · ${popupPhase(form)} · ${form.displayStatus}`"
      :warn="popupPhase(form) === '진행중' && form.displayStatus === '전시' ? '노출 중입니다 — 삭제하면 누리집에서 바로 내려갑니다.' : undefined"
      danger confirm-label="삭제" @confirm="doDelete"
    />

    <Dialog v-model:visible="previewOpen" modal header="팝업 미리보기" :style="{ width: '420px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 8px">입력 중인 값으로 그린다 — 저장하지 않는다.</p>
      <div class="pv" :style="form.type === '레이어팝업' ? { width: (form.width ?? 300) + 'px' } : {}">
        <b>{{ form.name || '(팝업명 없음)' }}</b>
        <p class="ws-desc">{{ form.page }} · {{ form.type }}{{ form.type === '레이어팝업' ? ` · (${form.posX},${form.posY})` : '' }}</p>
        <p v-if="form.content">{{ form.content }}</p>
      </div>
      <template #footer><SbCode code="SP-CNT-020D-M2" /><Button label="닫기" severity="secondary" outlined @click="previewOpen = false" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.pv { padding: 16px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius); background: var(--ws-surface); }
</style>
