<!-- SB-DONE -->
<script setup lang="ts">
/** SP-OPS-070P 부적합 상품 관리 — 명세 src/specs/SP-OPS-070P.json */
import { computed, onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import SbCan from '../../sb/SbCan.vue'
import SbCode from '../../sb/SbCode.vue'
import { can, denyTip } from '../../sb/context'
import { shopProducts, PARTNER_OPTIONS, type ShopProduct, type ShopType } from '@fixtures/sb/B6'

const CODE = 'SP-OPS-070P'
const SHOP_TYPE: ShopType[] = ['숙박', '여행', '레저입장권', '교통편의']

const blank = () => ({ kw: '', type: '', partner: '' })
const f = ref(blank())
const applied = ref(blank())
const hit = (r: ShopProduct) => {
  const a = applied.value
  return (!a.type || r.type === a.type) && (!a.partner || r.partner === a.partner) &&
    (!a.kw.trim() || r.name.includes(a.kw.trim()) || r.keyword.includes(a.kw.trim()) || r.code.includes(a.kw.trim()))
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => shopProducts.filter(hit), { size: 10, failIf: () => applied.value.kw.includes(ERROR_KEYWORD) })
onMounted(reload)
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }

/* --- 제휴사 검색(M2) --------------------------------------------------------- */
const partnerOpen = ref(false)
const partnerQ = ref('')
const partnerHits = computed(() => (partnerQ.value.trim() ? PARTNER_OPTIONS.filter((p) => p.includes(partnerQ.value.trim())) : PARTNER_OPTIONS))
function pickPartner(p: string) { f.value.partner = p; partnerOpen.value = false }

/* --- 상품 상세(M1) ------------------------------------------------------------ */
const detailOpen = ref(false)
const detailItem = ref<ShopProduct | null>(null)
function openDetail(r: ShopProduct) { detailItem.value = r; detailOpen.value = true }

/* --- 조치(M3) ------------------------------------------------------------------ */
const actionOpen = ref(false)
const actionItem = ref<ShopProduct | null>(null)
const actionKind = ref<'판매중지 요청' | '예외 처리'>('판매중지 요청')
const actionReason = ref('')
function openAction(r: ShopProduct) { actionItem.value = r; actionKind.value = '판매중지 요청'; actionReason.value = ''; actionOpen.value = true }
function confirmAction() {
  if (!actionItem.value) return
  if (!actionReason.value.trim()) return notify('조치 사유를 입력하세요.', 'danger')
  actionItem.value.judgeSts = actionKind.value
  actionItem.value.reason = actionReason.value.trim()
  actionItem.value.by = '운영사 운영자'; actionItem.value.at = new Date().toISOString().slice(0, 10)
  notify(`${actionKind.value}로 기록했습니다.`, 'success')
  actionOpen.value = false
}

const columns = computed(() => {
  const ok = can(CODE, 'status'), tip = denyTip(CODE, 'status')
  return [
    { title: '번호', field: 'no', width: 56, hozAlign: 'right', headerHozAlign: 'center' },
    { title: '상품유형', field: 'type', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '상품명', field: 'name', minWidth: 180 },
    { title: '부적합 키워드', field: 'keyword', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge ws-badge--warning">${c.getValue()}</span>` },
    { title: '상품코드', field: 'code', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '제휴사', field: 'partner', width: 120, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '판매가격', field: 'price', width: 100, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => c.getValue().toLocaleString('ko-KR') },
    { title: '상품등록일', field: 'regDate', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '조치상태', field: 'judgeSts', width: 100, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => `<span class="ws-badge${c.getValue() === '조치필요' ? ' ws-badge--warning' : c.getValue() === '판매중지 요청' ? ' ws-badge--danger' : ' ws-badge--mute'}">${c.getValue()}</span>` },
    {
      title: '조치', field: 'id', width: 70, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
      formatter: () => `<button type="button" class="ws-cellbtn"${ok ? '' : ` disabled title="${tip}"`}>조치</button>`,
      cellClick: (_: any, c: any) => { if (ok) openAction(c.getRow().getData()) },
    },
  ]
})
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />
    <WsSearch :cols="['112px', '', '132px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-kw">검색어</label></th>
        <td><InputText id="q-kw" v-model="f.kw" fluid maxlength="30" placeholder="상품명 · 부적합 키워드 · 상품코드" /></td>
        <th scope="row"><label for="q-type">상품유형</label></th>
        <td><Select v-model="f.type" input-id="q-type" :options="[{ l: '전체', v: '' }, ...SHOP_TYPE.map((t) => ({ l: t, v: t }))]" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="q-partner">제휴사</label></th>
        <td colspan="3">
          <span style="display:flex; gap:8px; align-items:center">
            <InputText id="q-partner" :model-value="f.partner" readonly fluid placeholder="찾기로 선택" style="max-width:220px" @click="partnerOpen = true" />
            <Button type="button" label="제휴사 검색" severity="secondary" outlined @click="partnerOpen = true" />
            <Button v-if="f.partner" type="button" label="선택취소" severity="secondary" text @click="f.partner = ''" />
          </span>
        </td>
      </tr>
    </WsSearch>
    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">부적합 상품 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span></div>
        <div class="ws-tit__r"><SbCan action="download"><WsDownload :total="total" :limit="9999" label="엑셀 다운로드" /></SbCan></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="openDetail" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" :sizes="[10, 20, 50]" />
    </section>
    <div class="ws-msg"><p class="ws-msg__tit">안내</p><ul><li>상품 원장은 전용몰(복지몰) 데이터라 이 화면은 읽기만 한다.</li><li>선별(키워드 매칭) 실행은 이번 목업 범위 밖이다 — 부적합 키워드관리(SP-OPS-071P)에서 사전을 관리한다.</li></ul></div>

    <Dialog v-model:visible="partnerOpen" modal header="제휴사 검색" :style="{ width: '360px' }" :draggable="false">
      <InputText v-model="partnerQ" fluid placeholder="제휴사명" style="margin-bottom:10px" />
      <ul class="ws-desc" style="display:grid; gap:6px; list-style:none; margin:0; padding:0">
        <li v-for="p in partnerHits" :key="p"><button type="button" class="ws-cellbtn" style="width:100%; text-align:left" @click="pickPartner(p)">{{ p }}</button></li>
      </ul>
      <template #footer><SbCode code="SP-OPS-070P-M2" /><Button label="선택취소" severity="secondary" outlined @click="() => { f.partner = ''; partnerOpen = false }" /><Button label="닫기" @click="partnerOpen = false" /></template>
    </Dialog>

    <Dialog v-model:visible="detailOpen" modal header="부적합 상품 상세" :style="{ width: '480px' }" :draggable="false">
      <table v-if="detailItem" class="ws-tb ws-tb--view">
        <tbody>
          <tr><th scope="row">상품코드</th><td>{{ detailItem.code }}</td><th scope="row">상품유형</th><td>{{ detailItem.type }}</td></tr>
          <tr><th scope="row">상품명</th><td colspan="3">{{ detailItem.name }}</td></tr>
          <tr><th scope="row">제휴사</th><td>{{ detailItem.partner }}</td><th scope="row">판매가격</th><td>{{ fmt(detailItem.price) }}원</td></tr>
          <tr><th scope="row">상품등록일</th><td colspan="3">{{ detailItem.regDate }}</td></tr>
          <tr><th scope="row">걸린 키워드</th><td colspan="3"><span class="ws-badge ws-badge--warning">{{ detailItem.keyword }}</span> — 상품명에서 강조 표시(미리보기)</td></tr>
          <tr><th scope="row">조치 이력</th><td colspan="3">{{ detailItem.judgeSts }}{{ detailItem.by ? ` · ${detailItem.by} · ${detailItem.at}` : '' }}</td></tr>
        </tbody>
      </table>
      <template #footer><SbCode code="SP-OPS-070P-M1" /><Button label="닫기" @click="detailOpen = false" /></template>
    </Dialog>

    <Dialog v-model:visible="actionOpen" modal header="부적합 상품 조치" :style="{ width: '420px' }" :draggable="false">
      <p v-if="actionItem" style="font-weight:600; margin-bottom:10px">{{ actionItem.name }}</p>
      <fieldset style="display:grid; gap:8px; margin:0 0 12px; padding:0; border:0">
        <legend class="ws-req">조치 구분</legend>
        <div class="ws-radio"><RadioButton v-model="actionKind" input-id="ak-1" name="ak" value="판매중지 요청" /><label for="ak-1">판매중지 요청</label></div>
        <div class="ws-radio"><RadioButton v-model="actionKind" input-id="ak-2" name="ak" value="예외 처리" /><label for="ak-2">예외 처리(적합)</label></div>
      </fieldset>
      <label for="ak-reason" class="ws-req">조치 사유</label>
      <Textarea id="ak-reason" v-model="actionReason" rows="3" fluid maxlength="200" placeholder="사유(200자 이내)" />
      <template #footer><SbCode code="SP-OPS-070P-M3" /><Button label="취소" severity="secondary" outlined @click="actionOpen = false" /><Button label="확인" @click="confirmAction" /></template>
    </Dialog>
  </div>
</template>
