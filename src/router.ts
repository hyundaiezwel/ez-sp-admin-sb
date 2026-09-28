import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Shell from './layouts/Shell.vue'
import { titleOf } from './app/menu'

/**
 * 해시 히스토리 — GitHub Pages는 정적 호스팅이라 깊은 주소를 새로고침하면 404가 난다.
 * 시스템은 지원 사업 관리 하나다. 2026-09-28 관리자 센터(DS1과 같은 샘플 열 장)를 없애고
 * 대시보드 · 통계 · 공통코드 · 카탈로그만 `/sp` 아래로 옮겼다. 샘플 열 장은 태그 `ds3-admin-center`에 있다.
 */
const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('./pages/LoginPage.vue') },
  {
    path: '/',
    component: Shell,
    children: [
      { path: '', redirect: '/sp/home' },
      // 지원 사업 관리 — IA 확정 전 미리보기. 제안 메뉴는 src/sp/menu.ts
      { path: 'sp', component: () => import('./pages/sp/IaPage.vue') },
      { path: 'sp/home', component: () => import('./pages/sp/HomePage.vue') },
      { path: 'sp/usage-stats', component: () => import('./pages/sp/UsageStatsPage.vue') },
      { path: 'sp/codes', component: () => import('./pages/sp/CodePage.vue') },
      { path: 'sp/catalog', component: () => import('./pages/CatalogPage.vue') },
      { path: 'sp/elements', component: () => import('./pages/sp/ElementsPage.vue') },
      { path: 'sp/intake', component: () => import('./pages/sp/IntakePage.vue') },
      { path: 'sp/basic-info', component: () => import('./pages/sp/BasicInfoPage.vue') },
      { path: 'sp/basic-info/:id', component: () => import('./pages/sp/BasicInfoDetailPage.vue') },
      { path: 'sp/company', component: () => import('./pages/sp/CompanyPage.vue') },
      { path: 'sp/member', component: () => import('./pages/sp/MemberPage.vue') },
      { path: 'sp/point', component: () => import('./pages/sp/PointPage.vue') },
      { path: 'sp/usage', component: () => import('./pages/sp/UsagePage.vue') },
      { path: 'sp/upload', component: () => import('./pages/sp/UploadPage.vue') },
      { path: 'sp/assembly', component: () => import('./pages/sp/AssemblyPage.vue') },
      { path: 'sp/bulk-cancel', component: () => import('./pages/sp/BulkCancelPage.vue') },
      { path: 'sp/scraping', component: () => import('./pages/sp/ScrapingPage.vue') },
      { path: 'sp/scraping/:id', component: () => import('./pages/sp/ScrapingDetailPage.vue') },
      { path: 'sp/remaining', component: () => import('./pages/sp/RemainingPage.vue') },
      { path: 'sp/remaining/:id', component: () => import('./pages/sp/RemainingDetailPage.vue') },
      { path: 'sp/daily-report', component: () => import('./pages/sp/DailyReportPage.vue') },
      { path: 'sp/banners', component: () => import('./pages/sp/BannerPage.vue') },
      { path: 'sp/p/:id', component: () => import('./pages/sp/PendingPage.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/sp/home' },
]

export const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.afterEach((to) => {
  document.title = `${to.path === '/login' ? '로그인' : titleOf(to.path)} — EZ Admin DS3`
})
