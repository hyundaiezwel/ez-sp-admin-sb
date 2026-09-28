import type { MenuItem } from '../app/menu'

/**
 * 지원 사업 TO-BE 메뉴 — **제안이다. IA 확정 전 미리보기.**
 *
 * AS-IS는 GNB 10개를 조직(업무게시판·회원관리·임직원정산…) 기준으로 나눴다. 그래서
 * 회원관리 한 그룹에 17개가 몰리고, 기업 한 곳의 심사가 세 화면에 흩어진다.
 * 여기서는 **업무 흐름** 기준으로 다시 묶었다 — 참여 심사 → 기업 → 근로자 → 자금 → 제재.
 *
 * AS-IS 54 → TO-BE 48. AS-IS 14화면을 7자리로 합치고, 1화면을 빼고, 2자리를 더했다.
 *   합침  RPA 사본 3쌍(라벨만 다르다) · 입금/환불확인 중복 등록 2쌍 · 계정현황+계정신청
 *         · 전자청구서+청구서기능(화면이 아니라 승인 결과 핸들러)
 *   뺌    비밀번호 변경 — 사용자 메뉴로
 *   더함  업무 현황(AS-IS 메인 대시보드 G-006 — 메뉴 밖에 있던 것) · 공통코드
 *
 * 2026-09-28 관리자 센터(샘플 시스템)를 없애며 대시보드 · 통계 · 시스템 관리를 여기로 흡수했다 —
 * 대시보드는 업무 현황, 통계는 사용현황 자리에 지원 사업 데이터로 다시 채웠다. 공통코드는 시스템 관리로.
 *
 * `to`가 `/sp/p/`로 시작하는 화면은 아직 그리지 않았다 — 설계 카드(AS-IS 근거)가 뜬다.
 */
const p = (id: string) => `/sp/p/${id}`

export const SP_MENU: MenuItem[] = [
  { id: 'home', label: '업무 현황', to: '/sp/home', icon: 'grid', asis: ['G-006'], built: true, note: 'AS-IS 상단 바의 금일등록·미처리·처리중 건수를 이 화면과 메뉴 옆 숫자로 옮긴다' },
  {
    id: 'screen', label: '참여 심사', icon: 'check',
    children: [
      { id: 'intake', label: '접수·자격심사', to: '/sp/intake', count: 18, asis: ['S-003-02'], built: true },
      { id: 'basic', label: '기초정보 심사', to: '/sp/basic-info', count: 42, asis: ['S-003-04', 'S-003-10'], built: true, note: 'RPA 사본은 라벨만 달랐다(선정완료 → 신청완료, 미체결 → 미제출) — 정본 라벨로 합친다' },
      { id: 'company', label: '참여 기업 관리', to: '/sp/company', asis: ['S-003-05', 'S-003-12'], built: true, note: '참여개시·인원변경·승인취소·에스크로. RPA 축소판(상태 2종)을 합친다' },
      { id: 'upload', label: '참여 기업 등록', to: '/sp/upload', asis: ['S-003-14'], built: true },
      { id: 'cancel', label: '일괄 참여 취소', to: '/sp/bulk-cancel', asis: ['S-003-15'], built: true },
    ],
  },
  {
    id: 'corp', label: '기업·기관', icon: 'building',
    children: [
      { id: 'allcorp', label: '전체 기업정보', to: p('allcorp'), asis: ['S-003-01'], note: 'AS-IS는 엑셀 버튼 하나뿐인 화면이다 — 목록을 두고 내보내기를 붙인다' },
      { id: 'manager', label: '기업 담당자', to: p('manager'), asis: ['S-003-03'] },
      { id: 'partner', label: '동반성장 기관', to: p('partner'), asis: ['S-003-06'] },
      { id: 'cert', label: '참여증서 발급', to: p('cert'), asis: ['S-003-16'] },
      { id: 'mass', label: '매스마케팅 유입', to: p('mass'), asis: ['S-003-17'] },
    ],
  },
  {
    id: 'worker', label: '근로자·포인트', icon: 'users',
    children: [
      { id: 'member', label: '참여회원 현황', to: '/sp/member', asis: ['S-003-07', 'S-003-11'], built: true, note: 'RPA 사본의 성별·외부기관 연계 필터를 상세조회로 흡수한다' },
      { id: 'point', label: '포인트 조회', to: '/sp/point', asis: ['S-004-01'], built: true },
      { id: 'usage', label: '이용내역 조회', to: '/sp/usage', asis: ['S-004-02'], built: true, note: 'AS-IS의 주민번호 검색은 뺐다 — 이름 · 사번으로 찾는다(결정 필요)' },
      { id: 'period', label: '포인트 사용기간', to: p('period'), asis: ['S-003-13'] },
    ],
  },
  {
    id: 'money', label: '자금·정산', icon: 'wallet',
    children: [
      { id: 'deposit', label: '입금 확인', to: p('deposit'), count: 6, asis: ['S-003-08', 'S-004-03'], note: '같은 URL이 회원관리·임직원정산 두 메뉴에 걸려 있었다 — 한 자리로' },
      { id: 'refund', label: '환불 확인', to: p('refund'), asis: ['S-003-09', 'S-004-04'], note: '입금 확인과 같은 중복 등록' },
      { id: 'ebill', label: '전자청구서', to: p('ebill'), asis: ['S-005-01', 'S-005-06'], note: '청구서기능(S-005-06)은 승인 결과 핸들러였다 — 메뉴에서 뺀다' },
      { id: 'bill', label: '청구내역', to: p('bill'), asis: ['S-005-02'] },
      { id: 'remain', label: '잔여금 현황', to: '/sp/remaining', asis: ['S-005-03'], built: true },
      { id: 'refundlog', label: '환불내역', to: p('refundlog'), asis: ['S-005-04'] },
      { id: 'daily', label: '일매출', to: p('daily'), asis: ['S-005-05'] },
    ],
  },
  {
    id: 'fraud', label: '부정행위·제재', icon: 'shield',
    children: [
      { id: 'scraping', label: '스크래핑 적발', to: '/sp/scraping', count: 9, asis: ['S-001-04'], built: true },
      { id: 'report', label: '부정행위 신고', to: p('report'), asis: ['S-001-03'] },
      { id: 'product', label: '부적합 상품', to: p('product'), asis: ['S-001-05'] },
      { id: 'bancorp', label: '참여불가 기업', to: p('bancorp'), asis: ['S-002-04'], note: 'AS-IS는 정책 및 조직에 있었다 — 적발 → 제재가 한 그룹에 있어야 동선이 끊기지 않는다' },
      { id: 'banmem', label: '참여불가 회원', to: p('banmem'), asis: ['S-002-05'] },
    ],
  },
  {
    id: 'stat', label: '통계·리포트', icon: 'chart',
    children: [
      { id: 'dreport', label: '일일 리포트', to: '/sp/daily-report', asis: ['S-006-04'], built: true },
      { id: 'assembly', label: '국회요구자료', to: '/sp/assembly', asis: ['S-006-05'], built: true },
      { id: 'corpstat', label: '기업 세부현황', to: p('corpstat'), asis: ['S-006-02'] },
      { id: 'memstat', label: '회원 세부현황', to: p('memstat'), asis: ['S-006-03'] },
      { id: 'stopstat', label: '이용정지 통계', to: p('stopstat'), asis: ['S-006-06'] },
      { id: 'usestat', label: '사용현황', to: '/sp/usage-stats', asis: ['S-006-01'], built: true, note: 'AS-IS 진입 불가(결함)라 내용을 모른다 — 포인트 사용 집계로 가정해 그렸다. 무엇을 보여 주던 화면인지 확인이 필요하다' },
    ],
  },
  {
    id: 'policy', label: '사업 설정', icon: 'flag',
    children: [
      { id: 'biz', label: '사업 관리', to: p('biz'), asis: ['S-002-01'], note: '전 화면의 전역 조건(사업) 원천 — 셸의 조건 선택기가 이 목록을 읽는다' },
      { id: 'model', label: '발전모델', to: p('model'), asis: ['S-002-02'] },
      { id: 'quota', label: '모집 인원', to: p('quota'), asis: ['S-002-03'] },
    ],
  },
  {
    id: 'cms', label: '대외 컨텐츠', icon: 'doc',
    children: [
      { id: 'banner', label: '메인 배너', to: '/sp/banners', asis: ['S-009-01'], built: true },
      { id: 'intro', label: '사업소개', to: p('intro'), asis: ['S-009-02'] },
      { id: 'apply', label: '참여신청 안내', to: p('apply'), asis: ['S-009-03'] },
      { id: 'guide', label: '적립금 사용안내', to: p('guide'), asis: ['S-009-04'] },
      { id: 'review', label: '참여후기', to: p('review'), asis: ['S-009-05'] },
      { id: 'popup', label: '팝업', to: p('popup'), asis: ['S-009-06'] },
      { id: 'faq', label: '자주하는 질문', to: p('faq'), asis: ['S-010-01'], note: 'AS-IS 고객센터 그룹을 합쳤다 — 둘 다 대외 사이트에 나가는 컨텐츠다' },
      { id: 'library', label: '자료실', to: p('library'), asis: ['S-010-02'] },
    ],
  },
  {
    id: 'work', label: '업무 협업', icon: 'inbox',
    children: [
      { id: 'notice', label: '공지사항', to: p('notice'), asis: ['S-001-01'] },
      { id: 'request', label: '업무요청', to: p('request'), count: 4, asis: ['S-001-02'] },
    ],
  },
  {
    id: 'system', label: '시스템 관리', icon: 'cog',
    children: [
      { id: 'account', label: '관리자 계정', to: p('account'), asis: ['S-008-01', 'S-008-02'], note: '계정현황과 계정신청을 한 목록 + 상태 필터로 합친다. 비밀번호 변경은 사용자 메뉴로 옮긴다(S-007-01)' },
      { id: 'codes', label: '공통코드', to: '/sp/codes', built: true, note: 'AS-IS에 없던 자리 — 상태 · 구분 라벨을 화면에 박지 않고 여기서 내린다(관리자 센터에서 옮겼다)' },
    ],
  },
]

/** 바닥 — 미리보기 · 디자인 시스템에 관한 것. 제안 메뉴와 섞지 않는다 */
export const SP_FOOT: MenuItem[] = [
  { id: 'ia', label: '메뉴 대응표', to: '/sp', icon: 'map' },
  { id: 'elements', label: '새 화면 요소', to: '/sp/elements', icon: 'info' },
  { id: 'catalog', label: '컴포넌트 카탈로그', to: '/sp/catalog', icon: 'doc' },
]

/** AS-IS에서 빠지는 화면 — 대응표가 "어디로 갔나"를 답해야 한다 */
export const SP_REMOVED: Record<string, string> = {
  'S-007-01': '사용자 메뉴로 — 메뉴 화면일 이유가 없다',
}
