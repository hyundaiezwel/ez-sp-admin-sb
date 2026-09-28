<script setup lang="ts">
/**
 * 앱 셸 — D6 A: 전폭 상단바 + 메뉴 사이드바(2026-09-28, D2 A '머리줄 없는 사이드바'를 뒤집었다).
 *
 *   상단바(TopBar)  접기 · 브랜드 · 통합 검색 · 전역 조건 · 테마 · 알림 · 사용자
 *   사이드바        메뉴만 — 남는 공간을 전부 먹고 넘치면 여기만 스크롤. 바닥에 시스템 링크
 *   본문            탭줄 → 화면(KeepAlive)
 *
 * 위는 "어디서든 같은 것", 왼쪽은 "어디로 가나". 사이드바에 검색 · 알림 · 사용자가 섞여 있으면
 * 메뉴가 짧아지고 전역 조건이 탭줄 끝에 따로 떨어졌다.
 * 접으면 64px 레일(240 ÷ 3.75). 라벨을 자르지 않고 하위는 펼침 메뉴로 낸다. 색은 원본 레일(#2a403d),
 * 상단바는 한 단 짙게(#1f2d2b) — 두 테마 모두 어둡다.
 */
import { defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { SYSTEM as sys, groupCount, type MenuItem } from '../app/menu'
import TopBar from '../app/TopBar.vue'
import { open as openTab } from '../app/tabs'
import AppIcon from '../app/AppIcon.vue'
import TabBar from '../app/TabBar.vue'
import Toast from 'primevue/toast'
// 세션 알림도 늦게 싣는다 — Dialog가 첫 로드에 끌려와 67 → 80KB가 됐다. 만료 시각은 session.ts가 들고 있어 늦게 떠도 맞다
const SessionGuard = defineAsyncComponent(() => import('../app/SessionGuard.vue'))

const route = useRoute()

const KEY = 'ds3-rail'
const rail = ref((() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })())
watch(rail, (v) => { try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* 이번 방문만 */ } })

const MENU_ = sys.menu

const expanded = ref<Set<string>>(new Set())
const flyout = ref<string | null>(null)

watch(
  () => route.path,
  (p) => {
    openTab(p)
    const top = sys.menu.find((m) => m.children?.some((c) => c.to === p || p.startsWith(c.to + '/')))
    if (top) expanded.value = new Set([...expanded.value, top.id])
    flyout.value = null
  },
  { immediate: true },
)

const isActive = (m: MenuItem) => m.to === route.path
/** 상세 화면(`/sp/basic-info/C-0001`)에 있어도 부모 메뉴가 켜져 있어야 한다 */
const isOn = (c: MenuItem) => c.to === route.path || (!!c.to && c.to !== '/sp' && route.path.startsWith(c.to + '/'))
const within = (m: MenuItem) => m.children?.some(isOn) ?? false
function toggle(m: MenuItem) {
  const s = new Set(expanded.value)
  s.has(m.id) ? s.delete(m.id) : s.add(m.id)
  expanded.value = s
}

const fmt = (n: number) => (n > 999 ? '999+' : String(n))

</script>

<template>
  <div class="sh" :class="{ 'is-rail': rail }">
    <a class="ws-skip" href="#main">본문 바로가기</a>

    <TopBar v-model:rail="rail" class="sh-top" />

    <nav class="sd" aria-label="주 메뉴">
      <!-- 주 메뉴 — 남는 공간을 전부 먹는다. 넘치면 여기만 스크롤 -->
      <div class="sd__nav">
        <ul class="sd__list">
          <li v-for="m in MENU_" :key="m.id" class="sd__g" @mouseleave="flyout = null">
            <RouterLink
              v-if="m.to"
              class="sd__row" :class="{ 'is-on': isOn(m) }" :to="m.to"
              :aria-current="isActive(m) ? 'page' : undefined" :title="rail ? m.label : undefined"
              @mouseenter="flyout = null"
            >
              <span class="sd__ic"><AppIcon :name="m.icon!" :size="20" /></span>
              <span v-if="!rail" class="sd__lb">{{ m.label }}</span>
            </RouterLink>
            <button
              v-else type="button" class="sd__row" :class="{ 'is-within': within(m), 'is-on': rail && within(m) }"
              :aria-expanded="rail ? undefined : expanded.has(m.id)"
              :aria-label="groupCount(m) ? `${m.label}, 대기 ${groupCount(m)}건` : undefined"
              :title="rail ? m.label : undefined"
              @click="rail ? (flyout = flyout === m.id ? null : m.id) : toggle(m)"
              @mouseenter="rail && (flyout = m.id)"
            >
              <span class="sd__ic"><AppIcon :name="m.icon!" :size="20" /></span>
              <template v-if="!rail">
                <span class="sd__lb">{{ m.label }}</span>
                <span v-if="groupCount(m) && !expanded.has(m.id)" class="sd__cnt">{{ fmt(groupCount(m)) }}</span>
                <AppIcon name="chevron" :size="14" class="sd__chev" :class="{ 'is-open': expanded.has(m.id) }" />
              </template>
              <span v-else-if="groupCount(m)" class="sd__dot" />
            </button>

            <ul v-if="!rail && m.children && expanded.has(m.id)" class="sd__sub">
              <li v-for="c in m.children" :key="c.id">
                <RouterLink class="sd__row sd__row--sub" :class="{ 'is-on': isOn(c) }" :to="c.to!" :aria-current="isActive(c) ? 'page' : undefined">
                  <span class="sd__lb">{{ c.label }}</span>
                  <span v-if="c.count" class="sd__cnt" :aria-label="`대기 ${c.count}건`">{{ fmt(c.count) }}</span>
                </RouterLink>
              </li>
            </ul>

            <!-- 레일 펼침 메뉴 — 접혀도 하위에 갈 길이 있어야 접기가 반쪽이 아니다 -->
            <div v-if="rail && m.children && flyout === m.id" class="sd__fly" role="menu" :aria-label="m.label">
              <p class="sd__fly-h">{{ m.label }}</p>
              <RouterLink v-for="c in m.children" :key="c.id" role="menuitem" class="sd__fly-i" :class="{ 'is-on': isOn(c) }" :to="c.to!">
                <span>{{ c.label }}</span><span v-if="c.count" class="sd__cnt">{{ fmt(c.count) }}</span>
              </RouterLink>
            </div>
          </li>
        </ul>
      </div>

      <!-- 아래 — 시스템에 관한 것은 바닥에 고정 -->
      <div class="sd__foot">
        <RouterLink v-for="f in sys.foot" :key="f.id" class="sd__row" :to="f.to!" :title="rail ? f.label : undefined">
          <span class="sd__ic"><AppIcon :name="f.icon!" :size="20" /></span>
          <span v-if="!rail" class="sd__lb">{{ f.label }}</span>
        </RouterLink>
      </div>

    </nav>

    <div class="sh-main">
      <TabBar />
      <main id="main" class="sh-scroll" tabindex="-1">
        <RouterView v-slot="{ Component }">
          <KeepAlive :max="8">
            <component :is="Component" :key="route.path" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
    <!-- role=status — 읽고 있던 문장을 끊지 않고 다음에 읽어 준다 -->
    <Toast position="bottom-center" />
    <SessionGuard />
  </div>
</template>

<style scoped>
.sh {
  display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: var(--ws-top-h) minmax(0, 1fr);
  height: 100%; overflow: hidden; background: var(--ws-surface);
}
.sh-top { grid-column: 1 / -1; }

/* --- 사이드바 ------------------------------------------------------------- */
.sd {
  min-height: 0; display: flex; flex-direction: column; width: var(--ws-side-w);
  background: var(--ws-side-bg); color: var(--ws-side-fg);
  transition: width 0.2s ease;
}
.is-rail .sd { width: var(--ws-side-w-rail); }

.sd__nav { flex: 1; min-height: 0; overflow-y: auto; overflow-x: visible; padding: 8px; scrollbar-color: var(--ws-side-scroll-thumb) transparent; }
.sd__nav::-webkit-scrollbar-thumb { background-color: var(--ws-side-scroll-thumb); }
.sd__list { display: flex; flex-direction: column; gap: var(--ws-space-0-5, 2px); }
.sd__g { position: relative; }

/* 행 40 · 아이콘 상자 20 고정 — 라벨 시작점이 한 축에 선다(DS1 navigation.md §2-3) */
.sd__row {
  position: relative; display: flex; align-items: center; gap: 8px; width: 100%; height: 40px; padding: 0 12px;
  border: 0; border-radius: var(--ws-radius); background: none; color: var(--ws-side-fg);
  font: inherit; text-align: left; text-decoration: none; cursor: pointer;
}
.sd__row:hover { background: var(--ws-side-hover); text-decoration: none; }
.sd__ic { flex: none; display: grid; place-items: center; width: 20px; }
.sd__lb { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd__row--sub { height: 36px; padding-left: 40px; color: var(--ws-side-sub); font-size: var(--ws-font-size-md); }
.sd__row.is-on { background: var(--ws-side-on-bg); color: var(--ws-text-inverse); font-weight: 700; box-shadow: inset 3px 0 0 var(--ws-brand); }
.sd__row.is-within { color: var(--ws-text-inverse); font-weight: 700; }
.sd__chev { flex: none; color: var(--ws-side-muted); transition: transform 0.15s; }
.sd__chev.is-open { transform: rotate(180deg); }
.sd__sub { margin: 2px 0 4px; display: flex; flex-direction: column; gap: 2px; }
.sd__cnt { flex: none; min-width: 20px; padding: 0 6px; border-radius: 10px; background: var(--ws-count-bg); color: var(--ws-text-inverse); font-size: var(--ws-font-size-sm); font-weight: 700; line-height: 18px; text-align: center; font-variant-numeric: tabular-nums; }
.sd__dot { position: absolute; top: 8px; right: 12px; width: 6px; height: 6px; border-radius: 50%; background: var(--ws-count-bg); }

.is-rail .sd__row { justify-content: center; padding: 0; }
.is-rail .sd__nav { padding-inline: 8px; }
/* 레일에서는 스크롤을 푼다 — overflow-y:auto면 x도 auto로 계산돼 옆으로 뜨는 펼침 메뉴가 잘린다.
   ponytail: 레일 아이콘이 화면 높이를 넘게 늘면 펼침 메뉴를 position:fixed로 바꾼다 */
.is-rail .sd__nav { overflow: visible; }

.sd__fly {
  position: absolute; z-index: 40; left: calc(100% + 8px); top: 0; min-width: 200px; padding: 6px;
  border: 1px solid var(--ws-border); border-radius: var(--ws-radius-lg); background: var(--ws-surface); color: var(--ws-text);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.16);
}
/* 아이콘 → 메뉴로 마우스를 옮길 때 8px 틈에서 mouseleave가 나 닫히지 않게 다리를 놓는다 */
.sd__fly::before { content: ''; position: absolute; top: 0; bottom: 0; right: 100%; width: 10px; }
.sd__fly-h { padding: 6px 10px; font-size: var(--ws-font-size-sm); font-weight: 700; color: var(--ws-text-muted); }
.sd__fly-i { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: var(--ws-radius); color: var(--ws-text); text-decoration: none; }
.sd__fly-i:hover { background: var(--ws-surface-hover); text-decoration: none; }
.sd__fly-i.is-on { background: var(--ws-surface-selected); color: var(--ws-text-brand); font-weight: 700; }

.sd__foot { flex: none; display: flex; flex-direction: column; gap: 2px; padding: 8px; border-top: 1px solid var(--ws-side-line); }


/* --- 본문 ----------------------------------------------------------------- */
.sh-main { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
/* position: relative — 표 caption의 .ws-sr-only(absolute)가 이 영역을 기준으로 잡혀야 잘린다. 없으면 문서 높이를
   늘려(900 → 1419) 본문 스크롤이 끝난 뒤 바깥 문서가 이어 밀리고 상단바가 화면 밖으로 올라갔다 */
.sh-scroll { position: relative; flex: 1; min-height: 0; overflow: auto; background: var(--ws-surface); }
.sh-scroll:focus { outline: none; }
</style>
