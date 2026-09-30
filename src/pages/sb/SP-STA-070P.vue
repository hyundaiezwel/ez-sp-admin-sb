<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-070P 동반성장통계 참여유형통계 — 명세 src/specs/SP-STA-070P.json */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { routeOf } from '../../sb/screens'
import SbCan from '../../sb/SbCan.vue'
import { TYPE_COMPARE, PARTNER_ORG, PARTNER_STOP_ENDOFTERM } from '@fixtures/sb/B8'

const CODE = 'SP-STA-070P'
const router = useRouter()
const org = ref('ALL')
const won = (n: number) => n.toLocaleString('ko-KR')
const hasData = computed(() => TYPE_COMPARE.find((t) => t.type === '동반성장')!.co > 0)

function search() { notify('조건에 맞춰 다시 집계했습니다.', 'success') }
function reset() { org.value = 'ALL'; search() }
watch(ctxKey, search)
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <WsSearch :cols="['110px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="y-o">동반성장기업</label></th>
        <td><Select v-model="org" input-id="y-o" :options="[{ l: '전체', v: 'ALL' }, ...PARTNER_ORG.map((p) => ({ l: p.org, v: p.org }))]" option-label="l" option-value="v" fluid /></td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">
      참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준 · 동반성장은 참여유형 구분값이라 별도 메뉴 대신
      <a href="#" class="link" @click.prevent="router.push(routeOf('SP-STA-020P'))">참여기업통계 참여유형별 통계로 통합</a>하는 안이 검토 중이다 — 통합 전 바로 보기.
    </p>

    <section v-if="hasData">
      <div class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">일반참여 vs 동반성장</h2><span class="ws-desc">참여기업통계와 같은 집계 기준</span></div>
          <div class="ws-tit__r"><SbCan action="download"><Button label="엑셀 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify('참여유형 · 동반성장기업별 집계를 내려받기를 요청했습니다.', 'success')" /></SbCan></div>
        </div>
        <table class="ws-gtb"><thead><tr><th>참여유형</th><th>참여기업수</th><th>참여노동자수</th><th>포인트 사용금액</th></tr></thead>
          <tbody><tr v-for="t in TYPE_COMPARE" :key="t.type"><td>{{ t.type }}</td><td>{{ won(t.co) }}</td><td>{{ won(t.worker) }}</td><td>{{ won(t.amount) }}원</td></tr></tbody>
        </table>
      </div>

      <div class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">동반성장기업별 현황</h2><span class="ws-desc">지원 기한 종료 이용정지 {{ PARTNER_STOP_ENDOFTERM }}건</span></div></div>
        <table class="ws-gtb">
          <thead><tr><th>동반성장기업</th><th>연계 참여기업</th><th>연계 참가자</th><th>배정 포인트</th><th>사용 포인트</th><th>포인트 사용기한</th></tr></thead>
          <tbody>
            <tr v-for="p in PARTNER_ORG.filter((x) => org === 'ALL' || x.org === org)" :key="p.org">
              <td>{{ p.org }}</td><td>{{ p.co }}</td><td>{{ p.worker }}</td><td>{{ won(p.assigned) }}</td><td>{{ won(p.used) }}</td><td>{{ p.deadline }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <p v-else class="ws-desc">동반성장 참여 없음</p>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>이 화면의 수치는 참여기업통계(SP-STA-020P)와 같아야 한다 — 다르면 결함이다.</li></ul></div>
  </div>
</template>

<style scoped>
.link { color: var(--ws-text-link); }
</style>
