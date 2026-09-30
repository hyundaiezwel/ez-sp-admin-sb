<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-PNT-010D 포인트관리 지급현황 지급상세 — 한 노동자의 포인트 구분별 배정 내역과
 * 사용 내역(적용일자 최신순 · 20건씩)을 보인다. AS-IS 회원별 포인트 사용기간 관리(S-003-13)를
 * 이 화면의 「사용기한 변경」(M1)으로 받는다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import PageHead from '../../app/PageHead.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsMasked from '../../ws/WsMasked.vue'
import WsPager from '../../ws/WsPager.vue'
import { notify } from '../../ws/notify'
import SbCan from '../../sb/SbCan.vue'
import { can } from '../../sb/context'
import { routeOf } from '../../sb/screens'
import { mask } from '../../ws/mask'
import { WORKERS, COMPANIES } from '@fixtures/sb/common'
import { assignsOfWorker, usageOfWorker } from '@fixtures/sb/B5'

const CODE = 'SP-PNT-010D'
const route = useRoute()
const router = useRouter()
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const workerId = ref('')
watch(() => route.query.id, (id) => { workerId.value = String(id ?? '') }, { immediate: true })
const worker = computed(() => WORKERS.find((w) => w.id === workerId.value) ?? null)
const company = computed(() => COMPANIES.find((c) => c.id === worker.value?.companyId) ?? null)
const bands = computed(() => (worker.value ? assignsOfWorker(worker.value.id) : []))
const totalBand = computed(() => bands.value.reduce((s, b) => ({
  initial: s.initial + b.initial, actual: s.actual + b.actual, used: s.used + b.used, remain: s.remain + b.remain,
}), { initial: 0, actual: 0, used: 0, remain: 0 }))

/* --- 사용 내역(쪽당 20건) ------------------------------------------------ */
const allUsage = computed(() => (worker.value ? usageOfWorker(worker.value.id) : []))
const first = ref(0)
const size = ref(20)
watch(workerId, () => (first.value = 0))
const pageRows = computed(() => allUsage.value.slice(first.value, first.value + size.value))

/* --- 사용기한 변경(M1) --------------------------------------------------- */
const editOpen = ref(false)
const canEdit = computed(() => can(CODE, 'update') && worker.value?.sts !== '이용정지' && worker.value?.sts !== '환불요청' && worker.value?.sts !== '환불완료')
function doEdit(p: ActionPayload) {
  if (!p.date) return notify('새 사용종료일을 정하세요.', 'danger')
  const start = new Date(bands.value[0]?.startAt.replace(/\./g, '-') ?? '2026-01-01')
  if (p.date < start || p.date < new Date()) return notify('종료일은 시작일 뒤여야 합니다.', 'danger')
  const before = bands.value[0]?.endAt ?? ''
  bands.value.forEach((b) => { b.endAt = `${p.date!.getFullYear()}.${String(p.date!.getMonth() + 1).padStart(2, '0')}.${String(p.date!.getDate()).padStart(2, '0')}` })
  history.value.unshift({ id: `H${Date.now()}`, at: '2026.09.30 15:00', by: '박*현(지원총괄)', before, after: bands.value[0]?.endAt ?? '', reason: p.text })
  notify('복지몰 반영이 끝난 뒤 사용종료일이 바뀌었습니다.', 'success')
}
interface HistRow { id: string; at: string; by: string; before: string; after: string; reason: string }
const history = ref<HistRow[]>([])
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <template v-if="worker && company">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l">
            <h2 class="ws-tit__h">{{ mask(worker.name, 'name') }}</h2>
            <span class="ws-desc">{{ worker.empNo }} · {{ company.name }} · {{ worker.sts }} · 유저키 {{ worker.id }}</span>
          </div>
          <div class="ws-tit__r">
            <SbCan action="update"><Button v-if="canEdit" label="사용기한 변경" severity="secondary" outlined @click="editOpen = true" /></SbCan>
            <span v-if="!canEdit && worker.sts !== '이용중'" class="ws-desc">이용정지 · 환불 진행 중인 노동자는 사용기한을 바꿀 수 없습니다.</span>
          </div>
        </div>
        <div class="ws-form">
          <div class="ws-form__row"><span class="ws-form__l">생년월일</span><span><WsMasked :value="worker.birth" kind="birth" label="생년월일" /></span></div>
          <div class="ws-form__row"><span class="ws-form__l">연락처</span><span><WsMasked :value="worker.phone" kind="phone" label="연락처" /></span></div>
          <div class="ws-form__row"><span class="ws-form__l">기업(사업자등록번호)</span><span>{{ company.name }} ({{ company.bizNo }})</span></div>
        </div>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">배정 내역</h2></div></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">포인트 구분</th><th scope="col">초기배정</th><th scope="col">실배정</th><th scope="col">사용</th><th scope="col">잔여</th><th scope="col">사용시작일</th><th scope="col">사용종료일</th></tr></thead>
          <tbody>
            <tr v-for="b in bands" :key="b.kind">
              <th scope="row">{{ b.kind }}</th>
              <td class="ws-num">{{ won(b.initial) }}</td>
              <td class="ws-num">{{ won(b.actual) }}<span v-if="b.actual !== b.initial" class="ws-badge ws-badge--warning" style="margin-left:6px">조정</span></td>
              <td class="ws-num">{{ won(b.used) }}</td>
              <td class="ws-num">{{ won(b.remain) }}</td>
              <td>{{ b.startAt }}</td><td>{{ b.endAt }}</td>
            </tr>
            <tr class="is-total"><th scope="row">합계</th><td class="ws-num">{{ won(totalBand.initial) }}</td><td class="ws-num">{{ won(totalBand.actual) }}</td><td class="ws-num">{{ won(totalBand.used) }}</td><td class="ws-num">{{ won(totalBand.remain) }}</td><td colspan="2"></td></tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">포인트 사용 내역</h2><span class="ws-total">총<strong>{{ allUsage.length }}</strong>건</span><span class="ws-desc">적용일자 최신순 · 20건씩 · 취소는 음수</span></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">적용일자</th><th scope="col">경로</th><th scope="col">사용처</th><th scope="col">금액</th><th scope="col">지원기관</th><th scope="col">기업</th><th scope="col">개인</th><th scope="col">상태</th></tr></thead>
          <tbody>
            <tr v-for="u in pageRows" :key="u.id" :class="{ 'is-danger': u.status === '취소' }">
              <td>{{ u.appliedAt }}</td><td>{{ u.channel }}</td><td>{{ u.affiliate }} · {{ u.desc }}</td>
              <td class="ws-num">{{ won(u.amount) }}</td>
              <td class="ws-num">{{ won(u.byKind['지원기관 포인트']) }}</td>
              <td class="ws-num">{{ won(u.byKind['기업 포인트']) }}</td>
              <td class="ws-num">{{ won(u.byKind['개인 포인트']) }}</td>
              <td><span :class="u.status === '취소' ? 'ws-badge ws-badge--danger' : 'ws-badge ws-badge--success'">{{ u.status }}</span></td>
            </tr>
            <tr v-if="!pageRows.length"><td colspan="8" class="ws-desc" style="text-align:center">사용 내역이 없습니다.</td></tr>
          </tbody>
        </table>
        <WsPager v-model:first="first" v-model:rows="size" :total="allUsage.length" :sizes="[20, 50, 100]" />
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">사용기한 변경 이력</h2></div></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">처리일시</th><th scope="col">처리자</th><th scope="col">변경 전</th><th scope="col">변경 후</th><th scope="col">사유</th></tr></thead>
          <tbody>
            <tr v-for="h in history" :key="h.id"><td>{{ h.at }}</td><td>{{ h.by }}</td><td>{{ h.before }}</td><td>{{ h.after }}</td><td>{{ h.reason }}</td></tr>
            <tr v-if="!history.length"><td colspan="5" class="ws-desc" style="text-align:center">변경 이력이 없습니다.</td></tr>
          </tbody>
        </table>
      </section>
    </template>
    <div v-else class="ws-empty">
      <p>노동자를 찾을 수 없습니다.</p>
      <Button label="지급목록으로" severity="secondary" outlined @click="router.push(routeOf('SP-PNT-010L'))" />
    </div>

    <WsActionDialog
      v-model:visible="editOpen" code="SP-PNT-010D-M1" header="포인트 사용기한 변경"
      :target="worker ? `${mask(worker.name, 'name')} — 현재 사용종료일 ${bands[0]?.endAt}` : ''"
      :date="{ label: '새 사용종료일' }" :reason="{ label: '변경 사유', required: true, min: 10, max: 200 }"
      notice="복지몰 반영 결과를 받은 뒤 화면 값이 바뀝니다." confirm-label="변경" @confirm="doEdit"
    />
  </div>
</template>
