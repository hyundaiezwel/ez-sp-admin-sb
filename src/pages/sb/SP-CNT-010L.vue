<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CNT-010L 자료실 자료 목록.
 * 순서는 BannerPage(src/pages/sp)와 같은 방식 — 위 · 아래 버튼으로 옮기고 모달(M1)로 한 번에 저장한다.
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import { badgeClass } from '../../ws/badge'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { CNT_CATEGORIES, MATERIALS, type CntMaterial } from '@fixtures/sb/B7'

const CODE = 'SP-CNT-010L'
const router = useRouter()
const rows = ref(MATERIALS)

/* --- 조회 ----------------------------------------------------------------- */
const f = reactive({ title: '', status: 'ALL', category: 'ALL' })
const applied = reactive({ ...f })
function search() { Object.assign(applied, f) }
function reset() { f.title = ''; f.status = 'ALL'; f.category = 'ALL'; Object.assign(applied, f) }
const filtered = computed(() =>
  rows.value
    .filter((m) => (!applied.title.trim() || m.title.includes(applied.title.trim())) && (applied.status === 'ALL' || m.displayStatus === applied.status) && (applied.category === 'ALL' || m.category === applied.category))
    .sort((a, b) => a.order - b.order),
)

/* --- 순서 변경 · 저장(M1) --------------------------------------------------- */
const baseline = ref<Record<string, number>>(Object.fromEntries(MATERIALS.map((m) => [m.id, m.order])))
const changed = computed(() => rows.value.filter((m) => baseline.value[m.id] !== m.order))
function move(m: CntMaterial, dir: -1 | 1) {
  const arr = filtered.value
  const i = arr.indexOf(m); const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i].order, arr[j].order] = [arr[j].order, arr[i].order]
}
const orderOpen = ref(false)
function askSaveOrder() {
  if (!changed.value.length) return notify('저장할 데이터가 없습니다.', 'info')
  orderOpen.value = true
}
function confirmSaveOrder() {
  baseline.value = Object.fromEntries(rows.value.map((m) => [m.id, m.order]))
  notify('노출 순서를 저장했습니다 — 누리집 자료실에 바로 반영됩니다.', 'success')
}

const openDetail = (m: CntMaterial) => router.push({ path: routeOf('SP-CNT-010D'), query: { id: m.id } })
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec ws-sh">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">조회</h2></div>
        <div class="ws-tit__r">
          <Button severity="secondary" outlined label="초기화" @click="reset" />
          <Button label="조회" @click="search" />
        </div>
      </div>
      <table class="ws-tb">
        <colgroup><col style="width: 112px" /><col /><col style="width: 132px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row"><label for="m-t">제목</label></th>
            <td><InputText id="m-t" v-model="f.title" fluid maxlength="25" placeholder="제목 일부" /></td>
            <th scope="row"><label for="m-c">자료 분류</label></th>
            <td><Select v-model="f.category" input-id="m-c" :options="[{ l: '전체', v: 'ALL' }, ...CNT_CATEGORIES.map((c) => ({ l: c, v: c }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
          </tr>
          <tr>
            <th scope="row"><label for="m-s">전시상태</label></th>
            <td>
              <Select v-model="f.status" input-id="m-s" :options="[{ l: '전체', v: 'ALL' }, { l: '전시', v: '전시' }, { l: '미전시', v: '미전시' }]" option-label="l" option-value="v" placeholder="전체" fluid />
            </td>
            <td colspan="2" />
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">자료 목록</h2><span class="ws-total">총<strong>{{ filtered.length }}</strong>건</span><span class="ws-desc">노출 순서대로 · 제목을 누르면 상세</span></div>
        <div class="ws-tit__r">
          <SbCan action="config"><Button severity="secondary" outlined label="순서 저장" @click="askSaveOrder" /></SbCan>
          <SbCan action="create"><Button label="자료 등록" severity="contrast" @click="router.push(routeOf('SP-CNT-010D'))" /></SbCan>
        </div>
      </div>
      <table class="ws-gtb ws-gtb--fixed">
        <thead>
          <tr>
            <th scope="col" style="width: 84px">순서</th>
            <th scope="col" style="width: 150px">자료 분류</th>
            <th scope="col">제목</th>
            <th scope="col" style="width: 84px">형식</th>
            <th scope="col" style="width: 90px">전시상태</th>
            <th scope="col" style="width: 88px">등록자</th>
            <th scope="col" style="width: 124px">등록일시</th>
            <th scope="col" style="width: 124px">최종수정일시</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in filtered" :key="m.id">
            <td>
              <div class="od">
                <span class="ws-num">{{ i + 1 }}</span>
                <button type="button" class="ws-cellbtn" :disabled="i === 0 || !can(CODE, 'config')" :title="denyTip(CODE, 'config')" :aria-label="`${m.title} 위로`" @click="move(m, -1)">▲</button>
                <button type="button" class="ws-cellbtn" :disabled="i === filtered.length - 1 || !can(CODE, 'config')" :title="denyTip(CODE, 'config')" :aria-label="`${m.title} 아래로`" @click="move(m, 1)">▼</button>
              </div>
            </td>
            <td style="text-align: center">
              {{ m.category }}
              <span v-if="m.category === '운영지침'" class="ws-badge ws-badge--info" style="display: inline-block; margin-top: 2px; white-space: nowrap">기업 어드민 출력</span>
            </td>
            <td><button type="button" class="ws-linklike" :title="m.title" @click="openDetail(m)">{{ m.title }}</button></td>
            <td style="text-align: center">{{ m.format }}</td>
            <td style="text-align: center"><span :class="badgeClass(m.displayStatus === '전시' ? 'success' : 'mute')">{{ m.displayStatus }}</span></td>
            <td style="text-align: center">{{ mask(m.registrant, 'name') }}</td>
            <td style="text-align: center">{{ m.registeredAt }}</td>
            <td style="text-align: center">{{ m.updatedAt }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>순서는 화살표로 옮기고 <b>순서 저장</b>을 눌러야 반영된다. 바뀐 것이 없으면 저장 버튼이 알림만 띄운다.</li>
        <li>운영지침은 기업 어드민에도 함께 나간다(출력처 표시). 역할은 상단바에서 바꾼다.</li>
      </ul>
    </div>

    <WsActionDialog
      v-model:visible="orderOpen" code="SP-CNT-010L-M1" header="노출 순서 저장"
      :target="`바뀐 자료 ${changed.length}건`"
      notice="저장하면 누리집 자료실에 바로 반영됩니다."
      confirm-label="저장" @confirm="confirmSaveOrder"
    />
  </div>
</template>

<style scoped>
.od { display: flex; align-items: center; gap: 4px; justify-content: center; }
.od .ws-num { width: 18px; }
.od .ws-cellbtn { width: 24px; padding: 0; }
.od .ws-cellbtn:disabled { opacity: 0.4; cursor: default; }
.ws-gtb--fixed { table-layout: fixed; }
.ws-linklike { display: block; width: 100%; overflow: hidden; border: 0; background: none; padding: 0; color: var(--ws-text-link); font: inherit; text-overflow: ellipsis; white-space: nowrap; text-align: left; cursor: pointer; }
.ws-linklike:hover { text-decoration: underline; }
</style>
