<script setup lang="ts">
/**
 * 로그인 — 원본 `ui/public/login.xml`.
 *
 * 원본 실측
 *   상자 600px · 안쪽 38 136 32 · 테두리 #eaeaea · 모서리 15 · 그림자
 *   제목 20px/700 가운데 · 아래 24
 *   입력 40px · 안쪽 10 12 · 모서리 6 · 칸 사이 20 (마지막만 12)
 *   버튼 초록 40px · 모서리 8 · 15px/600
 *
 * 칸이 둘이다 — 아이디 · 비밀번호. 원본(관리자센터)에는 **도메인** 칸이 먼저 있었다 — 고객사마다
 * 관리자센터가 따로 떠 있어서다. 지원 사업 관리는 시스템이 하나라 뺐다(2026-09-28 관리자 센터 폐기).
 *
 * 비밀번호 보기 토글은 원본에도 있다(`btn_pwDisp`). 버튼 이름을 상태에 맞춰 바꾼다.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const base = import.meta.env.BASE_URL
const f = ref({ id: '', pw: '' })
const error = ref('')
const busy = ref(false)

function submit() {
  error.value = ''
  if (!f.value.id || !f.value.pw) {
    error.value = '아이디 · 비밀번호를 모두 입력하세요.'
    return
  }
  busy.value = true
  setTimeout(() => { busy.value = false; router.push('/') }, 400)
}
</script>

<template>
  <div class="lg" :style="{ backgroundImage: `url(${base}img/login_bg.svg)` }">
    <div class="lg__box">
      <img class="lg__logo" :src="`${base}img/login_logo.svg`" alt="현대이지웰" width="200" height="29" />
      <form class="lg__card" novalidate @submit.prevent="submit">
        <h1 class="lg__tit">지원 사업 관리 로그인</h1>
        <ul class="lg__fields">
          <li>
            <label class="ws-sr-only" for="lg-id">아이디</label>
            <InputText id="lg-id" v-model="f.id" size="large" fluid placeholder="아이디 입력" autocomplete="username" />
          </li>
          <li class="lg__pw">
            <label class="ws-sr-only" for="lg-pw">비밀번호</label>
            <!-- 원본 btn_pwDisp — 보기 토글. PrimeVue Password의 toggleMask가 같은 일을 한다 -->
            <Password v-model="f.pw" input-id="lg-pw" :feedback="false" toggle-mask fluid size="large" placeholder="비밀번호 입력" :input-props="{ autocomplete: 'current-password' }" />
          </li>
          <li>
            <p v-if="error" class="ws-err" role="alert" style="margin: 0 0 8px">{{ error }}</p>
            <Button type="submit" :label="busy ? '로그인 중…' : '로그인'" size="large" fluid :loading="busy" class="lg__btn" />
          </li>
        </ul>
      </form>
      <div class="lg__msg">
        <ul>
          <li>비밀번호를 5회 틀리면 계정이 잠긴다. 잠금 해제는 관리자에게 요청한다.</li>
          <li>목업이라 어떤 값을 넣어도 들어간다.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lg { position: relative; min-height: 100%; overflow-y: auto; background: var(--ws-login-bg) no-repeat center / cover; }
.lg__box { position: absolute; left: 50%; top: 50%; width: min(600px, calc(100% - 32px)); translate: -50% -272px; }
.lg__logo { display: block; margin: 0 auto; }
.lg__card {
  margin-top: 40px; padding: 38px 136px 32px;
  border: 1px solid var(--ws-border-soft); border-radius: 15px; background: var(--ws-surface);
  box-shadow: 0 5px 20px rgb(0 0 0 / 0.12);
}
@media (max-width: 640px) { .lg__card { padding: 32px 24px; } .lg__box { translate: -50% -50%; } }
.lg__tit { margin-bottom: 24px; font-size: 20px; line-height: 28px; font-weight: 700; text-align: center; }
.lg__fields { display: flex; flex-direction: column; gap: 20px; }
.lg__fields li:last-child { margin-top: -8px; } /* 원본 li:last-child{margin-top:12px} */
:deep(.lg__btn.p-button) { border-radius: 8px; } /* 원본 로그인 버튼만 모서리 8 */
.lg__msg { margin-top: 42px; color: var(--ws-login-fg); font-size: var(--ws-font-size-md); line-height: 18px; }
.lg__msg li { position: relative; padding-left: 10px; }
.lg__msg li + li { margin-top: 4px; }
.lg__msg li::before { content: ''; position: absolute; left: 0; top: 8px; width: 3px; height: 3px; border-radius: 50%; background: var(--ws-login-fg); }
</style>
