<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CMN-030P 세션 만료 알림 — 만료 5분 전 예고(M1) → 연장 또는 다시 로그인, 무응답이면 만료(M2).
 * 실제 30분 타이머 대신 버튼으로 상태를 바로 재현한다(미리보기).
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'

const warnOpen = ref(false)
const expiredOpen = ref(false)
const remain = ref(299)
let timer: number | undefined

function startWarn() {
  warnOpen.value = true
  remain.value = 299
  clearInterval(timer)
  timer = window.setInterval(() => {
    remain.value--
    if (remain.value <= 0) { clearInterval(timer); warnOpen.value = false; expiredOpen.value = true }
  }, 1000)
}
function extend() {
  clearInterval(timer)
  warnOpen.value = false
  notify('로그인 연장 — 만료 시각을 30분 뒤로 늦췄습니다(재인증 없음).', 'success')
}
function reLogin() {
  clearInterval(timer)
  warnOpen.value = false
  notify('로그아웃하고 로그인 화면으로 이동합니다.', 'info')
}
function confirmExpired() {
  expiredOpen.value = false
  notify('로그인 화면으로 이동합니다.', 'info')
}
const mmss = computed(() => `${Math.floor(remain.value / 60)}:${String(remain.value % 60).padStart(2, '0')}`)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">세션 만료 알림 미리보기</h2></div></div>
      <p class="ws-desc" style="margin-bottom: 12px">비활동 30분 중 25분이 지나 만료 5분 전 예고가 뜬 상태를 흉내 낸다. 실제 화면에서는 이 시점이 자동으로 온다.</p>
      <Button label="만료 예고 띄우기(만료 5분 전)" @click="startWarn" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>연장은 재인증 없이 만료 시각만 30분 뒤로 늦춘다(FN-02) — 화면을 새로 부르지 않아 입력이 사라지지 않는다.</li>
        <li>남은 시간이 0이 되면 자동으로 만료 안내(M2)로 넘어간다.</li>
        <li>다운로드 · 저장 중 세션이 만료되면 요청을 처리하지 않고 재시도를 안내한다(REQ-06).</li>
      </ul>
    </div>

    <Dialog v-model:visible="warnOpen" modal :closable="false" header="세션 만료 예고" :style="{ width: '380px' }" :draggable="false" role="alertdialog">
      <p>비활동으로 곧 로그아웃됩니다.</p>
      <p style="font: 700 28px/1.4 ui-monospace, monospace; text-align: center; margin: 10px 0" aria-live="polite">{{ mmss }}</p>
      <template #footer>
        <SbCode code="SP-CMN-030P-M1" />
        <Button label="다시 로그인하기" severity="secondary" outlined @click="reLogin" />
        <Button label="로그인 연장" autofocus @click="extend" />
      </template>
    </Dialog>

    <Dialog v-model:visible="expiredOpen" modal :closable="false" header="세션 만료됨" :style="{ width: '360px' }" :draggable="false" role="alertdialog">
      <p>세션이 만료되었습니다. 진행 중이던 요청은 처리되지 않았습니다.</p>
      <template #footer>
        <SbCode code="SP-CMN-030P-M2" />
        <Button label="확인" autofocus @click="confirmExpired" />
      </template>
    </Dialog>
  </div>
</template>
