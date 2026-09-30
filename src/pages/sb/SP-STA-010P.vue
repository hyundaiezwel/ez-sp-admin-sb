<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-010P 사업운영통계 신청·승인통계 — 명세 src/specs/SP-STA-010P.json */
import { computed, ref } from 'vue'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import EzChart from '../../app/EzChart.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { notify } from '../../ws/notify'
import { YEARS, BIZ, bizLabel, coFgLabel } from '../../sp/codes'
import { ctx } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { APPLY_REPORT, APPLY_CO_LIST } from '@fixtures/sb/B8'

const CODE = 'SP-STA-010P'
const year = ref(ctx.year)
const biz = ref(ctx.biz)
const reportDate = ref(new Date(2026, 8, 30))
const made = ref(true)

function generate() {
  if (reportDate.value.getFullYear() !== year.value) return notify('참여년도와 보고일자의 연도가 다릅니다.', 'danger')
  made.value = true
  notify('선택한 보고일자 기준으로 리포트를 다시 만들었습니다.', 'success')
}
const won = (n: number) => n.toLocaleString('ko-KR')
const ymd = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

const copyText = computed(() => {
  const d = APPLY_REPORT.daily
  return `<일일 신청현황 (${reportDate.value.getMonth() + 1}/${reportDate.value.getDate()})>\n신청 ${d.applied}명(${d.appliedCo}개사) · 확정 ${d.confirmed}명(${d.confirmedCo}개사)`
})
function copyReport() {
  navigator.clipboard?.writeText(copyText.value).catch(() => {})
  notify('보고 문구를 복사했습니다.', 'success')
}

const recruitOption = {
  xAxis: { type: 'category', data: APPLY_REPORT.recruit.map((r) => r.label) },
  yAxis: { type: 'value' },
  series: [
    { name: '모집정원', type: 'bar', data: APPLY_REPORT.recruit.map((r) => r.cap) },
    { name: '신청', type: 'bar', data: APPLY_REPORT.recruit.map((r) => r.applied) },
    { name: '승인', type: 'bar', data: APPLY_REPORT.recruit.map((r) => r.approved) },
  ],
}
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />

    <section class="ws-sec ws-card">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">조회 조건</h2></div></div>
      <div class="cond">
        <label for="y-y" class="ws-req">참여년도</label>
        <Select v-model="year" input-id="y-y" :options="YEARS" style="width:120px" />
        <label for="y-b">사업</label>
        <Select v-model="biz" input-id="y-b" :options="[{ l: '전체', v: '' }, ...BIZ.map((b) => ({ l: b.label, v: b.code }))]" option-label="l" option-value="v" style="width:220px" />
        <label for="y-d" class="ws-req">보고일자</label>
        <DatePicker v-model="reportDate" input-id="y-d" date-format="yy.mm.dd" show-icon icon-display="input" style="width:150px" />
        <Button label="리포트 생성" @click="generate" />
      </div>
      <p class="ws-desc" style="margin-top:8px">마지막 집계 {{ APPLY_REPORT.reportedAt }} · 배치로 집계한 값이라 실시간 조회와 다를 수 있습니다.</p>
    </section>

    <template v-if="made">
      <div class="ws-split ws-split--21">
        <section class="ws-sec ws-card">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">신청 · 확정 현황</h2><span class="ws-desc">{{ bizLabel(biz) || '전체' }}</span></div></div>
          <table class="ws-tb ws-tb--view">
            <thead><tr><th scope="col"></th><th scope="col">신청인원(기업)</th><th scope="col">확정인원(기업)</th><th scope="col">확정률</th></tr></thead>
            <tbody>
              <tr><th scope="row">일일({{ ymd(reportDate) }})</th><td>{{ APPLY_REPORT.daily.applied }}명({{ APPLY_REPORT.daily.appliedCo }})</td><td>{{ APPLY_REPORT.daily.confirmed }}명({{ APPLY_REPORT.daily.confirmedCo }})</td><td>{{ Math.round((APPLY_REPORT.daily.confirmed / APPLY_REPORT.daily.applied) * 100) }}%</td></tr>
              <tr><th scope="row">누적(사업 시작일 ~)</th><td>{{ won(APPLY_REPORT.cumulative.applied) }}명({{ won(APPLY_REPORT.cumulative.appliedCo) }})</td><td>{{ won(APPLY_REPORT.cumulative.confirmed) }}명({{ won(APPLY_REPORT.cumulative.confirmedCo) }})</td><td>{{ Math.round((APPLY_REPORT.cumulative.confirmed / APPLY_REPORT.cumulative.applied) * 100) }}%</td></tr>
            </tbody>
          </table>
          <Button label="보고 문구 복사" size="small" severity="secondary" outlined class="ws-line" style="margin-top:10px" @click="copyReport" />
        </section>
        <section class="ws-sec ws-card">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">보완요청 현황</h2></div></div>
          <ul class="kv">
            <li><span>전체</span><strong>{{ APPLY_REPORT.supplement.total }}건</strong></li>
            <li><span>보완요청</span><strong>{{ APPLY_REPORT.supplement.requested }}건</strong></li>
            <li><span>보완제출</span><strong>{{ APPLY_REPORT.supplement.submitted }}건</strong></li>
            <li><span>처리완료</span><strong>{{ APPLY_REPORT.supplement.done }}건</strong></li>
            <li><span>평균 처리일수</span><strong>{{ APPLY_REPORT.supplement.avgDays }}일</strong></li>
          </ul>
        </section>
      </div>

      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">포인트 사용현황</h2><span class="ws-desc">{{ ymd(reportDate) }} 기준</span></div>
          <div class="ws-tit__r"><SbCan action="download"><Button label="포인트 사용현황 다운로드" size="small" severity="secondary" outlined class="ws-line" @click="notify(`포인트 사용현황 집계를 내려받기를 요청했습니다.`, 'success')" /></SbCan></div>
        </div>
        <ul class="kpis">
          <li class="kpi ws-card"><span class="kpi__label">구매금액</span><span class="kpi__value">{{ won(APPLY_REPORT.point.buy.amt) }}<small>원</small></span><span class="kpi__sub">{{ APPLY_REPORT.point.buy.cnt }}건</span></li>
          <li class="kpi ws-card"><span class="kpi__label">취소금액</span><span class="kpi__value">{{ won(APPLY_REPORT.point.cancel.amt) }}<small>원</small></span><span class="kpi__sub">{{ APPLY_REPORT.point.cancel.cnt }}건</span></li>
          <li class="kpi ws-card"><span class="kpi__label">종합금액</span><span class="kpi__value">{{ won(APPLY_REPORT.point.net.amt) }}<small>원</small></span><span class="kpi__sub">{{ APPLY_REPORT.point.net.cnt }}건</span></li>
          <li class="kpi ws-card"><span class="kpi__label">최종금액(누적)</span><span class="kpi__value">{{ won(APPLY_REPORT.point.total.amt) }}<small>원</small></span><span class="kpi__sub">{{ won(APPLY_REPORT.point.total.cnt) }}건</span></li>
        </ul>
      </section>

      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">모집현황</h2><span class="ws-desc">모집정원 대비 신청 · 승인</span></div></div>
        <EzChart :option="recruitOption" height="240px" />
        <table class="ws-gtb" style="margin-top:10px">
          <thead><tr><th>사업</th><th>모집정원</th><th>신청</th><th>승인</th><th>달성률</th></tr></thead>
          <tbody><tr v-for="r in APPLY_REPORT.recruit" :key="r.biz"><td>{{ r.label }}</td><td>{{ won(r.cap) }}</td><td>{{ won(r.applied) }}</td><td>{{ won(r.approved) }}</td><td>{{ r.rate }}%</td></tr></tbody>
        </table>
      </section>

      <section class="ws-sec ws-card">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">신청현황 · 최종 참여기업 목록</h2><span class="ws-desc">기업 담당자 연락처 포함(개인정보)</span></div>
          <div class="ws-tit__r"><SbCan action="download-pii"><WsDownload :total="APPLY_CO_LIST.length" :limit="50000" label="엑셀 다운로드(개인정보)" modal-code="SP-STA-010P-M1" /></SbCan></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th>기업명</th><th>사업자등록번호</th><th>기업구분</th><th>담당자</th><th>연락처</th><th>신청</th><th>확정</th></tr></thead>
          <tbody>
            <tr v-for="c in APPLY_CO_LIST" :key="c.id">
              <td>{{ c.name }}</td><td>{{ c.bizNo }}</td><td>{{ coFgLabel(c.coFg) }}</td>
              <td>{{ can(CODE, 'download-pii') ? c.manager : c.manager[0] + '*'.repeat(c.manager.length - 1) }}</td>
              <td>{{ c.phone.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3') }}</td>
              <td>{{ c.applied }}</td><td>{{ c.confirmed }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
    <p v-else class="ws-desc">집계 전 — 마지막 집계일 {{ APPLY_REPORT.reportedAt }}</p>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>조회 전용은 포인트 사용현황(집계)만 내려받는다 — 신청현황 · 최종 참여기업 목록은 <b :title="denyTip(CODE, 'download-pii')">개인정보 다운로드</b> 권한이 있어야 한다.</li>
        <li>수치는 매일 00시 배치 집계 값이다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cond { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--ws-gap-inter); }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpi__value small { margin-left: 3px; font-size: var(--ws-font-size); font-weight: 400; color: var(--ws-text-muted); }
.kpi__sub { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.kv { display: grid; gap: 6px; list-style: none; margin: 0; padding: 0; }
.kv li { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed var(--ws-border); }
</style>
