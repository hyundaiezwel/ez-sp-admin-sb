<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CNT-010D 자료실 자료 상세(등록/수정). 본보기 SP-BIZ-010D를 따른다.
 * 저장 시 전시로 켜면 게시 확인(M2)을 거친다. 설정 권한이 없으면 전시상태는 미전시로 고정된다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import PageHead from '../../app/PageHead.vue'
import WsUpload from '../../ws/WsUpload.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { CNT_CATEGORIES, MATERIALS, type CntMaterial } from '@fixtures/sb/B7'

const CODE = 'SP-CNT-010D'
const route = useRoute()
const router = useRouter()

const isNew = computed(() => !route.query.id)
const source = computed(() => MATERIALS.find((m) => m.id === String(route.query.id ?? '')))
const blank = (): CntMaterial => ({
  id: '', order: MATERIALS.length + 1, category: '운영지침', title: '', format: '파일', desc: '',
  displayStatus: '미전시', registrant: '나(미리보기)', registeredAt: '', updatedAt: '', revisions: [],
})
const form = ref<CntMaterial>(source.value ? structuredClone(source.value) : blank())
const file = ref<File | null>(null)
const fileErr = ref<string | null>(null)
watch(() => route.query.id, () => { form.value = source.value ? structuredClone(source.value) : blank(); file.value = null; fileErr.value = null })

const canWrite = computed(() => (isNew.value ? can(CODE, 'create') : can(CODE, 'update')))
const canConfig = computed(() => can(CODE, 'config'))
/** 설정 권한이 없으면 전시로 저장할 수 없다 — 화면에서 전시 선택 자체를 막는다 */
watch(() => canConfig.value, (ok) => { if (!ok) form.value.displayStatus = '미전시' }, { immediate: true })

const touched = ref(false)
const errors = computed(() => ({
  title: !form.value.title.trim() ? '제목을 입력하세요.' : '',
  category: !form.value.category ? '자료 분류를 고르세요.' : '',
  attach: form.value.format === '파일'
    ? (!file.value && !form.value.fileName ? '파일을 첨부하거나 링크를 입력하세요.' : '')
    : (!form.value.linkUrl?.trim() ? '파일을 첨부하거나 링크를 입력하세요.' : !/^https?:\/\//.test(form.value.linkUrl) ? 'http:// 또는 https://로 시작해야 합니다.' : ''),
}))

/* --- 저장 · 게시 확인(M2) --------------------------------------------------- */
const publishOpen = ref(false)
function requestSave() {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  if (form.value.displayStatus === '전시' && canConfig.value) { publishOpen.value = true; return }
  commit()
}
function commit() {
  const now = new Date().toLocaleString('ko-KR')
  if (file.value) form.value.fileName = file.value.name
  if (isNew.value) {
    form.value.id = `MAT-${String(MATERIALS.length + 1).padStart(4, '0')}`
    form.value.registeredAt = now
    form.value.updatedAt = now
    MATERIALS.push(structuredClone(form.value))
    notify(`'${form.value.title}'을(를) 등록했습니다.`, 'success')
    router.replace({ path: routeOf(CODE), query: { id: form.value.id } })
    return
  }
  const s = source.value!
  if (file.value && s.displayStatus !== '미전시' && s.fileName) {
    s.revisions = [...s.revisions, { at: now, by: '나(미리보기)', fileName: s.fileName, memo: '파일 교체' }]
  }
  Object.assign(s, structuredClone(form.value), { revisions: s.revisions, updatedAt: now })
  notify('저장했습니다.', 'success')
  publishOpen.value = false
}

/* --- 삭제(M1) --------------------------------------------------------------- */
const deleteOpen = ref(false)
function doDelete() {
  const i = MATERIALS.findIndex((m) => m.id === source.value?.id)
  if (i >= 0) MATERIALS.splice(i, 1)
  notify('자료를 삭제했습니다 — 출력처에서 내려갔습니다.', 'success')
  router.push(routeOf('SP-CNT-010L'))
}
</script>

<template>
  <div class="ws-page">
    <PageHead :title="isNew ? '자료 등록' : undefined" />

    <div class="ws-tit" style="margin-bottom: 8px">
      <div class="ws-tit__l">
        <h2 class="ws-tit__h">{{ isNew ? '새 자료 등록' : form.title }}</h2>
        <span v-if="!isNew" class="ws-desc">{{ form.id }} · {{ form.category }}</span>
      </div>
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
            <th scope="row" class="req"><label for="d-title">제목</label></th>
            <td><InputText id="d-title" v-model="form.title" fluid maxlength="60" :invalid="touched && !!errors.title" /><span v-if="touched && errors.title" class="ws-err">{{ errors.title }}</span></td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="d-cat">자료 분류</label></th>
            <td><Select v-model="form.category" input-id="d-cat" :options="CNT_CATEGORIES" fluid :invalid="touched && !!errors.category" /></td>
          </tr>
          <tr>
            <th scope="row" class="req">자료 형식</th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-label="자료 형식">
                <div v-for="v in ['파일', '링크'] as const" :key="v" class="ws-radio">
                  <RadioButton v-model="form.format" :input-id="`d-f-${v}`" name="d-fmt" :value="v" @change="form.linkUrl = ''; form.fileName = undefined" />
                  <label :for="`d-f-${v}`">{{ v }}</label>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row" class="req">첨부 · 링크</th>
            <td>
              <template v-if="form.format === '파일'">
                <WsUpload id="d-file" v-model="file" :accept="['pdf', 'hwp', 'xlsx', 'jpg', 'png']" :max-kb="5120" @invalid="fileErr = $event" />
                <p v-if="!file && form.fileName" class="ws-desc">지금 파일: {{ form.fileName }}</p>
              </template>
              <InputText v-else v-model="form.linkUrl" fluid maxlength="500" placeholder="https://" :invalid="touched && !!errors.attach" />
              <span v-if="touched && errors.attach && !fileErr" class="ws-err">{{ errors.attach }}</span>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="d-desc">설명</label></th>
            <td><Textarea id="d-desc" v-model="form.desc" rows="3" fluid maxlength="500" /></td>
          </tr>
          <tr>
            <th scope="row">전시상태</th>
            <td>
              <SbCan action="config">
                <Select v-model="form.displayStatus" :options="['전시', '미전시']" style="width: 140px" aria-label="전시상태" />
              </SbCan>
              <span v-if="!canConfig" class="ws-desc">설정 권한이 없어 미전시로만 저장됩니다.</span>
            </td>
          </tr>
          <tr v-if="!isNew">
            <th scope="row">등록자 · 최종수정</th>
            <td>{{ mask(form.registrant, 'name') }} · 등록 {{ form.registeredAt }} · 수정 {{ form.updatedAt }}</td>
          </tr>
        </tbody>
      </table>
    </fieldset>

    <section v-if="!isNew" class="ws-sec" style="margin-top: 16px">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">개정 이력</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">개정일시</th><th scope="col">개정자</th><th scope="col">이전 파일</th><th scope="col">메모</th></tr></thead>
        <tbody>
          <tr v-if="form.revisions.length === 0"><td colspan="4" class="ws-desc" style="text-align: center">이력이 없습니다.</td></tr>
          <tr v-for="rv in [...form.revisions].reverse()" :key="rv.at + rv.fileName"><td>{{ rv.at }}</td><td>{{ mask(rv.by, 'name') }}</td><td>{{ rv.fileName }}</td><td>{{ rv.memo }}</td></tr>
        </tbody>
      </table>
    </section>

    <WsActionDialog
      v-model:visible="publishOpen" code="SP-CNT-010D-M2" header="자료 게시 확인"
      :target="`${form.title} — ${form.format === '파일' ? (file?.name ?? form.fileName ?? '') : form.linkUrl}`"
      notice="누리집 자료실에 바로 노출됩니다. 운영지침은 기업 어드민에도 함께 노출됩니다."
      confirm-label="게시" @confirm="commit"
    />
    <WsActionDialog
      v-model:visible="deleteOpen" code="SP-CNT-010D-M1" header="자료 삭제 확인"
      :target="`${form.title} · ${form.category} · ${form.displayStatus}`"
      :warn="form.displayStatus === '전시' ? '지금 전시 중입니다 — 삭제하면 출력처에서 바로 내려갑니다. 개정 이력의 이전 파일도 함께 지워집니다.' : '개정 이력의 이전 파일도 함께 지워집니다.'"
      danger confirm-label="삭제" @confirm="doDelete"
    />
  </div>
</template>
