import type { MenuItem } from '../app/menu'
import type { ScreenType } from './spec'

/**
 * SB 화면 레지스트리 — TO-BE IA 77행(09-30 개정본). 코드 · 이름 · 메뉴 · 분류만 싣는다.
 * 화면 주소는 전부 `/sb/s/<CODE>` — 라우터가 `src/pages/sb/<CODE>.vue`를 찾아 그리고, 없으면 설계 카드를 띄운다.
 *
 * cls   신규 · 유사 · ''(기존 유지)
 * link  복지몰 연계 — O 연계 · API · ▲ 일부 · '' 없음
 */
export interface Screen {
  code: string
  name: string
  /** 사이드 메뉴 · 탭 제목에 쓰는 짧은 이름 */
  label: string
  /** 1~3depth */
  menu: string[]
  type: ScreenType
  cls: '신규' | '유사' | ''
  link: 'O' | 'API' | '▲' | ''
  /** IA 행 번호 */
  row: number
}

export const SCREENS: Screen[] = [
  // @generated-start — IA 77행에서 생성했다. 손으로 고치지 않는다
  { code: "SP-CMN-010P", name: "관리자로그인", label: "관리자로그인", menu: ["공통", "관리자로그인"], type: "페이지", cls: "", link: "", row: 5 },
  { code: "SP-CMN-020P", name: "관리자로그아웃", label: "관리자로그아웃", menu: ["공통", "관리자로그아웃"], type: "액션", cls: "", link: "", row: 6 },
  { code: "SP-CMN-030P", name: "세션 만료 알림", label: "세션 만료 알림", menu: ["공통", "세션 만료 알림"], type: "모달", cls: "", link: "", row: 7 },
  { code: "SP-CMN-040D", name: "엑셀 다운로드 사유 등록", label: "엑셀 다운로드 사유 등록", menu: ["공통", "엑셀 다운로드 사유 등록"], type: "모달", cls: "", link: "", row: 8 },
  { code: "SP-CMN-050P", name: "메인", label: "메인", menu: ["공통", "메인"], type: "대시보드", cls: "신규", link: "", row: 9 },
  { code: "SP-BIZ-010L", name: "사업관리 목록", label: "사업관리 목록", menu: ["사업관리", "사업관리", "목록"], type: "목록", cls: "신규", link: "", row: 10 },
  { code: "SP-BIZ-010D", name: "사업관리 상세", label: "사업관리 상세", menu: ["사업관리", "사업관리", "상세"], type: "상세", cls: "신규", link: "", row: 11 },
  { code: "SP-BIZ-020L", name: "발전모델관리 목록", label: "발전모델관리 목록", menu: ["사업관리", "발전모델관리", "목록"], type: "목록", cls: "", link: "", row: 12 },
  { code: "SP-BIZ-020D", name: "발전모델관리 상세", label: "발전모델관리 상세", menu: ["사업관리", "발전모델관리", "상세"], type: "상세", cls: "", link: "", row: 13 },
  { code: "SP-BIZ-030P", name: "인원관리", label: "인원관리", menu: ["사업관리", "인원관리"], type: "페이지", cls: "", link: "", row: 14 },
  { code: "SP-BIZ-040L", name: "동반성장 협력사업관리 동반성장기업 목록", label: "동반성장기업 목록", menu: ["사업관리", "동반성장 협력사업관리", "동반성장기업 목록"], type: "목록", cls: "신규", link: "", row: 15 },
  { code: "SP-BIZ-040D", name: "동반성장 협력사업관리 동반성장기업 상세", label: "동반성장기업 상세", menu: ["사업관리", "동반성장 협력사업관리", "동반성장기업 상세"], type: "상세", cls: "신규", link: "", row: 16 },
  { code: "SP-PRT-010L", name: "신청기업관리 신청현황 신청목록", label: "신청목록", menu: ["사업참여관리", "신청기업관리", "신청현황"], type: "목록", cls: "신규", link: "", row: 17 },
  { code: "SP-PRT-010D", name: "신청기업관리 신청현황 신청상세", label: "신청상세", menu: ["사업참여관리", "신청기업관리", "신청현황"], type: "상세", cls: "신규", link: "", row: 18 },
  { code: "SP-PRT-020L", name: "참여기업현황 기업목록", label: "기업목록", menu: ["사업참여관리", "참여기업현황", "기업목록"], type: "목록", cls: "신규", link: "", row: 19 },
  { code: "SP-PRT-020D", name: "참여기업현황 기업상세", label: "기업상세", menu: ["사업참여관리", "참여기업현황", "기업상세"], type: "상세", cls: "신규", link: "", row: 20 },
  { code: "SP-PRT-030L", name: "참여노동자관리 노동자목록", label: "노동자목록", menu: ["사업참여관리", "참여노동자관리", "노동자목록"], type: "목록", cls: "유사", link: "O", row: 21 },
  { code: "SP-PRT-030D", name: "참여노동자관리 노동자상세(등록/수정)", label: "노동자상세(등록/수정)", menu: ["사업참여관리", "참여노동자관리", "노동자상세(등록/수정)"], type: "상세", cls: "유사", link: "O", row: 22 },
  { code: "SP-PRT-031L", name: "참여노동자관리 인원추가심사목록", label: "인원추가심사목록", menu: ["사업참여관리", "참여노동자관리", "인원추가심사목록"], type: "목록", cls: "신규", link: "", row: 23 },
  { code: "SP-PRT-031D", name: "참여노동자관리 인원추가심사상세", label: "인원추가심사상세", menu: ["사업참여관리", "참여노동자관리", "인원추가심사상세"], type: "상세", cls: "신규", link: "", row: 24 },
  { code: "SP-PRT-040L", name: "기업담당자관리 담당자목록", label: "담당자목록", menu: ["사업참여관리", "기업담당자관리", "담당자목록"], type: "목록", cls: "신규", link: "", row: 25 },
  { code: "SP-PRT-040D", name: "기업담당자관리 담당자상세(등록/수정)", label: "담당자상세(등록/수정)", menu: ["사업참여관리", "기업담당자관리", "담당자상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 26 },
  { code: "SP-PRT-050L", name: "기업가상계좌관리 가상계좌목록", label: "가상계좌목록", menu: ["사업참여관리", "기업가상계좌관리", "가상계좌목록"], type: "목록", cls: "", link: "", row: 27 },
  { code: "SP-PRT-060P", name: "참여증서발급", label: "참여증서발급", menu: ["사업참여관리", "참여증서발급"], type: "액션", cls: "신규", link: "", row: 28 },
  { code: "SP-PRT-070P", name: "참여기업등록", label: "참여기업등록", menu: ["사업참여관리", "참여기업등록"], type: "등록", cls: "신규", link: "", row: 29 },
  { code: "SP-PRT-080P", name: "일괄참여취소", label: "일괄참여취소", menu: ["사업참여관리", "일괄참여취소"], type: "액션", cls: "신규", link: "", row: 30 },
  { code: "SP-PRT-090L", name: "참여불가기업 관리 목록", label: "참여불가기업 관리 목록", menu: ["사업참여관리", "참여불가기업 관리", "목록"], type: "목록", cls: "신규", link: "", row: 31 },
  { code: "SP-PRT-090D", name: "참여불가기업 관리 상세(등록/수정)", label: "참여불가기업 관리 상세(등록/수정)", menu: ["사업참여관리", "참여불가기업 관리", "상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 32 },
  { code: "SP-PRT-100L", name: "참여불가회원 관리 목록", label: "참여불가회원 관리 목록", menu: ["사업참여관리", "참여불가회원 관리", "목록"], type: "목록", cls: "신규", link: "", row: 33 },
  { code: "SP-PRT-100D", name: "참여불가회원 관리 상세(등록/수정)", label: "참여불가회원 관리 상세(등록/수정)", menu: ["사업참여관리", "참여불가회원 관리", "상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 34 },
  { code: "SP-PNT-010L", name: "포인트관리 지급현황 지급목록", label: "지급목록", menu: ["노동자 포인트관리", "포인트관리", "지급현황"], type: "목록", cls: "유사", link: "O", row: 35 },
  { code: "SP-PNT-010D", name: "포인트관리 지급현황 지급상세", label: "지급상세", menu: ["노동자 포인트관리", "포인트관리", "지급현황"], type: "상세", cls: "유사", link: "O", row: 36 },
  { code: "SP-PNT-020L", name: "이용내역관리 이용내역현황 이용내역목록", label: "이용내역목록", menu: ["노동자 포인트관리", "이용내역관리", "이용내역현황"], type: "목록", cls: "유사", link: "O", row: 37 },
  { code: "SP-OPS-010L", name: "기업 업무요청 업무요청 목록", label: "업무요청 목록", menu: ["운영지원", "기업 업무요청", "업무요청 목록"], type: "목록", cls: "신규", link: "", row: 38 },
  { code: "SP-OPS-010D", name: "기업 업무요청 업무요청 상세(조회 및 답변)", label: "업무요청 상세(조회 및 답변)", menu: ["운영지원", "기업 업무요청", "업무요청 상세(조회 및 답변)"], type: "상세", cls: "신규", link: "", row: 39 },
  { code: "SP-OPS-020L", name: "누리집 문의 누리집 문의 목록", label: "누리집 문의 목록", menu: ["운영지원", "누리집 문의", "누리집 문의 목록"], type: "목록", cls: "신규", link: "", row: 40 },
  { code: "SP-OPS-020D", name: "누리집 문의 누리집 문의 상세(조회 및 답변)", label: "누리집 문의 상세(조회 및 답변)", menu: ["운영지원", "누리집 문의", "누리집 문의 상세(조회 및 답변)"], type: "상세", cls: "신규", link: "", row: 41 },
  { code: "SP-OPS-030L", name: "자주 하는 질문 관리 자주 하는 질문 목록", label: "자주 하는 질문 목록", menu: ["운영지원", "자주 하는 질문 관리", "자주 하는 질문 목록"], type: "목록", cls: "신규", link: "", row: 42 },
  { code: "SP-OPS-030D", name: "자주 하는 질문 관리 자주 하는 질문 상세(등록/수정)", label: "자주 하는 질문 상세(등록/수정)", menu: ["운영지원", "자주 하는 질문 관리", "자주 하는 질문 상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 43 },
  { code: "SP-OPS-040L", name: "공지사항관리 공지사항 목록", label: "공지사항 목록", menu: ["운영지원", "공지사항관리", "공지사항 목록"], type: "목록", cls: "신규", link: "", row: 44 },
  { code: "SP-OPS-040D", name: "공지사항관리 공지사항 상세(등록/수정)", label: "공지사항 상세(등록/수정)", menu: ["운영지원", "공지사항관리", "공지사항 상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 45 },
  { code: "SP-OPS-050L", name: "부정행위 신고센터 관리 부정행위 신고 목록", label: "부정행위 신고 목록", menu: ["운영지원", "부정행위 신고센터 관리", "부정행위 신고 목록"], type: "목록", cls: "신규", link: "", row: 46 },
  { code: "SP-OPS-050D", name: "부정행위 신고센터 관리 부정행위 신고 상세(조회 및 답변)", label: "부정행위 신고 상세(조회 및 답변)", menu: ["운영지원", "부정행위 신고센터 관리", "부정행위 신고 상세(조회 및 답변)"], type: "상세", cls: "신규", link: "", row: 47 },
  { code: "SP-OPS-060L", name: "부정행위 모니터링 부정행위 모니터링 목록", label: "부정행위 모니터링 목록", menu: ["운영지원", "부정행위 모니터링", "부정행위 모니터링 목록"], type: "목록", cls: "신규", link: "▲", row: 48 },
  { code: "SP-OPS-060D", name: "부정행위 모니터링 부정행위 모니터링 상세(조치)", label: "부정행위 모니터링 상세(조치)", menu: ["운영지원", "부정행위 모니터링", "부정행위 모니터링 상세(조치)"], type: "상세", cls: "신규", link: "▲", row: 49 },
  { code: "SP-OPS-070P", name: "부적합 상품 모니터링 부적합 상품 관리", label: "부적합 상품 관리", menu: ["운영지원", "부적합 상품 모니터링", "부적합 상품 관리"], type: "페이지", cls: "신규", link: "▲", row: 50 },
  { code: "SP-OPS-071P", name: "부적합 상품 모니터링 부적합 키워드관리", label: "부적합 키워드관리", menu: ["운영지원", "부적합 상품 모니터링", "부적합 키워드관리"], type: "페이지", cls: "신규", link: "▲", row: 51 },
  { code: "SP-CNT-010L", name: "자료실 자료관리 자료 목록", label: "자료 목록", menu: ["콘텐츠관리", "자료실 자료관리", "자료 목록"], type: "목록", cls: "신규", link: "", row: 52 },
  { code: "SP-CNT-010D", name: "자료실 자료관리 자료 상세(등록/수정)", label: "자료 상세(등록/수정)", menu: ["콘텐츠관리", "자료실 자료관리", "자료 상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 53 },
  { code: "SP-CNT-020L", name: "팝업관리 팝업 목록", label: "팝업 목록", menu: ["콘텐츠관리", "팝업관리", "팝업 목록"], type: "목록", cls: "신규", link: "", row: 54 },
  { code: "SP-CNT-020D", name: "팝업관리 팝업 상세(등록/수정)", label: "팝업 상세(등록/수정)", menu: ["콘텐츠관리", "팝업관리", "팝업 상세(등록/수정)"], type: "상세", cls: "신규", link: "", row: 55 },
  { code: "SP-CNT-030L", name: "배너관리 배너목록", label: "배너목록", menu: ["콘텐츠관리", "배너관리", "배너목록"], type: "목록", cls: "신규", link: "", row: 56 },
  { code: "SP-CNT-030D", name: "배너관리 배너등록/수정", label: "배너등록/수정", menu: ["콘텐츠관리", "배너관리", "배너등록/수정"], type: "상세", cls: "신규", link: "", row: 57 },
  { code: "SP-STL-010L", name: "전자청구서 목록", label: "전자청구서 목록", menu: ["정산", "전자청구서", "목록"], type: "목록", cls: "유사", link: "API", row: 58 },
  { code: "SP-STL-010D", name: "전자청구서 상세", label: "전자청구서 상세", menu: ["정산", "전자청구서", "상세"], type: "상세", cls: "유사", link: "API", row: 59 },
  { code: "SP-STL-020L", name: "청구내역서 목록", label: "청구내역서 목록", menu: ["정산", "청구내역서", "목록"], type: "목록", cls: "유사", link: "API", row: 60 },
  { code: "SP-STL-020D", name: "청구내역서 상세", label: "청구내역서 상세", menu: ["정산", "청구내역서", "상세"], type: "상세", cls: "유사", link: "API", row: 61 },
  { code: "SP-STL-030L", name: "잔액현황 목록", label: "잔액현황 목록", menu: ["정산", "잔액현황", "목록"], type: "목록", cls: "유사", link: "API", row: 62 },
  { code: "SP-STL-030D", name: "잔액현황 상세", label: "잔액현황 상세", menu: ["정산", "잔액현황", "상세"], type: "상세", cls: "유사", link: "API", row: 63 },
  { code: "SP-STL-040L", name: "환불내역 목록", label: "환불내역 목록", menu: ["정산", "환불내역", "목록"], type: "목록", cls: "유사", link: "API", row: 64 },
  { code: "SP-STL-040D", name: "환불내역 상세", label: "환불내역 상세", menu: ["정산", "환불내역", "상세"], type: "상세", cls: "유사", link: "API", row: 65 },
  { code: "SP-STL-050P", name: "일매출자료", label: "일매출자료", menu: ["정산", "일매출자료"], type: "목록", cls: "", link: "", row: 66 },
  { code: "SP-STA-010P", name: "사업운영통계 신청·승인통계", label: "신청·승인통계", menu: ["통계분석", "사업운영통계", "신청·승인통계"], type: "통계", cls: "신규", link: "", row: 67 },
  { code: "SP-STA-011P", name: "사업운영통계 이용정지통계", label: "이용정지통계", menu: ["통계분석", "사업운영통계", "이용정지통계"], type: "통계", cls: "신규", link: "", row: 68 },
  { code: "SP-STA-020P", name: "사업참여통계 참여기업통계", label: "참여기업통계", menu: ["통계분석", "사업참여통계", "참여기업통계"], type: "통계", cls: "신규", link: "", row: 69 },
  { code: "SP-STA-021P", name: "사업참여통계 참여노동자통계", label: "참여노동자통계", menu: ["통계분석", "사업참여통계", "참여노동자통계"], type: "통계", cls: "신규", link: "O", row: 70 },
  { code: "SP-STA-030P", name: "이용통계 포인트통계", label: "포인트통계", menu: ["통계분석", "이용통계", "포인트통계"], type: "통계", cls: "신규", link: "O", row: 71 },
  { code: "SP-STA-031P", name: "이용통계 이용실적통계", label: "이용실적통계", menu: ["통계분석", "이용통계", "이용실적통계"], type: "통계", cls: "유사", link: "O", row: 72 },
  { code: "SP-STA-040P", name: "전용몰통계 상품/카테고리 통계", label: "상품/카테고리 통계", menu: ["통계분석", "전용몰통계", "상품/카테고리 통계"], type: "통계", cls: "유사", link: "O", row: 73 },
  { code: "SP-STA-041P", name: "전용몰통계 지역별 이용 통계", label: "지역별 이용 통계", menu: ["통계분석", "전용몰통계", "지역별 이용 통계"], type: "통계", cls: "유사", link: "O", row: 74 },
  { code: "SP-STA-050P", name: "CS통계", label: "CS통계", menu: ["통계분석", "CS통계"], type: "통계", cls: "유사", link: "O", row: 75 },
  { code: "SP-STA-060P", name: "국회요구자료 통계리포트", label: "국회요구자료 통계리포트", menu: ["통계분석", "국회요구자료 통계리포트"], type: "통계", cls: "유사", link: "O", row: 76 },
  { code: "SP-STA-070P", name: "동반성장통계 참여유형통계", label: "참여유형통계", menu: ["통계분석", "동반성장통계", "참여유형통계"], type: "통계", cls: "", link: "", row: 77 },
  { code: "SP-SYS-010L", name: "관리자관리 관리자목록", label: "관리자목록", menu: ["시스템관리", "관리자관리", "관리자목록"], type: "목록", cls: "신규", link: "", row: 78 },
  { code: "SP-SYS-010D", name: "관리자관리 관리자상세", label: "관리자상세", menu: ["시스템관리", "관리자관리", "관리자상세"], type: "상세", cls: "신규", link: "", row: 79 },
  { code: "SP-SYS-020P", name: "이력 관리자 접속이력", label: "관리자 접속이력", menu: ["시스템관리", "이력", "관리자 접속이력"], type: "목록", cls: "신규", link: "", row: 80 },
  { code: "SP-SYS-021P", name: "이력 개인정보 접근이력", label: "개인정보 접근이력", menu: ["시스템관리", "이력", "개인정보 접근이력"], type: "목록", cls: "신규", link: "", row: 81 },
  // @generated-end
]

export const GROUPS = ['공통', '사업관리', '사업참여관리', '노동자 포인트관리', '운영지원', '콘텐츠관리', '정산', '통계분석', '시스템관리'] as const
const ICON: Record<(typeof GROUPS)[number], string> = {
  공통: 'grid', 사업관리: 'flag', 사업참여관리: 'check', '노동자 포인트관리': 'users', 운영지원: 'inbox',
  콘텐츠관리: 'doc', 정산: 'wallet', 통계분석: 'chart', 시스템관리: 'cog',
}

export const routeOf = (code: string) => `/sb/s/${code}`
export const screenOf = (code: string) => SCREENS.find((s) => s.code === code)

export const SB_MENU: MenuItem[] = GROUPS.map((g) => ({
  id: `sb-${g}`, label: g, icon: ICON[g],
  children: SCREENS.filter((s) => s.menu[0] === g).map((s) => ({ id: s.code, label: s.label, to: routeOf(s.code) })),
}))

export const SB_FOOT: MenuItem[] = [
  { id: 'sb-list', label: '화면 목록', to: '/sb', icon: 'map' },
  { id: 'sb-roles', label: '역할 · 권한', to: '/sb/roles', icon: 'shield' },
  { id: 'sb-questions', label: '미결 질문', to: '/sb/questions', icon: 'info' },
  { id: 'sb-effort', label: '소요 집계', to: '/sb/effort', icon: 'chart' },
]
