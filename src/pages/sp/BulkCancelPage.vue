<script setup lang="ts">
/**
 * 일괄 참여 취소 — AS-IS S-003-15 (난이도 5, 비가역).
 *
 * AS-IS: 조건을 고르고 조회하면 목록이 나오고, `일괄참여취소처리` 버튼 하나로 전부 취소된다.
 * 예외 기업을 화이트리스트로 빼는 칸이 같은 화면 가운데에 있다. 되돌리기는 없다.
 *
 * 미리보기는 네 단계로 편다 — **조건 → 대상 확인(예외) → 최종 확인 → 결과.**
 *   - 조회 결과가 곧 실행 대상이다(드라이런). 실행 전에 몇 곳이 빠지는지 보인다
 *   - 최종 확인에서 **건수를 직접 친다.** 버튼 한 번으로 1,500곳이 취소되지 않게 한다
 *   - 권한은 사업총괄(가정). 권한이 없으면 확인 단계까지 보되 실행만 막는다
 *   - 결과는 감사 기록 번호와 함께 남는다
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'
import DatePicker from 'primevue/datepicker'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import { statusHtml } from '../../sp/status'
import { bizLabel, coFgLabel } from '../../sp/codes'
import { ctx, ctxKey, can, needRole } from '../../sp/context'
import { memo, basicStore } from '../../sp/stores'
import { makeIntake, makeBasic } from '@fixtures/sp'

/** `src`는 원본 행 — 실행하면 원본 상태가 바뀌어 같은 조건으로 다시 조회해도 나오지 않는다 */
interface Target { id: string; name: string; receiptNo: string; bizNo: string; coFg: string; at: string; sts: string; src: { sts: string } }

const CONDS = [
  { code: '130', label: '보완필요 — 기한 안에 보완하지 않은 기업' },
  { code: '220', label: '선정완료 — 참여회원을 등록하지 않은 기업' },
  { code: '510', label: '등록승인 — 분담금을 입금하지 않은 기업' },
]
const step = ref(0)
const cond = ref('130')
const until = ref<Date | null>(new Date())
const snapAt = ref('')
const targets = ref<Target[]>([])
const except = ref<Target[]>([])
const typed = ref('')
const auditId = ref('')
const result = ref<{ open: boolean; ok: number; fails: ResultItem[] }>({ open: false, ok: 0, fails: [] })

function query() {
  const key = ctxKey()
  const src: Target[] = cond.value === '510'
    ? basicStore(key, () => makeBasic(key, ctx.year)).filter((r) => r.sts === '510').map((r) => ({ id: r.id, name: r.name, receiptNo: r.receiptNo, bizNo: r.bizNo, coFg: r.coFg, at: r.appliedAt, sts: r.sts, src: r }))
    : memo('intake', key, () => makeIntake(key, ctx.year)).filter((r) => r.sts === cond.value).map((r) => ({ id: r.id, name: r.name, receiptNo: r.receiptNo, bizNo: r.bizNo, coFg: r.coFg, at: r.joinedAt, sts: r.sts, src: r }))
  targets.value = src
  except.value = []
  snapAt.value = new Date().toTimeString().slice(0, 8)
  step.value = 1
}

const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const selected = ref(0)
const pool = computed(() => targets.value.filter((t) => !except.value.includes(t)))
const columns = [
  { title: '기업명', field: 'name', minWidth: 180 },
  { title: '접수번호', field: 'receiptNo', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '사업자번호', field: 'bizNo', width: 124, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업구분', field: 'coFg', width: 120, formatter: (c: any) => coFgLabel(c.getValue()) },
  { title: '접수일', field: 'at', width: 104, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '지금 상태', field: 'sts', width: 150, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
]
function addExcept() {
  const ids = new Set((grid.value?.selectedData() ?? []).map((r: any) => r.id))
  except.value = [...except.value, ...targets.value.filter((t) => ids.has(t.id))]
  grid.value?.clearSelection()
}

const fmt = (n: number) => n.toLocaleString('ko-KR')
const expected = computed(() => fmt(pool.value.length))
const typedOk = computed(() => typed.value.replace(/[,\s]/g, '') === String(pool.value.length))

function run() {
  const rows = pool.value
  // 미입금(510)은 참여취소(미입금) 590, 나머지는 참여취소 139
  rows.forEach((t) => { t.src.sts = cond.value === '510' ? '590' : '139' })
  const noticeFail = rows.filter((_, i) => i % 97 === 11)
  auditId.value = `AUD-${Date.now().toString(36).toUpperCase()}`
  result.value = {
    open: true, ok: rows.length,
    fails: noticeFail.map((r) => ({ target: r.name, reason: 'EMAIL 주소 정보가 없어 취소 안내 E-Mail 전송 실패', kind: 'notice' as const })),
  }
  step.value = 3
}
function restart() { step.value = 0; typed.value = ''; targets.value = []; except.value = [] }
const condLabel = computed(() => CONDS.find((c) => c.code === cond.value)?.label ?? '')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <WsStepTrack
        :steps="[{ label: '조건', sub: '무엇을 취소하나' }, { label: '대상 확인', sub: '예외 빼기' }, { label: '최종 확인', sub: '건수 입력' }, { label: '결과', sub: '감사 기록' }]"
        :current="step" label="일괄 참여 취소 단계"
      />
    </section>

    <!-- 1 조건 -->
    <section v-if="step === 0" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">취소 조건</h2><span class="ws-desc">{{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req">취소 대상</th>
            <td>
              <div class="ws-choices ws-choices--v" role="radiogroup" aria-label="취소 대상">
                <div v-for="c in CONDS" :key="c.code" class="ws-radio"><RadioButton v-model="cond" :input-id="`bc-${c.code}`" name="bc" :value="c.code" /><label :for="`bc-${c.code}`">{{ c.label }}</label></div>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="bc-until">기준일</label></th>
            <td><DatePicker v-model="until" input-id="bc-until" date-format="yy.mm.dd" show-icon icon-display="input" style="width: 160px" /><span class="ws-desc">이 날짜까지 해소되지 않은 기업이 대상이다</span></td>
          </tr>
        </tbody>
      </table>
      <div class="ws-btnbox" style="margin-top: 16px"><div class="ws-btnbox__c"><Button label="대상 조회" @click="query" /></div></div>
    </section>

    <!-- 2 대상 확인 -->
    <template v-if="step === 1">
      <p class="ws-callout"><b>드라이런</b> 아직 아무것도 바뀌지 않았다. 아래 {{ fmt(targets.length) }}곳이 조회 시각 {{ snapAt }} 기준 취소 대상이다. 빼야 할 기업을 골라 예외로 옮긴다.</p>
      <div class="ws-split ws-split--21">
        <section class="ws-sec">
          <div class="ws-tit">
            <div class="ws-tit__l"><h2 class="ws-tit__h">취소 대상</h2><span class="ws-total">총<strong>{{ fmt(pool.length) }}</strong>곳</span><span class="ws-desc">선택 {{ selected }}</span></div>
            <div class="ws-tit__r"><Button label="선택 기업 예외 처리" severity="secondary" outlined class="ws-line" :disabled="!selected" @click="addExcept" /></div>
          </div>
          <TabGrid ref="grid" :columns="columns" :rows="pool" height="420px" @selection-change="selected = $event" />
        </section>
        <section class="ws-sec">
          <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">예외 기업</h2><span class="ws-total">총<strong>{{ except.length }}</strong>곳</span></div></div>
          <table class="ws-gtb">
            <thead><tr><th scope="col">기업명</th><th scope="col" style="width: 72px">빼기</th></tr></thead>
            <tbody>
              <tr v-for="t in except" :key="t.id"><td>{{ t.name }}</td><td style="text-align: center"><button type="button" class="ws-cellbtn" :aria-label="`${t.name} 예외에서 빼기`" @click="except = except.filter((x) => x !== t)">빼기</button></td></tr>
              <tr v-if="!except.length"><td colspan="2" class="ws-desc" style="text-align: center">예외로 옮긴 기업이 없다</td></tr>
            </tbody>
          </table>
        </section>
      </div>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="조건 다시 고르기" severity="secondary" outlined @click="step = 0" />
        <Button label="다음 — 최종 확인" severity="contrast" :disabled="!pool.length" @click="step = 2; typed = ''" />
      </div></div>
    </template>

    <!-- 3 최종 확인 -->
    <section v-if="step === 2" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">최종 확인</h2></div></div>
      <div class="fin">
        <dl class="fin__sum">
          <div><dt>조건</dt><dd>{{ condLabel }}</dd></div>
          <div><dt>조회</dt><dd>{{ fmt(targets.length) }}곳 <small>({{ snapAt }} 기준)</small></dd></div>
          <div><dt>예외</dt><dd>{{ except.length }}곳</dd></div>
          <div class="is-key"><dt>취소</dt><dd>{{ expected }}곳</dd></div>
        </dl>
        <p class="ws-callout ws-callout--danger"><b>되돌릴 수 없음</b> 취소한 기업은 참여취소 상태가 되고 복구 기능이 없다. 기업담당자 {{ expected }}명에게 참여취소 LMS 및 E-Mail이 발송된다.</p>
        <p v-if="!can('bulk-cancel')" class="ws-callout ws-callout--warn"><b>권한 없음</b> 실행은 {{ needRole('bulk-cancel') }}만 할 수 있다(가정). 오른쪽 위 전역 조건의 역할을 바꿔 볼 수 있다.</p>
        <div class="fin__type">
          <label for="bc-typed">확인을 위해 취소할 건수 <b>{{ expected }}</b>을 입력하세요</label>
          <InputText id="bc-typed" v-model="typed" inputmode="numeric" :placeholder="expected" :invalid="!!typed && !typedOk" style="width: 200px" />
        </div>
      </div>
      <div class="ws-btnbox" style="margin-top: 16px"><div class="ws-btnbox__c">
        <Button label="이전" severity="secondary" outlined @click="step = 1" />
        <Button :label="`${expected}곳 일괄 참여 취소`" severity="danger" :disabled="!typedOk || !can('bulk-cancel')" @click="run" />
      </div></div>
    </section>

    <!-- 4 결과 -->
    <section v-if="step === 3" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">처리 결과</h2></div></div>
      <p class="ws-callout"><b>완료</b> {{ fmt(result.ok) }}곳을 취소했다. 통지 실패 {{ result.fails.length }}건. 감사 기록 <code>{{ auditId }}</code> — 실행자 · 시각 · 조건 · 예외 목록이 함께 남았다.</p>
      <div class="ws-btnbox" style="margin-top: 16px"><div class="ws-btnbox__c">
        <Button label="결과 다시 보기" severity="secondary" outlined @click="result.open = true" />
        <Button label="새로 시작" @click="restart" />
      </div></div>
    </section>

    <WsResultDialog v-model:visible="result.open" header="일괄 참여 취소 결과" :ok="result.ok" :fails="result.fails" :audit-id="auditId" />
  </div>
</template>

<style scoped>
.fin { display: grid; gap: var(--ws-gap-block); max-width: 720px; }
.fin__sum { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.fin__sum div { padding: 12px 14px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.fin__sum dt { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.fin__sum dd { margin-top: 4px; font-weight: 700; }
.fin__sum .is-key { border-color: var(--ws-text-danger); }
.fin__sum .is-key dd { color: var(--ws-text-danger); font-size: 20px; }
.fin__type { display: grid; gap: 8px; }
</style>
