<script setup lang="ts">
/**
 * 상단바 — D6 A 전폭(2026-09-28 결정: A안 · 사용자 상단 · 통합 검색 · 어두운 틀).
 *
 *   왼쪽   접기 · 브랜드(누르면 첫 화면)
 *   가운데 통합 검색 — `/` · ⌘K
 *   오른쪽 전역 조건 · 테마 · 알림 · 사용자
 *
 * 위는 "어디서든 같은 것"(찾기 · 조건 · 알림 · 나), 왼쪽 사이드바는 "어디로 가나"(메뉴)만 맡는다.
 * 사이드바와 같은 어두운 초록으로 ㄱ자 틀을 만들고, 한 단 짙게 해 둘을 가른다.
 * 브랜드 기호는 파비콘 파일(`public/favicon.svg`)을 그대로 싣는다 — 쉼표 모양 정본이 한 벌이다.
 * 어두운 바 위 대비 3.34(라이트 색) · 3.91(다크 색) — 둘 다 3:1 위.
 * 테마 버튼을 따로 둔다 — 사용자 메뉴 안에만 있을 때 다크 전환을 찾지 못했다.
 */
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import type { MenuItem as PvItem } from 'primevue/menuitem'
import Popover from 'primevue/popover'
import AppIcon from './AppIcon.vue'
import GlobalSearch from './GlobalSearch.vue'
import { PENDING, SYSTEM as sys } from './menu'
import { prefs, type Theme } from './theme'
import { previewExpiry } from './session'
// 늦게 싣는다 — 정적으로 물면 Select · Popover가 첫 로드에 실린다
const SpContext = defineAsyncComponent(() => import('../sp/SpContext.vue'))

const rail = defineModel<boolean>('rail', { required: true })
const router = useRouter()
const base = import.meta.env.BASE_URL

/* 테마 — 버튼은 라이트 ↔ 다크만 뒤집는다. "시스템 따르기"는 사용자 메뉴에 */
const dark = computed(() => prefs.resolved === 'dark')
const flipTheme = () => { prefs.theme = dark.value ? 'light' : 'dark' }

/* 알림 — 메뉴의 처리 대기 건수를 모아 보인다(목업) */
const bell = ref<InstanceType<typeof Popover> | null>(null)
const notes = PENDING
const total = notes.reduce((s, n) => s + n.count, 0)

/* 사용자 */
const me = ref<InstanceType<typeof Menu> | null>(null)
const THEME_LABEL: Record<Theme, string> = { light: '라이트', dark: '다크', system: '시스템 설정 따르기' }
const meItems = computed<PvItem[]>(() => [
  { label: '김하늘 · 운영팀 관리자', items: [] },
  { label: '화면 테마', items: (['light', 'dark', 'system'] as Theme[]).map((t) => ({ label: THEME_LABEL[t], icon: prefs.theme === t ? 'ws-check' : 'ws-blank', command: () => { prefs.theme = t } })) },
  { separator: true },
  { label: '비밀번호 변경', command: () => router.push('/login') },
  { label: '세션 만료 알림 보기(미리보기)', command: previewExpiry },
  { label: '로그아웃', command: () => router.push('/login') },
])
</script>

<template>
  <header class="tp">
    <button type="button" class="tp__ib" :aria-label="rail ? '메뉴 펼치기' : '메뉴 접기'" :aria-expanded="!rail" v-tooltip.bottom="rail ? '메뉴 펼치기' : '메뉴 접기'" @click="rail = !rail">
      <AppIcon name="menu" :size="20" />
    </button>
    <RouterLink :to="sys.home" class="tp__brand" :aria-label="`${sys.label} — 첫 화면`">
      <img class="tp__mark" :src="`${base}favicon.svg`" alt="" width="28" height="28" />
      <span class="tp__name">{{ sys.label }}</span>
    </RouterLink>

    <GlobalSearch class="tp__search" />

    <div class="tp__r">
      <!-- SpContext는 칩 + 팝오버 두 뿌리라 class가 붙지 않는다 — 감싸서 아래 :deep 보정이 걸리게 한다 -->
      <div class="tp__ctx"><SpContext /></div>
      <button type="button" class="tp__ib" :aria-label="dark ? '라이트 테마로' : '다크 테마로'" v-tooltip.bottom="dark ? '라이트 테마로' : '다크 테마로'" @click="flipTheme">
        <AppIcon :name="dark ? 'sun' : 'moon'" :size="18" />
      </button>
      <button type="button" class="tp__ib" aria-haspopup="dialog" :aria-label="`알림 ${total}건`" @click="(e) => bell?.toggle(e)">
        <AppIcon name="bell" :size="18" />
        <span v-if="total" class="tp__dot" aria-hidden="true">{{ total > 99 ? '99+' : total }}</span>
      </button>
      <Popover ref="bell">
        <div class="nt">
          <p class="nt__h">처리 대기 <b>{{ total }}</b>건</p>
          <ul class="nt__l">
            <li v-for="n in notes" :key="n.to">
              <RouterLink :to="n.to" class="nt__i" @click="bell?.hide()">
                <span><b>{{ n.label }}</b><small v-if="n.group">{{ n.group }}</small></span><span class="nt__c">{{ n.count }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </Popover>
      <button type="button" class="tp__me" aria-haspopup="menu" aria-label="사용자 메뉴 — 김하늘" @click="(e) => me?.toggle(e)">
        <span class="tp__av" aria-hidden="true">김</span>
      </button>
      <Menu ref="me" :model="meItems" popup>
        <template #itemicon="{ item }"><span class="me-ic" aria-hidden="true">{{ item.icon === 'ws-check' ? '✓' : '' }}</span></template>
      </Menu>
    </div>
  </header>
</template>

<style scoped>
.tp {
  /* 왼쪽 14 — ☰(36) 가운데가 32px에 온다. 사이드바 아이콘 가운데(펼침 · 레일 모두 32)와 한 세로줄 */
  display: flex; align-items: center; gap: 8px; height: var(--ws-top-h); padding: 0 12px 0 14px;
  background: var(--ws-top-bg); color: var(--ws-top-fg); border-bottom: 1px solid var(--ws-top-line);
}
.tp__ib {
  position: relative; flex: none; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: var(--ws-radius);
  background: none; color: var(--ws-top-fg); cursor: pointer;
}
.tp__ib:hover, .tp__brand:hover, .tp__me:hover { background: var(--ws-top-hover); }
.tp__ib:focus-visible, .tp__brand:focus-visible, .tp__me:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--ws-top-fg); }
.tp__brand {
  flex: none; display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 8px; margin-right: 16px; border: 0; border-radius: var(--ws-radius);
  background: none; color: var(--ws-top-fg); font: inherit; text-decoration: none;
}
.tp__brand:hover { text-decoration: none; }
/* 쉼표 그림은 32 격자 가운데 15폭이라 상자 오른쪽이 빈다 — 글자와 틈을 13 안팎으로 */
.tp__mark { flex: none; display: block; margin-right: -4px; }
.tp__name { font-size: 15px; font-weight: 700; white-space: nowrap; }
.tp__r { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.tp__ctx { margin-right: 8px; }
.tp__dot {
  position: absolute; right: 2px; top: 2px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--ws-count-bg); color: var(--ws-text-inverse); font-size: 10.5px; font-weight: 700; line-height: 18px; text-align: center;
}
.tp__me { flex: none; display: grid; place-items: center; width: 40px; height: 40px; margin-left: 4px; border: 0; border-radius: 50%; background: none; cursor: pointer; }
.tp__av { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--ws-side-avatar); color: #fff; font-size: 13px; font-weight: 700; }

/* 전역 조건 칩 — 어두운 바 위라 테두리 · 글자를 바 색으로 */
.tp__ctx :deep(.cx) { border-color: var(--ws-top-field); background: transparent; color: var(--ws-top-fg); }
.tp__ctx :deep(.cx:hover) { border-color: var(--ws-top-fg); }
.tp__ctx :deep(.cx__k) { color: var(--ws-top-muted); }
.tp__ctx :deep(.cx__role) { background: var(--ws-top-q); color: var(--ws-top-fg); }

.nt { width: 320px; }
.nt__h { margin-bottom: 8px; font-weight: 600; }
.nt__h b { color: var(--ws-text-danger); }
.nt__l { display: grid; gap: 2px; }
.nt__i { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: var(--ws-radius); color: var(--ws-text); text-decoration: none; }
.nt__i:hover { background: var(--ws-surface-hover); text-decoration: none; }
.nt__i small { margin-left: 8px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.nt__c { min-width: 24px; height: 20px; padding: 0 6px; border-radius: 10px; background: var(--ws-count-bg); color: var(--ws-text-inverse); font-size: 11.5px; font-weight: 700; line-height: 20px; text-align: center; }
</style>
