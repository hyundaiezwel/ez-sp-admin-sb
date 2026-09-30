<script setup lang="ts">
/**
 * 기업 기초정보 상세 — AS-IS S-003-04-D (+ 영역 D1~D3).
 *
 * AS-IS 한 장이 2,000px을 넘는다: 신청정보 → 협약 → 환불 → 입금 → 모집인원 이력 → 메모 이력,
 * 저장은 맨 아래. 미리보기에서 더한 것:
 *   - 위: 생애주기 단계(21상태 중 어디인지) + 구획 바로가기(따라온다)
 *   - 아래: 버튼줄이 붙어 따라온다 — 고친 게 있으면 저장이 켜진다
 *   - 담당자 연락처 · 환불계좌는 가려서 싣고, 열면 기록한다
 * 주소가 있다(`/sp/basic-info/C-03012`). AS-IS는 폼 POST로만 열려 새로고침하면 사라졌다.
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import WsAnchorNav from '../../ws/WsAnchorNav.vue'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsMasked from '../../ws/WsMasked.vue'
import WsFileView from '../../ws/WsFileView.vue'
import WsActionDialog from '../../ws/WsActionDialog.vue'
import SpStatus from '../../sp/SpStatus.vue'
import { notify } from '../../ws/notify'
import { lifecycle } from '../../sp/status'
import { CO_FG, MAIN_LINE, bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { basicStore } from '../../sp/stores'
import { makeBasic, JUDGES, type BasicRow } from '@fixtures/sp'

const route = useRoute()
const router = useRouter()
const row = computed(() => basicStore(ctxKey(), () => makeBasic(ctxKey(), ctx.year)).find((r) => r.id === route.params.id) as BasicRow | undefined)

/* 고칠 수 있는 칸만 폼으로 복사한다 — 원본과 비교해 저장 버튼을 켠다 */
const form = reactive({ name: '', coFg: '', corp: 'Y', addr: '', added: 0, bank: '', holder: '' })
const load = () => { if (row.value) Object.assign(form, { name: row.value.name, coFg: row.value.coFg, corp: 'Y', addr: `${row.value.region} 중앙로 12`, added: row.value.added, bank: '국민은행', holder: row.value.name.slice(0, 8) }) }
const base = ref('')
watch(row, () => { load(); base.value = JSON.stringify(form) }, { immediate: true })
const dirty = computed(() => JSON.stringify(form) !== base.value)
function save() {
  if (!row.value) return
  Object.assign(row.value, { name: form.name, coFg: form.coFg, added: form.added, final: row.value.first + form.added })
  base.value = JSON.stringify(form)
  notify('저장했습니다', 'success')
}

const life = computed(() => lifecycle(row.value?.sts ?? '110'))
const steps = MAIN_LINE.map((s) => ({ label: s }))
const sections = [
  { id: 'd-apply', label: '신청정보' }, { id: 'd-agree', label: '협약정보' }, { id: 'd-pay', label: '입금정보' },
  { id: 'd-refund', label: '환불정보' }, { id: 'd-hist', label: '모집인원 이력' }, { id: 'd-memo', label: '메모 이력' },
]
const won = (n: number) => n.toLocaleString('ko-KR')
const share = computed(() => { const f = (row.value?.first ?? 0) + form.added; return { ci: f * 300_000, org: f * 100_000 } })

const docsOpen = ref(false)
const docs = [
  { name: '참여확인서.pdf', kind: 'PDF', size: '220KB' }, { name: '재직증빙_4대보험.pdf', kind: 'PDF', size: '1.1MB' },
  { name: '통장사본.jpg', kind: 'JPG', size: '380KB' },
]
const restoreOpen = ref(false)
const memo = ref('')
const memos = ref([
  { no: 2, text: '담당자 통화 — 추가 인원 서류 다음 주 제출 예정', at: '2026.09.14', by: JUDGES[0] },
  { no: 1, text: '재직증빙 재요청', at: '2026.09.02', by: JUDGES[1] },
])
function addMemo() {
  memos.value.unshift({ no: memos.value.length + 1, text: memo.value.trim(), at: '2026.09.28', by: '김하늘' })
  memo.value = ''
}
</script>

<template>
  <div v-if="!row" class="ws-page">
    <PageHead title="기업 기초정보" />
    <div class="ws-empty">
      <p>이 기업은 지금 전역 조건({{ ctx.year }}년 · {{ bizLabel(ctx.biz) }})에 없습니다.</p>
      <p class="ws-desc">오른쪽 위 전역 조건을 바꾸면 다른 사업의 기업이 보인다.</p>
      <Button label="목록으로" severity="secondary" outlined @click="router.push('/sp/basic-info')" />
    </div>
  </div>

  <div v-else class="ws-page">
    <PageHead :title="row.name" />

    <section class="ws-sec">
      <div class="hd">
        <dl class="hd__kv">
          <div><dt>상태</dt><dd><SpStatus :code="row.sts" /></dd></div>
          <div><dt>사업</dt><dd>{{ bizLabel(ctx.biz) }}</dd></div>
          <div><dt>접수번호</dt><dd>{{ row.receiptNo }}</dd></div>
          <div><dt>차수</dt><dd>{{ row.round }}차</dd></div>
          <div><dt>입금기한</dt><dd>{{ row.due }}</dd></div>
        </dl>
        <WsStepTrack :steps="steps" :current="life.current" :branch="life.branch" label="참여 생애주기" />
      </div>
    </section>

    <WsAnchorNav :sections="sections" />

    <section :id="sections[0].id" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">신청정보</h2></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req"><label for="d-name">기업명</label></th>
            <td><InputText id="d-name" v-model="form.name" fluid maxlength="60" /></td>
            <th scope="row">사업자번호</th>
            <td>{{ row.bizNo }}</td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="d-co">기업구분</label></th>
            <td><Select v-model="form.coFg" input-id="d-co" :options="CO_FG" option-label="label" option-value="code" fluid /></td>
            <th scope="row">법인여부</th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-label="법인여부">
                <div class="ws-radio"><RadioButton v-model="form.corp" input-id="d-corp-y" name="d-corp" value="Y" /><label for="d-corp-y">법인</label></div>
                <div class="ws-radio"><RadioButton v-model="form.corp" input-id="d-corp-n" name="d-corp" value="N" /><label for="d-corp-n">개인</label></div>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="d-addr">소재지</label></th>
            <td colspan="3"><InputText id="d-addr" v-model="form.addr" fluid maxlength="100" /></td>
          </tr>
          <tr>
            <th scope="row">담당자</th>
            <td>{{ row.manager }}</td>
            <th scope="row">연락처</th>
            <td><div class="ct"><WsMasked :value="row.phone" kind="phone" label="담당자 휴대폰" /><WsMasked :value="row.email" kind="email" label="담당자 이메일" /></div></td>
          </tr>
          <tr>
            <th scope="row">참여경로</th>
            <td>{{ row.channel }}</td>
            <th scope="row">발전모델</th>
            <td>{{ row.growth ? '대상' : '비대상' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section :id="sections[1].id" class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">협약정보</h2></div>
        <div class="ws-tit__r"><Button label="제출서류 보기" severity="secondary" outlined class="ws-line" @click="docsOpen = true" /></div>
      </div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr><th scope="row">참여신청일</th><td>{{ row.appliedAt }}</td><th scope="row">추가신청일</th><td>{{ row.appliedLast || '—' }}</td></tr>
          <tr>
            <th scope="row">참여근로자수</th>
            <td colspan="3">
              <div class="hc">
                <span>최초 <b>{{ won(row.first) }}</b>명</span><span aria-hidden="true">+</span>
                <label for="d-add">추가</label><InputNumber v-model="form.added" input-id="d-add" :min="0" :max="999" suffix="명" class="hc__n" />
                <span aria-hidden="true">=</span><span>최종 <b>{{ won(row.first + form.added) }}</b>명</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section :id="sections[2].id" class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">입금정보</h2><span class="ws-desc">기업+개인 3 : 지원기관 1 — 분할 입금 불가</span></div>
        <div class="ws-tit__r">
          <Button label="입금확인증 출력" severity="secondary" outlined class="ws-line" :disabled="!['520', '610'].includes(row.sts)" @click="notify('입금확인증을 출력했습니다(미리보기)')" />
          <Button label="참여증서 출력" severity="secondary" outlined class="ws-line" :disabled="row.sts !== '610'" @click="notify('참여증서를 출력했습니다(미리보기)')" />
        </div>
      </div>
      <table class="ws-gtb">
        <thead>
          <tr><th scope="col">가상계좌</th><th scope="col" class="g">기업+개인 분담금</th><th scope="col">지원기관 지원금</th><th scope="col" class="g">입금기한</th><th scope="col">입금 상태</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>지정은행 391-910{{ row.receiptNo.slice(-6) }}</td>
            <td class="ws-num g">{{ won(share.ci) }}원</td>
            <td class="ws-num">{{ won(share.org) }}원</td>
            <td class="g">{{ row.due }}</td>
            <td><SpStatus :code="row.sts" /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section :id="sections[3].id" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">환불정보</h2><span class="ws-desc">이용정지된 근로자 몫을 기업 계좌로 일괄 환불한다(운영지침)</span></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row"><label for="d-bank">은행</label></th>
            <td><Select v-model="form.bank" input-id="d-bank" :options="['하나은행', '국민은행', '신한은행', '우리은행', '기업은행', '농협은행']" fluid /></td>
            <th scope="row"><label for="d-holder">예금주</label></th>
            <td><InputText id="d-holder" v-model="form.holder" fluid maxlength="8" /><span class="ws-desc">8자 이내</span></td>
          </tr>
          <tr>
            <th scope="row">계좌번호</th>
            <td colspan="3"><div class="ct"><WsMasked :value="`110-${row.bizNo.replace(/-/g, '').slice(0, 7)}-01`" kind="account" label="환불 계좌번호" /><Button label="통장사본 보기" severity="secondary" text size="small" @click="docsOpen = true" /></div></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section :id="sections[4].id" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">모집인원 이력</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">차수</th><th scope="col">참여인원</th><th scope="col">상태 · 메모</th><th scope="col">수정일</th><th scope="col">심사자</th></tr></thead>
        <tbody>
          <tr v-if="row.added"><td class="ws-num">2</td><td class="ws-num">+{{ row.added }}</td><td>추가신청 승인</td><td>{{ row.appliedLast }}</td><td>{{ JUDGES[2] }}</td></tr>
          <tr><td class="ws-num">1</td><td class="ws-num">{{ row.first }}</td><td>최초 신청</td><td>{{ row.appliedAt }}</td><td>{{ JUDGES[0] }}</td></tr>
        </tbody>
      </table>
    </section>

    <section :id="sections[5].id" class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">메모 이력</h2><span class="ws-total">총<strong>{{ memos.length }}</strong>건</span></div></div>
      <div class="mm">
        <Textarea v-model="memo" rows="2" fluid maxlength="100" placeholder="메모 입력 — 100자" aria-label="새 메모" />
        <Button label="등록" severity="secondary" outlined :disabled="!memo.trim()" @click="addMemo" />
      </div>
      <table class="ws-gtb" style="margin-top: 8px">
        <thead><tr><th scope="col" style="width: 64px">번호</th><th scope="col">메모</th><th scope="col" style="width: 110px">등록일</th><th scope="col" style="width: 90px">담당자</th></tr></thead>
        <tbody><tr v-for="m in memos" :key="m.no"><td class="ws-num">{{ m.no }}</td><td>{{ m.text }}</td><td>{{ m.at }}</td><td>{{ m.by }}</td></tr></tbody>
      </table>
    </section>

    <div class="ws-actionbar">
      <div class="ws-actionbar__l"><SpStatus :code="row.sts" /><span v-if="dirty">고친 내용이 있다 — 저장 전</span></div>
      <Button label="목록" severity="secondary" outlined @click="router.push('/sp/basic-info')" />
      <Button v-if="row.sts === '390'" label="확인서 파기 철회" severity="secondary" outlined @click="restoreOpen = true" />
      <Button label="저장" severity="contrast" :disabled="!dirty" @click="save" />
    </div>

    <WsFileView v-model:visible="docsOpen" :title="`${row.name} 제출서류`" :files="docs" />
    <WsActionDialog
      v-model:visible="restoreOpen" header="확인서 파기 철회" :target="row.name"
      :reason="{ label: '철회 사유', required: true, max: 200 }"
      notice="기업담당자에게 파기 철회 안내 LMS 및 E-Mail이 발송됩니다."
      confirm-label="철회" @confirm="row.sts = '410'; notify('파기를 철회했습니다 — 최종제출로 돌아갔다', 'success')"
    />
  </div>
</template>

<style scoped>
.hd { display: grid; gap: var(--ws-gap-block); padding: 16px 20px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); background: var(--ws-surface-sunken); }
.hd__kv { display: flex; flex-wrap: wrap; gap: 8px 32px; }
.hd__kv div { display: flex; align-items: center; gap: 8px; }
.hd__kv dt { color: var(--ws-text-sub); }
.hd__kv dd { font-weight: 600; }
.ct { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 16px; }
.hc { display: flex; align-items: center; gap: 8px; }
.hc__n :deep(input) { width: 96px; }
.mm { display: flex; gap: 6px; align-items: flex-start; }
</style>
