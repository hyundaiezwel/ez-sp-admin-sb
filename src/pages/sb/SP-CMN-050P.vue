<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CMN-050P 메인 — 로그인 뒤 첫 화면. 사업현황 KPI · 처리 대기 · 최근 업무요청 · 공지사항 ·
 * 매뉴얼 다운로드 · 빠른메뉴를 카드로 모은다. 처리 대기 숫자는 메뉴 옆 숫자(PENDING)와 같은 원천이다.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import PageHead from '../../app/PageHead.vue'
import { bizLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import { routeOf, SCREENS } from '../../sb/screens'
import { can, sb, roleLabel } from '../../sb/context'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'
import { applications, COMPANIES } from '@fixtures/sb/common'
import { ADMINS, PII_LOGS } from '@fixtures/sb/B1'
import { ref } from 'vue'

const CODE = 'SP-CMN-050P'
const apps = computed(() => applications(ctx.biz))

/** 처리 대기 — SB 목록 화면의 미처리 건수. sp/menu.ts PENDING(SP 전용)과 다른 원천이다 */
const PENDING = computed(() => [
  { label: '자격심사 대기', to: routeOf('SP-PRT-010L'), count: apps.value.filter((x) => x.sts === '110').length },
  { label: '계정 발급 대기', to: routeOf('SP-SYS-010L'), count: ADMINS.filter((a) => a.pending).length },
  { label: '사유 확인 대기', to: routeOf('SP-SYS-021P'), count: PII_LOGS.filter((p) => p.flagged && !p.reviewResult).length },
])
const KPI = computed(() => {
  const a = apps.value
  const co = COMPANIES.filter((c) => c.biz === ctx.biz)
  return [
    { label: '신청', value: a.length, sub: bizLabel(ctx.biz) },
    { label: '심사중', value: a.filter((x) => x.sts === '110').length, sub: '자격심사' },
    { label: '선정완료', value: a.filter((x) => x.sts === '220').length, sub: '누적' },
    { label: '참여기업', value: co.length, sub: '등록' },
  ]
})

const NOTICES = [
  { id: 1, title: '26년 지역 연계 지원사업 모집 일정 안내', at: '2026.09.28' },
  { id: 2, title: '정기 점검 안내(09.30 02:00~04:00)', at: '2026.09.25' },
  { id: 3, title: '엑셀 다운로드 사유 등록 의무화 시행', at: '2026.09.10' },
]
const REQUESTS = [
  { id: 'RQ-2609-014', title: '가상계좌 재발급 요청', company: '한빛정밀(주)', at: '2026.09.29 10:22' },
  { id: 'RQ-2609-013', title: '담당자 연락처 변경', company: '새솔테크', at: '2026.09.29 09:05' },
  { id: 'RQ-2609-012', title: '이용정지 해제 문의', company: '가온물산(주)', at: '2026.09.28 16:40' },
]

/* --- 빠른메뉴(M1) --------------------------------------------------------- */
const quickOpen = ref(false)
const allowedScreens = computed(() => SCREENS.filter((s) => can(s.code, 'view')))
const picked = ref<string[]>(['SP-PRT-010L', 'SP-SYS-010L', 'SP-CMN-040D'])
function toggle(code: string) {
  const i = picked.value.indexOf(code)
  if (i >= 0) picked.value.splice(i, 1)
  else if (picked.value.length < 6) picked.value.push(code)
  else notify('빠른메뉴는 최대 6개까지 고를 수 있습니다.', 'warning')
}
function saveQuick() { quickOpen.value = false; notify('빠른메뉴를 저장했습니다.', 'success') }
const quickList = computed(() => picked.value.map((c) => SCREENS.find((s) => s.code === c)).filter(Boolean) as typeof SCREENS)
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />

    <p class="ws-desc" style="margin: -4px 0 4px">{{ roleLabel(sb.role) }}로 보는 중 · {{ bizLabel(ctx.biz) }}</p>

    <ul class="kpis" aria-label="사업현황">
      <li v-for="k in KPI" :key="k.label" class="kpi ws-card">
        <span class="kpi__label">{{ k.label }}</span>
        <span class="kpi__value">{{ k.value }}<small>건</small></span>
        <span class="kpi__sub">{{ k.sub }} · 집계 {{ '2026.09.30 09:00' }}</span>
      </li>
    </ul>

    <div class="ws-split ws-split--21">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">처리 대기</h2><span class="ws-desc">메뉴 옆 숫자와 같은 값</span></div></div>
        <ul class="pend">
          <li v-for="p in PENDING" :key="p.to">
            <RouterLink :to="p.to" class="pend__row">
              <span>{{ p.label }}</span>
              <span class="pend__n">{{ p.count }}건</span>
            </RouterLink>
          </li>
        </ul>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">빠른메뉴</h2></div>
          <div class="ws-tit__r"><Button label="설정" size="small" severity="secondary" outlined class="ws-line" @click="quickOpen = true" /></div>
        </div>
        <ul class="quick">
          <li v-for="s in quickList" :key="s.code"><RouterLink :to="routeOf(s.code)">{{ s.label }}</RouterLink></li>
          <li v-if="!quickList.length" class="ws-desc">고른 화면이 없습니다.</li>
        </ul>
      </section>
    </div>

    <div class="ws-split">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">최근 업무요청</h2></div><div class="ws-tit__r"><RouterLink :to="routeOf('SP-OPS-010L')" class="ws-desc">전체 보기</RouterLink></div></div>
        <table class="ws-gtb req">
          <thead><tr><th>번호</th><th>제목</th><th>기업</th><th>일시</th></tr></thead>
          <tbody>
            <tr v-for="r in REQUESTS" :key="r.id"><td>{{ r.id }}</td><td class="req__t"><span class="trunc">{{ r.title }}</span></td><td>{{ r.company }}</td><td :title="r.at">{{ r.at.slice(5) }}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">공지사항</h2></div><div class="ws-tit__r"><RouterLink :to="routeOf('SP-OPS-040L')" class="ws-desc">전체 보기</RouterLink></div></div>
        <ul class="notice">
          <li v-for="n in NOTICES" :key="n.id"><span class="trunc">{{ n.title }}</span><span class="ws-desc">{{ n.at }}</span></li>
        </ul>
      </section>
    </div>

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">매뉴얼 · 사용실적</h2></div>
        <div class="ws-tit__r">
          <Button label="어드민 사용 매뉴얼" severity="secondary" outlined class="ws-line" @click="notify('매뉴얼을 내려받습니다.', 'success')" />
          <SbCan action="download" :code="CODE"><Button label="사용실적 다운로드" severity="secondary" outlined class="ws-line" @click="notify('사용실적을 내려받습니다.', 'success')" /></SbCan>
        </div>
      </div>
      <p class="ws-desc">사용실적은 개인정보를 담지 않아 사유 등록 없이 내려받는다(FN-07).</p>
    </section>

    <Dialog v-model:visible="quickOpen" modal header="빠른메뉴 설정" :style="{ width: '520px' }" :draggable="false">
      <p class="ws-desc" style="margin-bottom: 10px">권한이 있는 화면 중 최대 6개를 고른다({{ picked.length }}/6).</p>
      <div class="quick-opts">
        <div v-for="s in allowedScreens" :key="s.code" class="ws-check">
          <Checkbox :model-value="picked.includes(s.code)" :input-id="`q-${s.code}`" binary @update:model-value="() => toggle(s.code)" />
          <label :for="`q-${s.code}`">{{ s.label }}</label>
        </div>
      </div>
      <template #footer>
        <SbCode code="SP-CMN-050P-M1" />
        <Button label="취소" severity="secondary" outlined @click="quickOpen = false" />
        <Button label="저장" @click="saveQuick" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 26px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
.kpi__value small { margin-left: 3px; font-size: var(--ws-font-size); font-weight: 400; color: var(--ws-text-muted); }
.kpi__sub { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.pend { display: grid; gap: 2px; }
.pend__row { display: flex; justify-content: space-between; padding: 8px 4px; color: var(--ws-text); text-decoration: none; border-radius: var(--ws-radius-sm); }
.pend__row:hover { background: var(--ws-surface-alt); }
.pend__row small { margin-left: 6px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.pend__n { font-weight: 600; }
.quick { display: grid; gap: 2px; list-style: none; padding: 0; margin: 0; }
.quick li a { display: block; padding: 8px 4px; color: var(--ws-text-link); text-decoration: none; }
.quick-opts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; max-height: 320px; overflow: auto; }
.notice { display: grid; gap: 2px; list-style: none; padding: 0; margin: 0; }
.notice li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 4px; border-bottom: 1px dashed var(--ws-border); }
/* 반반 배치라 칸이 좁다 — 번호·기업·일시는 한 줄, 제목만 말줄임 */
.req { table-layout: fixed; width: 100%; }
.req td, .req th { white-space: nowrap; }
.req th:nth-child(1) { width: 132px; } .req th:nth-child(3) { width: 104px; } .req th:nth-child(4) { width: 112px; }
.req__t .trunc { display: block; }
.req td { overflow: hidden; text-overflow: ellipsis; }
.trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
