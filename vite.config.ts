import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('fixtures', import.meta.url)),
    },
  },
  // /api → 로컬 API(make dev-api, :8090). VITE_API_BASE=/api 일 때 실제 로그인이 이 길로 간다
  server: { port: 5320, proxy: { '/api': { target: 'http://localhost:8090', changeOrigin: true } } },
  /* 쓰는 PrimeVue 모듈을 미리 묶는다. 안 하면 화면을 처음 열 때마다 Vite가 새 모듈을 묶으며
     페이지를 새로고침한다 — 옮겨 다니다 입력한 값이 날아간다(실측: selectbutton, datepicker…) */
  optimizeDeps: { include: ['primevue/autocomplete','primevue/button','primevue/checkbox','primevue/config','primevue/datepicker','primevue/dialog','primevue/drawer','primevue/fileupload','primevue/inputnumber','primevue/inputtext','primevue/menu','primevue/multiselect','primevue/paginator','primevue/password','primevue/popover','primevue/toggleswitch','primevue/progressbar','primevue/radiobutton','primevue/select','primevue/selectbutton','primevue/tab','primevue/tablist','primevue/tabpanel','primevue/tabpanels','primevue/tabs','primevue/textarea','primevue/toast','primevue/toasteventbus','primevue/toastservice','primevue/tooltip', '@primevue/themes', '@primevue/themes/aura'] },
  build: {
    rollupOptions: {
      output: {
        /* **vue를 먼저 제 청크로 묶는다.** 안 그러면 vue-echarts가 import하는 vue 런타임이 echarts 청크로
           끌려가고, 입구가 거기서 ref·openBlock을 받아 오느라 로그인 화면에서도 echarts 235KB(gzip)를 싣는다.
           첫 로드가 24KB여야 할 것이 259KB였다(2026-09-28 실측). 객체 형식도 경로 함수도 그 자체로는
           못 막는다 — Rollup이 수동 청크의 의존성을 끌어당기기 때문이다. vue를 명시해야 끊긴다. */
        manualChunks(id) {
          if (/node_modules\/(vue|@vue|vue-router)\//.test(id)) return 'vue'
          if (/node_modules\/(echarts|zrender|vue-echarts)\//.test(id)) return 'echarts'
          if (id.includes('node_modules/tabulator-tables/')) return 'tabulator'
        },
      },
    },
  },
})
