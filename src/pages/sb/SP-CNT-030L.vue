<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CNT-030L 배너관리 배너목록 — 배너 위치별 탭(메인 비주얼 · 혜택 · SNS 링크). 본보기 BannerPage(src/pages/sp).
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import { notify } from '../../ws/notify'
import { mask } from '../../ws/mask'
import { badgeClass } from '../../ws/badge'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { BANNERS, BANNER_LIMIT, BANNER_POSITIONS, BANNER_SIZE, bannerLive, bannerPhase, type BannerPosition, type CntBanner } from '@fixtures/sb/B7'

const CODE = 'SP-CNT-030L'
const router = useRouter()
const rows = ref(BANNERS)
const pos = ref<BannerPosition>('메인 비주얼')

const f = ref({ name: '', status: '' })
function reset() { f.value = { name: '', status: '' } }
const inTab = computed(() =>
  rows.value
    .filter((b) => b.position === pos.value)
    .filter((b) => (!f.value.name.trim() || b.name.includes(f.value.name.trim())) && (!f.value.status || b.displayStatus === f.value.status))
    .sort((a, b) => a.order - b.order),
)
const liveCount = computed(() => rows.value.filter((b) => b.position === pos.value && bannerLive(b)).length)
const limit = computed(() => BANNER_LIMIT[pos.value])
const size = computed(() => BANNER_SIZE[pos.value])

/* --- 순서 변경 · 저장(M1) --------------------------------------------------- */
const baseline = ref<Record<string, number>>(Object.fromEntries(BANNERS.map((b) => [b.id, b.order])))
const changed = computed(() => rows.value.filter((b) => b.position === pos.value && baseline.value[b.id] !== b.order))
function move(b: CntBanner, dir: -1 | 1) {
  const arr = inTab.value
  const i = arr.indexOf(b); const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i].order, arr[j].order] = [arr[j].order, arr[i].order]
}
const orderOpen = ref(false)
function askSaveOrder() {
  if (!changed.value.length) return notify('저장할 데이터가 없습니다.', 'info')
  orderOpen.value = true
}
function confirmSaveOrder() {
  rows.value.filter((b) => b.position === pos.value).forEach((b) => (baseline.value[b.id] = b.order))
  notify('노출 순서를 저장했습니다 — 누리집 메인에 바로 반영됩니다.', 'success')
}

const openDetail = (b: CntBanner) => router.push({ path: routeOf('SP-CNT-030D'), query: { id: b.id } })
const openNew = () => router.push({ path: routeOf('SP-CNT-030D'), query: { position: pos.value } })
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <Tabs v-model:value="pos">
        <TabList>
          <Tab v-for="p in BANNER_POSITIONS" :key="p" :value="p">{{ p }} <span class="cnt">{{ rows.filter((b) => b.position === p).length }}</span></Tab>
        </TabList>
      </Tabs>
    </section>

    <section class="ws-sec ws-sh">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">조회</h2></div>
        <div class="ws-tit__r"><Button severity="secondary" outlined label="초기화" @click="reset" /></div>
      </div>
      <table class="ws-tb">
        <colgroup><col style="width: 112px" /><col /><col style="width: 132px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row"><label for="b-n">배너명</label></th>
            <td><InputText id="b-n" v-model="f.name" fluid placeholder="배너명 일부" /></td>
            <th scope="row"><label for="b-s">전시상태</label></th>
            <td><Select v-model="f.status" input-id="b-s" :options="[{ l: '전체', v: '' }, { l: '전시', v: '전시' }, { l: '미전시', v: '미전시' }]" option-label="l" option-value="v" fluid /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">{{ pos }} 배너</h2><span class="ws-total">총<strong>{{ inTab.length }}</strong>건</span><span class="ws-desc">규격 {{ size[0] }}×{{ size[1] }}px</span></div>
        <div class="ws-tit__r">
          <SbCan action="config"><Button severity="secondary" outlined label="순서 저장" @click="askSaveOrder" /></SbCan>
          <SbCan action="create"><Button label="배너 등록" severity="contrast" @click="openNew" /></SbCan>
        </div>
      </div>
      <p v-if="limit && liveCount > limit" class="ws-err" role="alert" style="margin-bottom: 8px">노출 한도 {{ limit }}건을 넘었습니다(지금 {{ liveCount }}건 노출 중).</p>
      <table class="ws-gtb">
        <thead>
          <tr>
            <th scope="col" style="width: 84px">순서</th>
            <th scope="col" style="width: 96px">썸네일</th>
            <th scope="col">{{ pos === 'SNS 링크' ? '채널 · 제목' : '배너명' }}</th>
            <th scope="col" style="width: 96px">전시시작</th>
            <th scope="col" style="width: 96px">전시종료</th>
            <th scope="col" style="width: 84px">진행상태</th>
            <th scope="col" style="width: 84px">전시상태</th>
            <th scope="col" style="width: 88px">등록자</th>
            <th scope="col" style="width: 124px">등록일시</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in inTab" :key="b.id">
            <td>
              <div class="od">
                <span class="ws-num">{{ i + 1 }}</span>
                <button type="button" class="ws-cellbtn" :disabled="i === 0 || !can(CODE, 'config')" :title="denyTip(CODE, 'config')" :aria-label="`${b.name} 위로`" @click="move(b, -1)">▲</button>
                <button type="button" class="ws-cellbtn" :disabled="i === inTab.length - 1 || !can(CODE, 'config')" :title="denyTip(CODE, 'config')" :aria-label="`${b.name} 아래로`" @click="move(b, 1)">▼</button>
              </div>
            </td>
            <td><span class="th" :style="{ background: `linear-gradient(135deg, ${b.tint}, color-mix(in srgb, ${b.tint} 45%, white))` }" aria-hidden="true" /></td>
            <td>
              <button type="button" class="ws-linklike" @click="openDetail(b)">{{ pos === 'SNS 링크' ? b.channel : b.name }}</button>
              <span v-if="bannerLive(b)" :class="badgeClass('brand')" style="margin-left: 4px">노출 중</span>
            </td>
            <td style="text-align: center">{{ b.startDate }}</td>
            <td style="text-align: center">{{ b.endDate }}</td>
            <td style="text-align: center"><span :class="badgeClass(bannerPhase(b) === '진행중' ? 'success' : bannerPhase(b) === '대기중' ? 'info' : 'mute')">{{ bannerPhase(b) }}</span></td>
            <td style="text-align: center"><span :class="badgeClass(b.displayStatus === '전시' ? 'success' : 'mute')">{{ b.displayStatus }}</span></td>
            <td style="text-align: center">{{ mask(b.registrant, 'name') }}</td>
            <td style="text-align: center">{{ b.registeredAt }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <WsActionDialog
      v-model:visible="orderOpen" code="SP-CNT-030L-M1" header="노출 순서 저장"
      :target="`${pos} — 바뀐 배너 ${changed.length}건`" notice="저장하면 누리집 메인에 바로 반영됩니다." confirm-label="저장" @confirm="confirmSaveOrder"
    />
  </div>
</template>

<style scoped>
.cnt { margin-left: 4px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.od { display: flex; align-items: center; gap: 4px; justify-content: center; }
.od .ws-num { width: 18px; }
.od .ws-cellbtn { width: 24px; padding: 0; }
.od .ws-cellbtn:disabled { opacity: 0.4; cursor: default; }
.th { display: inline-block; width: 72px; height: 32px; border-radius: var(--ws-radius-sm); }
.ws-linklike { border: 0; background: none; padding: 0; color: var(--ws-text-link); font: inherit; cursor: pointer; }
.ws-linklike:hover { text-decoration: underline; }
</style>
