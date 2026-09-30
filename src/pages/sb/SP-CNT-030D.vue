<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CNT-030D 배너관리 배너등록/수정. 위치는 목록 탭에서 넘겨받는다(query.position). SNS 링크는 모바일 이미지를 받지 않는다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import DatePicker from 'primevue/datepicker'
import PageHead from '../../app/PageHead.vue'
import WsUpload from '../../ws/WsUpload.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import { fmtDate, parseDate } from '../../ws/period'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BANNERS, BANNER_POSITIONS, BANNER_SIZE, SNS_CHANNELS, TINTS, bannerPhase, type BannerPosition, type CntBanner } from '@fixtures/sb/B7'

const CODE = 'SP-CNT-030D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => !route.query.id)
const source = computed(() => BANNERS.find((b) => b.id === String(route.query.id ?? '')))
const startPos = () => (BANNER_POSITIONS.includes(route.query.position as BannerPosition) ? (route.query.position as BannerPosition) : '메인 비주얼')
const blank = (): CntBanner => ({
  id: '', position: startPos(), order: 0, name: '', tint: TINTS[0], altText: '', linkUrl: '', linkTarget: '같은 창',
  startDate: '', endDate: '', displayStatus: '미전시', registrant: '나(미리보기)', registeredAt: '',
})
const form = ref<CntBanner>(source.value ? structuredClone(source.value) : blank())
const range = ref<[Date | null, Date | null]>(source.value ? [parseDate(source.value.startDate), parseDate(source.value.endDate)] : [new Date(), null])
const pcFile = ref<File | null>(null); const pcErr = ref<string | null>(null)
const mobFile = ref<File | null>(null); const mobErr = ref<string | null>(null)
watch(() => route.query.id, () => {
  form.value = source.value ? structuredClone(source.value) : blank()
  range.value = source.value ? [parseDate(source.value.startDate), parseDate(source.value.endDate)] : [new Date(), null]
  pcFile.value = null; mobFile.value = null
})

const isSns = computed(() => form.value.position === 'SNS 링크')
const size = computed(() => BANNER_SIZE[form.value.position])
const canWrite = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update')))
const canConfig = computed(() => can(CODE, 'config'))
watch(canConfig, (ok) => { if (!ok) form.value.displayStatus = '미전시' }, { immediate: true })

const touched = ref(false)
const errors = computed(() => ({
  name: !form.value.name.trim() ? '배너명을 입력하세요.' : '',
  channel: isSns.value && !form.value.channel ? 'SNS 채널을 고르세요.' : '',
  pc: !pcFile.value && !isNew.value ? '' : !pcFile.value ? 'PC 이미지를 첨부하세요.' : '',
  alt: !form.value.altText.trim() ? '이미지 설명을 입력하세요.' : '',
  link: form.value.linkUrl && !/^https?:\/\//.test(form.value.linkUrl) ? 'http:// 또는 https://로 시작해야 합니다.' : '',
  range: !range.value[0] || !range.value[1] ? '전시기간을 입력하세요.' : range.value[0] > range.value[1] ? '시작일이 종료일보다 늦습니다.' : '',
}))

function requestSave() {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  commit()
}
function commit() {
  const now = new Date().toLocaleString('ko-KR')
  form.value.startDate = fmtDate(range.value[0]); form.value.endDate = fmtDate(range.value[1])
  if (isNew.value) {
    form.value.id = `BN-${String(BANNERS.length + 1).padStart(4, '0')}`
    form.value.order = BANNERS.filter((b) => b.position === form.value.position).length + 1
    form.value.registeredAt = now
    BANNERS.push(structuredClone(form.value))
    notify(`'${form.value.name}'을(를) 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: form.value.id } })
    return
  }
  Object.assign(source.value!, structuredClone(form.value))
  notify('저장했습니다.', 'success')
}

const deleteOpen = ref(false)
function doDelete() {
  const i = BANNERS.findIndex((b) => b.id === source.value?.id)
  if (i >= 0) BANNERS.splice(i, 1)
  notify('배너를 삭제했습니다.', 'success')
  router.push(routeOf('SP-CNT-030L'))
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '배너 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l"><h2 class="ws-tit__h">{{ isNew ? `${form.position} 배너 등록` : form.name }}</h2><span v-if="!isNew" class="ws-desc">{{ form.id }} · {{ bannerPhase(form) }}</span></div>
      <div class="ws-tit__r">
        <SbCan v-if="!isNew" action="delete"><Button label="삭제" severity="danger" outlined @click="deleteOpen = true" /></SbCan>
        <SbCan :action="isNew ? 'create' : 'update'"><Button :label="isNew ? '등록' : '저장'" severity="contrast" @click="requestSave" /></SbCan>
      </div>
    </div>
    <p v-if="!canWrite" class="ws-desc">{{ denyTip(CODE, isNew ? 'create' : 'update') }}</p>

    <fieldset :disabled="!canWrite" style="border: 0; margin: 0; padding: 0">
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req">배너 위치</th>
            <td><Select v-model="form.position" :options="BANNER_POSITIONS" style="width: 160px" :disabled="!isNew" /></td>
          </tr>
          <tr v-if="isSns">
            <th scope="row" class="req">SNS 채널</th>
            <td><Select v-model="form.channel" :options="SNS_CHANNELS" style="width: 200px" :invalid="touched && !!errors.channel" /></td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="bn-name">배너명</label></th>
            <td><InputText id="bn-name" v-model="form.name" fluid maxlength="60" :invalid="touched && !!errors.name" /><span v-if="touched && errors.name" class="ws-err">{{ errors.name }}</span></td>
          </tr>
          <tr>
            <th scope="row" class="req">PC 이미지</th>
            <td><WsUpload id="bn-pc" v-model="pcFile" :accept="['jpg', 'png']" :max-kb="1024" :size="size" @invalid="pcErr = $event" /><span v-if="touched && errors.pc && !pcErr" class="ws-err">{{ errors.pc }}</span></td>
          </tr>
          <tr v-if="!isSns">
            <th scope="row">모바일 이미지</th>
            <td><WsUpload id="bn-mob" v-model="mobFile" :accept="['jpg', 'png']" :max-kb="1024" @invalid="mobErr = $event" /><span class="ws-desc">없으면 PC 이미지를 줄여 쓴다.</span></td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="bn-alt">대체 텍스트</label></th>
            <td><InputText id="bn-alt" v-model="form.altText" fluid maxlength="100" :invalid="touched && !!errors.alt" /><span v-if="touched && errors.alt" class="ws-err">{{ errors.alt }}</span></td>
          </tr>
          <tr>
            <th scope="row">링크</th>
            <td>
              <InputText v-model="form.linkUrl" fluid maxlength="500" placeholder="https://" :invalid="touched && !!errors.link" />
              <div class="ws-choices" role="radiogroup" aria-label="링크 열기 방식" style="margin-top: 6px">
                <div v-for="v in ['같은 창', '새 창'] as const" :key="v" class="ws-radio"><RadioButton v-model="form.linkTarget" :input-id="`bn-tg-${v}`" name="bn-tg" :value="v" /><label :for="`bn-tg-${v}`">{{ v }}</label></div>
              </div>
              <span v-if="touched && errors.link" class="ws-err">{{ errors.link }}</span>
            </td>
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
      v-model:visible="deleteOpen" code="SP-CNT-030D-M1" header="배너 삭제 확인"
      :target="`${form.name} · ${form.position} · ${bannerPhase(form)} · ${form.displayStatus}`"
      :warn="bannerPhase(form) === '진행중' && form.displayStatus === '전시' ? '노출 중입니다 — 삭제하면 누리집 메인에서 바로 내려갑니다. 같은 위치의 뒤 순서가 한 칸씩 당겨집니다.' : '같은 위치의 뒤 순서가 한 칸씩 당겨집니다.'"
      danger confirm-label="삭제" @confirm="doDelete"
    />
  </div>
</template>
