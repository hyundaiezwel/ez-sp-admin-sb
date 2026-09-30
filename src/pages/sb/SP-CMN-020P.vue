<!-- SB-DONE -->
<script setup lang="ts">
/**
 * SP-CMN-020P 관리자로그아웃 — 수동/자동/강제 로그아웃을 버튼으로 흉내 낸다.
 * 실제 상단 바 로그아웃은 그대로 두고, 여기서는 사유별 결과와 미저장 확인(M1)을 보여 준다.
 */
import { ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import PageHead from '../../app/PageHead.vue'
import SbCode from '../../sb/SbCode.vue'
import { notify } from '../../ws/notify'

const dirty = ref(true)
const confirmOpen = ref(false)
const out = ref(false)
const reason = ref('')

function clickLogout() {
  if (dirty.value) { confirmOpen.value = true; return }
  doLogout('수동 로그아웃')
}
function doLogout(r: string) {
  confirmOpen.value = false
  out.value = true
  reason.value = r
  notify(`${r} — 로그인 화면으로 이동합니다.`, 'info')
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">로그아웃 미리보기</h2></div></div>
      <div class="cmn-logout">
        <p class="ws-desc">저장하지 않은 입력이 있다고 가정한 상태 — 로그아웃을 누르면 확인(M1)이 뜬다.</p>
        <div class="cmn-logout__row">
          <label for="o-dirty" class="ws-req">미저장 입력 있음</label>
          <input id="o-dirty" v-model="dirty" type="checkbox" />
        </div>
        <div class="cmn-logout__btns">
          <Button label="로그아웃" severity="secondary" outlined @click="clickLogout" />
          <Button label="자동 로그아웃(30분 경과)" severity="secondary" outlined @click="doLogout('자동 로그아웃')" />
          <Button label="중복 로그인으로 강제 종료" severity="secondary" outlined @click="doLogout('중복 로그인 종료')" />
          <Button label="계정 사용중지로 강제 종료" severity="secondary" outlined @click="doLogout('계정 사용중지 로그아웃')" />
        </div>

        <div v-if="out" class="cmn-logout__result" role="status">
          <p><b>{{ reason }}</b> — 로그인 화면(SP-CMN-010P)으로 이동했다고 가정한다.</p>
          <p class="ws-desc">접속이력(SP-SYS-020P)에 사유 · 일시가 남는다(FN-04).</p>
        </div>
      </div>
    </section>

    <Dialog v-model:visible="confirmOpen" modal header="로그아웃 확인" :style="{ width: '380px' }" :draggable="false">
      <p>저장하지 않은 내용이 있습니다. 로그아웃하면 사라집니다.</p>
      <template #footer>
        <SbCode code="SP-CMN-020P-M1" />
        <Button label="취소" severity="secondary" outlined @click="confirmOpen = false" />
        <Button label="로그아웃" severity="danger" @click="doLogout('수동 로그아웃')" />
      </template>
    </Dialog>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>실제 상단 바 로그아웃 버튼은 공통 셸(TopBar) 소관이라 여기서 고치지 않는다 — 이 화면은 로그아웃 정책의 미리보기다.</li>
        <li>브라우저 저장소를 못 쓰는 환경 대비는 미리보기 범위 밖.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cmn-logout { display: grid; gap: 14px; max-width: 520px; }
.cmn-logout__row { display: flex; align-items: center; gap: 8px; }
.cmn-logout__btns { display: flex; flex-wrap: wrap; gap: 8px; }
.cmn-logout__result { padding: 12px 14px; border-radius: var(--ws-radius); background: var(--ws-surface-info); display: grid; gap: 4px; }
</style>
