<script setup lang="ts">
/**
 * 공통코드 — 마스터·디테일 2단 연동. 좌측을 고르면 우측이 따라온다.
 * 관리자 센터에서 옮겨 지원 사업 코드 사전(`sp/codes.ts`)을 싣는다(2026-09-28). 코드값은 미리보기용으로 지어낸 값이다.
 *
 * 마스터는 조회 전용 소량이라 Tabulator를 띄우지 않고 정적 표(`.ws-gtb`)로 둔다 —
 * 50행 이하 조회 전용은 정적 표가 규칙이다. 두 표가 같은 치수라 섞여도 한 화면으로 읽힌다.
 *
 * 행 선택은 **행 안의 버튼**으로 받는다. `<tr>`에 click만 걸면 키보드로는 고를 수 없다.
 */
import { computed, onMounted, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import WsSearch from '../../ws/WsSearch.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { badgeClass, type Tone } from '../../ws/badge'
import { useMockQuery, ERROR_KEYWORD } from '../../app/useMockQuery'
import { CO_FG, HANDLE, ROLES, STATES, SUSPEND_REASONS } from '../../sp/codes'
import { MEMBER_STS } from '@fixtures/sp'

interface Group { code: string; name: string; count: number; use: 'Y' | 'N' }
interface Detail { code: string; name: string; tone: Tone; sort: number; use: 'Y' | 'N' }

const rows = (xs: { code: string; label: string; tone?: Tone }[]): Detail[] =>
  xs.map((x, i) => ({ code: x.code, name: x.label, tone: x.tone ?? 'neutral', sort: i + 1, use: 'Y' }))
const DETAILS: Record<string, Detail[]> = {
  CO_STATE: rows(STATES),
  MBR_STATE: rows(MEMBER_STS.map((m) => ({ ...m, tone: m.tone as Tone }))),
  CO_FG: rows(CO_FG),
  ROLE: rows(ROLES),
  SUSPEND: rows(SUSPEND_REASONS.map((label, i) => ({ code: `S${i + 1}`, label }))),
  SCRAP_HANDLE: rows(HANDLE),
}
const GROUPS: Group[] = [
  { code: 'CO_STATE', name: '기업 참여 상태', count: 0, use: 'Y' },
  { code: 'MBR_STATE', name: '참여회원 상태', count: 0, use: 'Y' },
  { code: 'CO_FG', name: '기업 구분', count: 0, use: 'Y' },
  { code: 'ROLE', name: '관리자 역할', count: 0, use: 'Y' },
  { code: 'SUSPEND', name: '이용정지 사유', count: 0, use: 'Y' },
  { code: 'SCRAP_HANDLE', name: '적발 조치 상태', count: 0, use: 'Y' },
  { code: 'LEGACY_TYPE', name: '(구) 분류 코드', count: 3, use: 'N' },
].map((g) => ({ ...g, count: DETAILS[g.code]?.length ?? g.count }) as Group)

const selected = ref<Group>(GROUPS[0])
const keyword = ref('')
const { rows: groups, loading, error, reload } = useMockQuery(
  () => GROUPS.filter((g) => !keyword.value || g.name.includes(keyword.value) || g.code.includes(keyword.value)),
  { latency: 300, failIf: () => keyword.value.includes(ERROR_KEYWORD) },
)
onMounted(reload)
const details = computed(() => DETAILS[selected.value.code] ?? [])
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '', '', '', '']" @search="reload" @reset="keyword = ''; reload()">
      <tr>
        <th scope="row"><label for="c-kw">검색어</label></th>
        <td><InputText id="c-kw" v-model="keyword" fluid placeholder="그룹명 또는 코드" /></td>
        <td colspan="4" />
      </tr>
    </WsSearch>

    <div class="cols">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">코드 그룹</h2><span class="ws-total">총<strong>{{ groups.length }}</strong>건</span></div>
          <div class="ws-tit__r"><Button label="그룹 추가" severity="contrast" /></div>
        </div>
        <QueryState :loading="loading" :error="error" :empty="groups.length === 0" :lines="6" @retry="reload">
          <table class="ws-gtb">
            <caption class="ws-sr-only">코드 그룹 — 그룹명을 누르면 오른쪽에 하위 코드가 나온다</caption>
            <colgroup><col style="width: 132px" /><col /><col style="width: 56px" /><col style="width: 68px" /></colgroup>
            <thead><tr><th scope="col">그룹코드</th><th scope="col">그룹명</th><th scope="col">건수</th><th scope="col">사용</th></tr></thead>
            <tbody>
              <tr v-for="g in groups" :key="g.code" :class="{ 'is-on': g.code === selected.code }" @click="selected = g">
                <td class="code">{{ g.code }}</td>
                <td><button type="button" class="pick" :aria-pressed="g.code === selected.code" @click.stop="selected = g">{{ g.name }}</button></td>
                <td class="ws-num">{{ g.count }}</td>
                <td style="text-align: center"><span :class="badgeClass(g.use === 'Y' ? 'success' : 'mute')">{{ g.use === 'Y' ? '사용' : '미사용' }}</span></td>
              </tr>
            </tbody>
          </table>
        </QueryState>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">{{ selected.name }}</h2><span class="code">{{ selected.code }}</span></div>
          <div class="ws-tit__r"><Button label="코드 추가" severity="secondary" outlined class="ws-line" /></div>
        </div>
        <table v-if="details.length" class="ws-gtb">
          <caption class="ws-sr-only">{{ selected.name }} 하위 코드</caption>
          <thead><tr><th scope="col">코드</th><th scope="col">이름</th><th scope="col">뱃지</th><th scope="col">정렬</th><th scope="col">사용</th></tr></thead>
          <tbody>
            <tr v-for="d in details" :key="d.code">
              <td class="code">{{ d.code }}</td>
              <td>{{ d.name }}</td>
              <td style="text-align: center"><span :class="badgeClass(d.tone)">{{ d.name }}</span></td>
              <td class="ws-num">{{ d.sort }}</td>
              <td style="text-align: center">{{ d.use }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="ws-empty" style="border-top: 1px solid var(--ws-border-strong)">이 그룹의 하위 코드는 목업에 없습니다.</div>

        <div class="ws-msg" style="margin-top: 12px">
          <ul>
            <li>뱃지 색(<code>tone</code>)이 코드 속성으로 내려온다. 기획이 라벨·색을 바꿔도 프론트 배포가 필요 없다.</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cols { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr); gap: var(--ws-gap-region); }
.code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--ws-font-size-sm); color: var(--ws-text-sub); }
.pick { padding: 0; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; }
.pick[aria-pressed='true'] { color: var(--ws-text-brand); font-weight: 700; }
.ws-gtb tbody tr { cursor: pointer; }
</style>
