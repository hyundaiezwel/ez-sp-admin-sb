<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-071P 부적합 키워드관리 — 명세 src/specs/SP-OPS-071P.json */
import { computed, onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { badKeywords, type BadKeyword } from '@fixtures/sb/B6'
import { routeOf } from '../../sb/screens'
import { useRouter } from 'vue-router'

const CODE = 'SP-OPS-071P'
const router = useRouter()

const blank = () => ({ kw: '', active: '' as string })
const f = ref(blank())
const applied = ref(blank())
const sorted = computed(() => [...badKeywords].sort((a, b) => b.at.localeCompare(a.at)))
const hit = (r: BadKeyword) => {
  const a = applied.value
  return (!a.kw.trim() || r.keyword.includes(a.kw.trim())) && (a.active === '' || String(r.active) === a.active)
}
const { rows, loading, error, reload, total, search: requery } = usePaged(() => sorted.value.filter(hit), { size: 500, failIf: () => false })
onMounted(reload)
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const editOpen = ref(false)
const editing = ref<BadKeyword | null>(null)
const kw = ref(''); const active = ref(true); const memo = ref('')
function openNew() { editing.value = null; kw.value = ''; active.value = true; memo.value = ''; editOpen.value = true }
function openEdit(r: BadKeyword) { editing.value = r; kw.value = r.keyword; active.value = r.active; memo.value = r.memo; editOpen.value = true }
function save() {
  const v = kw.value.trim()
  if (v.length < 2 || v.length > 30) return notify('키워드는 2~30자로 입력하세요.', 'danger')
  const dup = badKeywords.some((x) => x.keyword.toLowerCase() === v.toLowerCase() && x.id !== editing.value?.id)
  if (dup) return notify('이미 있는 키워드입니다.', 'danger')
  if (editing.value) {
    Object.assign(editing.value, { keyword: v, active: active.value, memo: memo.value, by: '지금 계정', at: new Date().toISOString().slice(0, 10) })
    notify('키워드를 수정했습니다.', 'success')
  } else {
    badKeywords.unshift({ id: `KW-NEW-${Date.now()}`, no: badKeywords.length + 1, keyword: v, active: true, memo: memo.value, by: '지금 계정', at: new Date().toISOString().slice(0, 10), hits: 0 })
    notify('키워드를 등록했습니다 — 다음 선별부터 적용됩니다.', 'success')
  }
  editOpen.value = false
}
function toggleActive(r: BadKeyword) {
  if (!can(CODE, 'config')) return
  r.active = !r.active
  notify(r.active ? '사용으로 바꿨습니다.' : '사용 중지 — 다음 선별부터 빠집니다. 이미 걸린 판정 이력은 남습니다.', 'success')
}
function remove(r: BadKeyword) {
  const i = badKeywords.findIndex((x) => x.id === r.id)
  if (i >= 0) badKeywords.splice(i, 1)
  notify('키워드를 삭제했습니다.', 'success')
}
function toProducts(r: BadKeyword) { router.push({ path: routeOf('SP-OPS-070P') }); notify(`부적합 상품 관리로 이동 — "${r.keyword}"로 걸린 상품을 조회하세요(미리보기).`) }
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-kw">키워드</label></th>
        <td><InputText id="q-kw" v-model="f.kw" fluid placeholder="키워드 일부" /></td>
        <th scope="row"><label for="q-active">사용여부</label></th>
        <td><Select v-model="f.active" input-id="q-active" :options="[{ l: '전체', v: '' }, { l: '사용', v: 'true' }, { l: '미사용', v: 'false' }]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>
    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">부적합 키워드 사전</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span><span class="ws-desc">최종수정일 최신순</span></div>
        <div class="ws-tit__r"><SbCan action="create"><Button label="키워드 등록" @click="openNew" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="8" @retry="reload">
        <table class="ws-gtb">
          <thead><tr><th scope="col">번호</th><th scope="col">키워드</th><th scope="col">사용여부</th><th scope="col">걸린 상품 수</th><th scope="col">최종수정자</th><th scope="col">최종수정일</th><th scope="col">관리</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.no }}</td>
              <td>{{ r.keyword }}</td>
              <td><SbCan action="config"><ToggleSwitch :model-value="r.active" @update:model-value="toggleActive(r)" /></SbCan></td>
              <td><button type="button" class="ws-cellbtn" @click="toProducts(r)">{{ r.hits }}건</button></td>
              <td>{{ r.by }}</td>
              <td>{{ r.at }}</td>
              <td>
                <SbCan action="update"><Button label="수정" size="small" severity="secondary" outlined @click="openEdit(r)" /></SbCan>
                <SbCan action="delete"><Button label="삭제" size="small" severity="danger" outlined @click="remove(r)" /></SbCan>
              </td>
            </tr>
          </tbody>
        </table>
      </QueryState>
    </section>
    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>사전 변경은 다음 선별부터 반영된다(선별 실행은 목업 범위 밖).</li><li>사용여부 켜기 · 끄기는 운영사 마스터만 할 수 있다.</li></ul></div>

    <Dialog v-model:visible="editOpen" modal :header="editing ? '부적합 키워드 수정' : '부적합 키워드 등록'" :style="{ width: '420px' }" :draggable="false">
      <label for="k-w" class="ws-req">키워드(2~30자)</label>
      <InputText id="k-w" v-model="kw" fluid maxlength="30" style="margin-bottom:10px" />
      <label for="k-active">사용여부</label>
      <Select v-model="active" input-id="k-active" :options="[{ l: '사용', v: true }, { l: '미사용', v: false }]" option-label="l" option-value="v" fluid style="margin-bottom:10px" />
      <label for="k-memo">메모(선정 이유)</label>
      <Textarea id="k-memo" v-model="memo" rows="3" fluid placeholder="선택 입력" />
      <template #footer><SbCode code="SP-OPS-071P-M1" /><Button label="취소" severity="secondary" outlined @click="editOpen = false" /><Button label="저장" @click="save" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.ws-gtb td, .ws-gtb th { text-align: center; }
</style>
