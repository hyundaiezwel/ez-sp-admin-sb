<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-SYS-020P 이력 관리자 접속이력 — 로그인 성공 · 실패, 2차 인증 실패, 로그아웃 사유, 잠금 전환을 조회만 한다.
 * 마스터(AM · OM)가 자기 조직 계정의 이력을 본다. 수정 · 삭제 없음.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import { presetRange, PRESETS, type Range } from '../../ws/period'
import { badgeClass } from '../../ws/badge'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import { ACCESS_LOGS, type SbAccessLog, type LoginResult } from '@fixtures/sb/B1'
import WsDownload from '../../ws/WsDownload.vue'
import Checkbox from 'primevue/checkbox'

const route = useRoute()
const TONE: Record<LoginResult, 'success' | 'danger' | 'warning' | 'mute'> = {
  '로그인 성공': 'success', '비밀번호 실패': 'danger', '2차 인증 실패': 'danger', '잠금 전환': 'danger',
  '수동 로그아웃': 'mute', '자동 로그아웃': 'mute', '중복 로그인 종료': 'warning', '계정 사용중지 로그아웃': 'warning',
}
const RESULTS: LoginResult[] = ['로그인 성공', '비밀번호 실패', '2차 인증 실패', '잠금 전환', '수동 로그아웃', '자동 로그아웃', '중복 로그인 종료', '계정 사용중지 로그아웃']

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, name: '', result: 'ALL', anomaly: false })
const f = ref(blank())
const applied = ref(blank())
onMounted(() => { if (route.query.admin) { const a = ACCESS_LOGS.find((x) => x.adminId === route.query.admin); if (a) { f.value.name = a.adminName; applied.value.name = a.adminName } } })

const day = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const hit = (r: SbAccessLog) => {
  const a = applied.value
  const d = day(r.at)
  return (!a.name.trim() || r.adminName.includes(a.name.trim()) || r.adminId.includes(a.name.trim())) &&
    (a.result === 'ALL' || r.result === a.result) && (!a.anomaly || r.anomaly) &&
    (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1])
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => ACCESS_LOGS.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const columns = computed(() => [
  { title: '일시', field: 'at', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '조직', field: 'org', width: 80, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '아이디', field: 'adminId', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '이름', field: 'adminName', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '결과', field: 'result', width: 150, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="${badgeClass(TONE[c.getValue() as LoginResult])}">${c.getValue()}</span>` },
  { title: '접속 IP', field: 'ip', width: 130, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '브라우저', field: 'browser', minWidth: 160 },
])
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="l-from">조회기간</label></th>
        <td colspan="3"><WsPeriod id="l-from" v-model="f.range" :limit="{ maxYears: 1 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="l-name">아이디 · 이름</label></th>
        <td><InputText id="l-name" v-model="f.name" fluid /></td>
        <th scope="row"><label for="l-result">결과</label></th>
        <td><Select v-model="f.result" input-id="l-result" :options="[{ l: '전체', v: 'ALL' }, ...RESULTS.map((r) => ({ l: r, v: r }))]" option-label="l" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="l-anom">이상 징후</label></th>
        <td colspan="3"><div class="ws-check"><Checkbox v-model="f.anomaly" input-id="l-anom" binary /><label for="l-anom">실패 · 잠금 전환만</label></div></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">접속이력</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span>
          <span class="ws-desc">최신순 · 조회만 가능 · 수정 · 삭제 불가</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="download"><WsDownload :total="total" :limit="50000" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>마스터(지원기관 마스터 · 운영사 마스터)만 들어온다. 다른 역할은 상단 <b>역할</b>에서 바꿔 확인한다.</li>
        <li>비밀번호 실패 · 2차 인증 실패 · 잠금 전환은 이상 징후로 강조한다(FN-03).</li>
        <li>개인정보는 담지 않아 다운로드에 사유 등록이 필요 없다.</li>
      </ul>
    </div>
  </div>
</template>
