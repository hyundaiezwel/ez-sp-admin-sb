<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CNT-020L 팝업관리 팝업 목록. 진행상태는 저장값이 아니라 오늘 날짜로 계산한다(popupPhase).
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import { presetRange, PRESETS, fmtDate, type Range } from '../../ws/period'
import { mask } from '../../ws/mask'
import { badgeClass } from '../../ws/badge'
import SbCode from '../../sb/SbCode.vue'
import SbCan from '../../sb/SbCan.vue'
import { routeOf } from '../../sb/screens'
import { POPUPS, popupLive, popupPhase, type CntPopup } from '@fixtures/sb/B7'

const CODE = 'SP-CNT-020L'
const router = useRouter()
const rows = ref(POPUPS)

const f = reactive({ phase: '', type: '', status: '', range: presetRange(PRESETS[3]) as Range })
const applied = reactive({ ...f })
function search() { Object.assign(applied, f) }
function reset() { f.phase = ''; f.type = ''; f.status = ''; f.range = presetRange(PRESETS[3]); Object.assign(applied, f) }
const filtered = computed(() =>
  rows.value.filter((p) => {
    const phase = popupPhase(p)
    const [from, to] = applied.range
    const inRange = !from || !to || (p.startDate <= fmtDate(to) && p.endDate >= fmtDate(from))
    return (!applied.phase || phase === applied.phase) && (!applied.type || p.type === applied.type) && (!applied.status || p.displayStatus === applied.status) && inRange
  }).sort((a, b) => a.startDate.localeCompare(b.startDate)),
)

/** 겹침 경고 — 같은 페이지 · 같은 순위 · 노출 중인 레이어팝업이 둘 이상 */
const overlaps = computed(() => {
  const live = rows.value.filter((p) => p.type === '레이어팝업' && popupLive(p))
  const seen = new Map<string, number>()
  for (const p of live) { const k = `${p.page}-${p.rank}`; seen.set(k, (seen.get(k) ?? 0) + 1) }
  return [...seen.values()].some((n) => n > 1)
})

const openDetail = (p: CntPopup) => router.push({ path: routeOf('SP-CNT-020D'), query: { id: p.id } })

/* --- 누리집 미리보기(M1) --------------------------------------------------- */
const previewOpen = ref(false)
const liveNow = computed(() => rows.value.filter(popupLive).sort((a, b) => b.rank - a.rank))
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec ws-sh">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">조회</h2></div>
        <div class="ws-tit__r"><Button severity="secondary" outlined label="초기화" @click="reset" /><Button label="조회" @click="search" /></div>
      </div>
      <table class="ws-tb">
        <colgroup><col style="width: 112px" /><col /><col style="width: 132px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row"><label for="p-ph">진행상태</label></th>
            <td><Select v-model="f.phase" input-id="p-ph" :options="[{ l: '전체', v: '' }, ...['대기중', '진행중', '종료'].map((v) => ({ l: v, v }))]" option-label="l" option-value="v" fluid /></td>
            <th scope="row"><label for="p-ty">팝업 유형</label></th>
            <td><Select v-model="f.type" input-id="p-ty" :options="[{ l: '전체', v: '' }, { l: '상단배너', v: '상단배너' }, { l: '레이어팝업', v: '레이어팝업' }]" option-label="l" option-value="v" fluid /></td>
          </tr>
          <tr>
            <th scope="row"><label for="p-st">전시상태</label></th>
            <td><Select v-model="f.status" input-id="p-st" :options="[{ l: '전체', v: '' }, { l: '전시', v: '전시' }, { l: '미전시', v: '미전시' }]" option-label="l" option-value="v" fluid /></td>
            <th scope="row"><label for="p-rg">전시기간</label></th>
            <td><WsPeriod id="p-rg" v-model="f.range" /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">팝업 목록</h2><span class="ws-total">총<strong>{{ filtered.length }}</strong>건</span></div>
        <div class="ws-tit__r">
          <Button severity="secondary" outlined label="누리집 미리보기" @click="previewOpen = true" />
          <SbCan action="create"><Button label="팝업 등록" severity="contrast" @click="router.push(routeOf('SP-CNT-020D'))" /></SbCan>
        </div>
      </div>
      <p v-if="overlaps" class="ws-err" role="alert" style="margin-bottom: 8px">노출 순위가 겹치는 팝업이 있습니다.</p>
      <table class="ws-gtb ws-gtb--fixed">
        <thead>
          <tr>
            <th scope="col">팝업명</th>
            <th scope="col" style="width: 92px">유형</th>
            <th scope="col" style="width: 100px">시작일</th>
            <th scope="col" style="width: 100px">종료일</th>
            <th scope="col" style="width: 84px">진행상태</th>
            <th scope="col" style="width: 84px">전시상태</th>
            <th scope="col" style="width: 64px">순위</th>
            <th scope="col" style="width: 88px">등록자</th>
            <th scope="col" style="width: 124px">등록일시</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id">
            <td class="ttl">
              <button type="button" class="ws-linklike" :title="p.name" @click="openDetail(p)">{{ p.name }}</button>
              <span v-if="popupLive(p)" :class="badgeClass('brand')">노출 중</span>
            </td>
            <td style="text-align: center">{{ p.type }}</td>
            <td style="text-align: center">{{ p.startDate }}</td>
            <td style="text-align: center">{{ p.endDate }}</td>
            <td style="text-align: center"><span :class="badgeClass(popupPhase(p) === '진행중' ? 'success' : popupPhase(p) === '대기중' ? 'info' : 'mute')">{{ popupPhase(p) }}</span></td>
            <td style="text-align: center"><span :class="badgeClass(p.displayStatus === '전시' ? 'success' : 'mute')">{{ p.displayStatus }}</span></td>
            <td style="text-align: center">{{ p.rank }}</td>
            <td style="text-align: center">{{ mask(p.registrant, 'name') }}</td>
            <td style="text-align: center">{{ p.registeredAt }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul><li>진행상태는 저장하지 않고 전시기간과 오늘 날짜로 계산한다. 노출 중 = 진행중 + 전시.</li></ul>
    </div>

    <Dialog v-model:visible="previewOpen" modal header="누리집 미리보기" :style="{ width: '460px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 8px">진행중 + 전시인 팝업만 순위 높은 순으로 겹쳐 보인다(읽기 전용).</p>
      <ul style="display: grid; gap: 8px; padding: 0; list-style: none">
        <li v-for="p in liveNow" :key="p.id" class="prev">
          <b>{{ p.name }}</b><span class="ws-desc">{{ p.page }} · {{ p.type }} · 순위 {{ p.rank }}{{ p.posX ? ` · (${p.posX},${p.posY})` : '' }}</span>
        </li>
        <li v-if="liveNow.length === 0" class="ws-desc">노출 중인 팝업이 없습니다.</li>
      </ul>
      <template #footer><SbCode code="SP-CNT-020L-M1" /><Button label="닫기" severity="secondary" outlined @click="previewOpen = false" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.ws-gtb--fixed { table-layout: fixed; }
.ttl { display: flex; align-items: center; gap: 4px; min-width: 0; }
.ws-linklike { min-width: 0; flex: 0 1 auto; overflow: hidden; border: 0; background: none; padding: 0; color: var(--ws-text-link); font: inherit; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.ws-linklike:hover { text-decoration: underline; }
.prev { padding: 8px 10px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius-sm); display: flex; justify-content: space-between; gap: 8px; }
</style>
