<!-- SB-DONE -->
<script setup lang="ts">
/** SP-STA-060P 국회요구자료 통계리포트 — 명세 src/specs/SP-STA-060P.json */
import { ref, watch } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import RadioButton from 'primevue/radiobutton'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { notify } from '../../ws/notify'
import { YEARS, bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import SbCan from '../../sb/SbCan.vue'
import { NA_TEMPLATES, NA_T1, NA_T6, NA_T7, NA_T8, NA_T9 } from '@fixtures/sb/B8'

const CODE = 'SP-STA-060P'
const cond = ref<'전체(내평)' | '정평'>('전체(내평)')
const defaultDate = () => new Date(2026, 8, 21)
const reportDate = ref(defaultDate())
/** 국회요구자료는 여러 해를 한 번에 묶어 보는 요청이 흔해 전역 참여년도 대신 비교 연도(시작~끝)를 쓴다 */
const yearFrom = ref(ctx.year)
const yearTo = ref(ctx.year)
const made = ref(true)
const tab = ref('T1')
const won = (n: number) => n.toLocaleString('ko-KR')

function generate() {
  if (reportDate.value.getFullYear() < yearFrom.value || reportDate.value.getFullYear() > yearTo.value) return notify('보고일자가 비교 연도 범위를 벗어났습니다.', 'danger')
  if (yearFrom.value < 2019) { made.value = false; return notify('이관 전 연도입니다.', 'danger') }
  made.value = true
  notify('선택한 조건으로 9개 템플릿을 다시 집계했습니다.', 'success')
}
function reset() { cond.value = '전체(내평)'; reportDate.value = defaultDate(); yearFrom.value = ctx.year; yearTo.value = ctx.year; generate() }
watch(ctxKey, generate)

function download() { notify(`'${NA_TEMPLATES.find((t) => t.id === tab.value)?.name}' 리포트를 내려받기를 요청했습니다.`, 'success') }
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />
    <WsSearch :cols="['104px', '', '132px', '']" @search="generate" @reset="reset">
      <tr>
        <th scope="row"><label for="y-fy">비교 연도</label></th>
        <td>
          <span class="yr">
            <Select v-model="yearFrom" input-id="y-fy" :options="YEARS" aria-label="비교 연도 시작" class="yr__s" />
            <span aria-hidden="true">~</span>
            <Select v-model="yearTo" :options="YEARS" aria-label="비교 연도 종료" class="yr__s" />
          </span>
        </td>
        <th scope="row"><label for="y-d">보고일자</label></th>
        <td><DatePicker v-model="reportDate" input-id="y-d" date-format="yy.mm.dd" show-icon icon-display="input" fluid /></td>
      </tr>
      <tr>
        <th scope="row">검색조건</th>
        <td colspan="3">
          <div class="ws-choices" role="radiogroup" aria-label="검색조건">
            <div class="ws-radio"><RadioButton v-model="cond" input-id="c1" name="cond" value="전체(내평)" /><label for="c1">전체(내평)</label></div>
            <div class="ws-radio"><RadioButton v-model="cond" input-id="c2" name="cond" value="정평" /><label for="c2">정평</label></div>
          </div>
        </td>
      </tr>
    </WsSearch>
    <p class="ws-desc" style="margin:8px 0 0">참여년도 {{ ctx.year }} · {{ bizLabel(ctx.biz) || '전체' }} 기준(리포트는 비교 연도 기준) · 마지막 집계 2026.09.30 00:12 · 배치로 집계한 값이라 실시간 조회와 다를 수 있습니다.</p>

    <section v-if="made" class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">템플릿</h2></div>
        <div class="ws-tit__r"><SbCan action="download"><Button label="이 리포트 내려받기" size="small" severity="secondary" outlined class="ws-line" @click="download" /></SbCan></div>
      </div>
      <Tabs v-model:value="tab">
        <div class="ws-xscroll">
          <TabList>
            <Tab v-for="t in NA_TEMPLATES" :key="t.id" :value="t.id">{{ t.name }}</Tab>
          </TabList>
        </div>
        <TabPanels>
          <TabPanel value="T1">
            <table class="ws-gtb"><thead><tr><th>상품 구분</th><th>사용금액</th></tr></thead>
              <tbody><tr v-for="r in NA_T1" :key="r.type"><td>{{ r.type }}</td><td>{{ won(r.amount) }}</td></tr>
                <tr><th scope="row">합계</th><td>{{ won(NA_T1.reduce((s, r) => s + r.amount, 0)) }}</td></tr></tbody>
            </table>
          </TabPanel>
          <TabPanel v-for="t in ['T2', 'T3', 'T4', 'T5']" :key="t" :value="t">
            <p class="ws-desc">지역별 템플릿(시 · 도 축) — 상세는 지역별 이용 통계(SP-STA-041P)와 같은 집계 기준(미조사 · 추정).</p>
          </TabPanel>
          <TabPanel value="T6">
            <table class="ws-gtb"><thead><tr><th>기업구분</th><th>참여 인원</th><th>사용금액</th><th>1인당 사용금액</th></tr></thead>
              <tbody><tr v-for="r in NA_T6" :key="r.label"><td>{{ r.label }}</td><td>{{ won(r.worker) }}</td><td>{{ won(r.amount) }}</td><td>{{ won(r.perHead) }}</td></tr></tbody>
            </table>
          </TabPanel>
          <TabPanel value="T7">
            <table class="ws-gtb"><thead><tr><th>상품 구분</th><th>사용건수</th></tr></thead>
              <tbody><tr v-for="r in NA_T7" :key="r.type"><td>{{ r.type }}</td><td>{{ won(r.cnt) }}</td></tr></tbody>
            </table>
          </TabPanel>
          <TabPanel value="T8">
            <table class="ws-tb ws-tb--view"><tbody>
              <tr><th scope="row">참여기업</th><td>{{ won(NA_T8.totalCo) }}개사</td><th scope="row">참여인원</th><td>{{ won(NA_T8.totalWorker) }}명</td></tr>
              <tr><th scope="row">총 사용금액</th><td>{{ won(NA_T8.totalAmount) }}원</td><th scope="row">기업당 평균</th><td>{{ won(NA_T8.avgPerCo) }}원</td></tr>
            </tbody></table>
          </TabPanel>
          <TabPanel value="T9">
            <table class="ws-gtb"><thead><tr><th>업체(제휴사)</th><th>이용건수</th></tr></thead>
              <tbody><tr v-for="r in NA_T9" :key="r.name"><td>{{ r.name }}</td><td>{{ won(r.cnt) }}</td></tr></tbody>
            </table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </section>
    <p v-else class="ws-desc">이관 전 연도입니다.</p>

    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>제출 양식이 고정이라 템플릿 열 구성을 바꾸지 않는다.</li><li>T2~T5 · T8 · T9은 AS-IS 미조사 항목이 있어 내용이 단순화됐다(openQuestions 참고).</li></ul></div>
  </div>
</template>

<style scoped>
.yr { display: flex; align-items: center; gap: 8px; }
.yr__s { width: 120px; }
</style>
