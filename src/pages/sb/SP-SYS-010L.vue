<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-SYS-010L 관리자관리 관리자목록 — 지원기관 · 운영사 운영 계정 조회. 마스터(AM · OM) 전용 화면.
 * 행을 누르면 관리자상세(SP-SYS-010D)로 간다. 계정 등록은 상세 화면에서 한다(FN-02).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import { badgeClass } from '../../ws/badge'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import { can, denyTip } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { mask } from '../../ws/mask'
import { ADMINS, type SbAdmin, type AcctStatus } from '@fixtures/sb/B1'

const CODE = 'SP-SYS-010L'
const router = useRouter()

const TONE: Record<AcctStatus, 'success' | 'warning' | 'danger' | 'mute'> = { 사용: 'success', '임시 비밀번호': 'warning', 휴면: 'mute', 잠금: 'danger', 사용중지: 'danger' }
const ORG = [{ label: '전체', v: '' }, { label: '지원기관', v: '지원기관' }, { label: '운영사', v: '운영사' }]
const STS = [{ label: '전체', v: '' }, { label: '사용', v: '사용' }, { label: '임시 비밀번호', v: '임시 비밀번호' }, { label: '휴면', v: '휴면' }, { label: '잠금', v: '잠금' }, { label: '사용중지', v: '사용중지' }]

const blank = () => ({ name: '', org: '', sts: '' })
const f = ref(blank())
const applied = ref(blank())
const hit = (r: SbAdmin) => {
  const a = applied.value
  return (!a.org || r.org === a.org) && (!a.sts || r.status === a.sts) &&
    (!a.name.trim() || r.name.includes(a.name.trim()) || r.loginId.includes(a.name.trim()))
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => ADMINS.filter(hit), {
  failIf: () => applied.value.name.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(() => can(CODE, 'view'), () => requery())

function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

const columns = computed(() => {
  const ok = can(CODE, 'account'), tip = denyTip(CODE, 'account')
  return [
    { title: '조직', field: 'org', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '아이디', field: 'loginId', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '이름', field: 'name', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
    { title: '역할', field: 'role', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '사업 범위', field: 'bizScope', minWidth: 120, formatter: (c: any) => (c.getValue().length ? c.getValue().join(', ') : '전체') },
    { title: '계정 상태', field: 'status', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="${badgeClass(TONE[c.getValue() as AcctStatus])}">${c.getValue()}</span>` },
    { title: '최종 로그인', field: 'lastLoginAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '등록', field: 'createdAt', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
    {
      title: '신청', field: 'pending', width: 72, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: (c: any) => (c.getValue() ? `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>발급대기</button>` : '<span class="ws-desc">—</span>'),
      cellClick: (_: any, c: any) => { if (ok && c.getRow().getData().pending) openDetail(c.getRow().getData()) },
    },
  ]
})
const openDetail = (r: SbAdmin) => router.push({ path: routeOf('SP-SYS-010D'), query: { id: r.id } })
function newAccount() { router.push({ path: routeOf('SP-SYS-010D'), query: { id: 'new' } }) }
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="a-name">아이디 · 이름</label></th>
        <td><InputText id="a-name" v-model="f.name" fluid placeholder="아이디 또는 이름 일부" /></td>
        <th scope="row"><label for="a-org">조직</label></th>
        <td><Select v-model="f.org" input-id="a-org" :options="ORG" option-label="label" option-value="v" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="a-sts">계정 상태</label></th>
        <td colspan="3"><Select v-model="f.sts" input-id="a-sts" :options="STS" option-label="label" option-value="v" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">관리자 목록</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>명</span>
          <span class="ws-desc">지원기관 · 운영사 운영 계정 · 행을 누르면 상세</span>
        </div>
        <div class="ws-tit__r">
          <SbCan action="account"><Button label="계정 발급" @click="newAccount" /></SbCan>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>이 화면은 마스터(지원기관 마스터 · 운영사 마스터)만 들어온다 — 다른 역할은 상단 <b>역할</b>을 바꿔 버튼이 꺼지는 것으로 확인한다.</li>
        <li>마스터는 자기 조직(지원기관 또는 운영사)의 계정만 본다고 가정한다(미리보기는 전체를 섞어 보여 준다).</li>
        <li>이름은 목록에서 가려 보인다. 계정은 삭제하지 않고 사용중지로 비활성화한다.</li>
      </ul>
    </div>
  </div>
</template>
