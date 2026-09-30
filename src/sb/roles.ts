/**
 * 계정 역할 · 동작 · 화면별 기본 권한.
 *
 * - 계정 1개 = 역할 1개 + 사업 범위 + 개별 조정(추가 허용 · 회수). 이 파일은 **역할 기본값**만 담는다.
 *   개별 조정 규칙은 docs/permissions.md 3절.
 * - AS-IS 조사 계정은 1개(지원기관 최하위 등급)뿐이다. 역할별 실제 권한은 대부분 **미확인**이고,
 *   아래 표는 IA 권한 정책 · AS-IS 버튼 권한 문구 · 업무 성격에서 끌어낸 **추정 기본값**이다.
 * - 역할 이름에 '관리자'를 쓰지 않는다(RFP 요구(요약): 화면·주소에 관리자 기능을 시사하는 용어 금지).
 */

export interface Role { code: string; label: string; org: '지원기관' | '운영사' | '기업'; tier: string; desc: string }

export type Action =
  | 'view' | 'create' | 'update' | 'delete' | 'approve' | 'status' | 'bulk'
  | 'download' | 'download-pii' | 'send' | 'money' | 'account' | 'config'

export const ROLES: Role[] = [
  { code: 'AM', label: '지원기관 마스터', org: '지원기관', tier: '마스터',
    desc: '지원기관 계정 발급·회수와 권한 부여, 사업 설정, 일괄 참여취소 같은 비가역 처리. AS-IS 사업총괄 등급에 대응(추정).' },
  { code: 'AL', label: '지원기관 총괄', org: '지원기관', tier: '총괄',
    desc: '선정·승인 확정, 금전 처리(입금 확인·환불·청구 승인), 일괄 처리. AS-IS 지원총괄 등급에 대응(추정).' },
  { code: 'AS', label: '지원기관 담당자', org: '지원기관', tier: '담당',
    desc: '신청·참여·노동자 심사 실무. 상태 변경·발송·개인정보 다운로드(사유 입력)까지. 승인 확정·금전·일괄은 없다. AS-IS 지원담당·담당자 등급에 대응(추정).' },
  { code: 'AV', label: '지원기관 조회 전용', org: '지원기관', tier: '조회',
    desc: '조회와 개인정보 없는 다운로드만. 개인정보는 마스킹된 채로 본다. 감사·보고용(추정 — AS-IS에 대응 등급 없음).' },
  { code: 'OM', label: '운영사 마스터', org: '운영사', tier: '마스터',
    desc: '운영사 계정 발급·회수와 권한 부여, 접속·접근 이력 점검, 전용몰·콘텐츠 운영 책임.' },
  { code: 'OO', label: '운영사 운영자', org: '운영사', tier: '담당',
    desc: '문의·업무요청 답변, 전자청구서 작성, 전용몰 부적합 상품 조치, 기업담당자 계정 잠금 해제(CS). 참여 심사·승인은 없다.' },
  { code: 'CM', label: '기업 담당자', org: '기업', tier: '연계',
    desc: '기업 어드민 계정. 이 어드민 화면에는 접근하지 않는다. 업무요청·이용정지·담당자 관리 등 연계 화면을 확인할 때 기준으로만 둔다.' },
]

export const ACTIONS: { code: Action; label: string; desc: string }[] = [
  { code: 'view', label: '조회', desc: '화면 진입과 목록·상세 조회. 개인정보는 마스킹 기본.' },
  { code: 'create', label: '등록', desc: '새 건 등록 — 게시물, 답변, 메모, 첨부, 발급.' },
  { code: 'update', label: '수정', desc: '기존 건 내용 수정. 업무 데이터 수정은 수정 사유 필수.' },
  { code: 'delete', label: '삭제', desc: '콘텐츠 삭제·매핑 해제 한정. 계정·신청·이력은 삭제하지 않는다(사용중지·상태로 처리).' },
  { code: 'approve', label: '승인·확정', desc: '최종 상태로 보내는 결재성 결정 — 선정완료, 반려, 인원추가 승인, 청구 승인.' },
  { code: 'status', label: '상태 변경', desc: '상태 변경 모달 처리 — 정상접수, 보완요청, 이용정지, 참여불가 적용/해제, 문의 처리상태.' },
  { code: 'bulk', label: '일괄 처리', desc: '여러 건을 한 번에 처리. 일괄 버튼은 해당 동작 권한과 bulk를 둘 다 가져야 쓴다.' },
  { code: 'download', label: '다운로드', desc: '개인정보 없는 엑셀·파일(집계 통계, 청구서 공문, 증서).' },
  { code: 'download-pii', label: '개인정보 다운로드', desc: '개인정보 포함 엑셀·서류. 사유 입력(SP-CMN-040D)과 개인정보 접근이력 기록이 따라붙는다.' },
  { code: 'send', label: '발송', desc: 'LMS·E-Mail 수동 발송, 문의 회신 메일. 상태 변경에 딸린 자동 통지는 status에 포함.' },
  { code: 'money', label: '금전 처리', desc: '입금 확인, 환불 요청·처리, 청구 승인, 환불계좌 확정 같은 돈이 움직이는 처리.' },
  { code: 'account', label: '계정 관리', desc: '계정 생성·사용중지·잠금 해제·비밀번호 초기화·권한 부여. 관리 화면(SP-SYS-010*)에서는 마스터 전용.' },
  { code: 'config', label: '설정', desc: '사업·발전모델·인원 창구·코드·콘텐츠 게시(전시) 설정.' },
]

type Grant = Partial<Record<string, Action[]>>
const CODES = ROLES.map((r) => r.code)
/** 빠진 역할은 [] — 모든 화면이 7개 역할을 다 갖는다 */
const g = (spec: Grant): Record<string, Action[]> =>
  Object.fromEntries(CODES.map((c) => [c, spec[c] ?? []]))

const ADMIN = ['AM', 'AL', 'AS', 'AV', 'OM', 'OO']
const each = (roles: string[], a: Action[]): Grant => Object.fromEntries(roles.map((r) => [r, a]))

// ── 기본 배정 묶음 (docs/permissions.md 6절 표와 같다) ──────────────────────
const SHELL = g(each(ADMIN, ['view']))
const STATS = g(each(ADMIN, ['view', 'download']))
const BIZ_CONFIG = g({ AM: ['view', 'create', 'update', 'config'], AL: ['view', 'create', 'update', 'config'], ...each(['AS', 'AV', 'OM', 'OO'], ['view']) })
const BIZ_CTRL = g({ AM: ['view', 'update', 'config'], AL: ['view', 'update', 'config'], ...each(['AS', 'AV', 'OM', 'OO'], ['view']) })
const PARTNER_L = g({ AM: ['view', 'create', 'update', 'delete', 'download-pii'], AL: ['view', 'create', 'update', 'delete', 'download-pii'], AS: ['view', 'create', 'update', 'download-pii'], ...each(['AV', 'OM', 'OO'], ['view']) })
const PARTNER_D = g({ AM: ['view', 'create', 'update', 'delete'], AL: ['view', 'create', 'update', 'delete'], AS: ['view', 'create', 'update'], ...each(['AV', 'OM', 'OO'], ['view']) })

/** 심사·처리 목록: 담당은 건별 상태·발송, 총괄 이상은 일괄 */
const REVIEW_L = g({ AM: ['view', 'status', 'bulk', 'send', 'download-pii'], AL: ['view', 'status', 'bulk', 'send', 'download-pii'], AS: ['view', 'status', 'send', 'download-pii'], ...each(['AV', 'OM', 'OO'], ['view']) })
const APPLY_D = g({ AM: ['view', 'create', 'update', 'status', 'approve', 'download-pii'], AL: ['view', 'create', 'update', 'status', 'approve', 'download-pii'], AS: ['view', 'create', 'update', 'status', 'download-pii'], ...each(['AV', 'OM', 'OO'], ['view']) })
const COMPANY_D = g({ AM: ['view', 'create', 'update', 'status', 'approve', 'send', 'money', 'download-pii'], AL: ['view', 'create', 'update', 'status', 'approve', 'send', 'money', 'download-pii'], AS: ['view', 'create', 'update', 'status', 'send', 'download-pii'], ...each(['AV', 'OM', 'OO'], ['view']) })
/** 노동자 목록: 일괄 이용정지·일괄 환불요청이 있어 총괄 이상에 bulk·money */
const WORKER_L = g({ AM: ['view', 'status', 'bulk', 'send', 'money', 'download-pii'], AL: ['view', 'status', 'bulk', 'send', 'money', 'download-pii'], AS: ['view', 'status', 'send', 'download-pii'], AV: ['view'], OM: ['view', 'download-pii'], OO: ['view', 'download-pii'] })
const WORKER_D = g({ AM: ['view', 'create', 'update', 'delete', 'status', 'approve', 'money', 'download-pii'], AL: ['view', 'create', 'update', 'delete', 'status', 'approve', 'money', 'download-pii'], AS: ['view', 'create', 'update', 'delete', 'status', 'download-pii'], ...each(['AV', 'OM', 'OO'], ['view']) })
const HEAD_L = g({ AM: ['view', 'status', 'approve', 'bulk', 'download-pii'], AL: ['view', 'status', 'approve', 'bulk', 'download-pii'], AS: ['view', 'status', 'download-pii'], ...each(['AV', 'OM', 'OO'], ['view']) })
const HEAD_D = g({ AM: ['view', 'status', 'approve'], AL: ['view', 'status', 'approve'], AS: ['view', 'status'], ...each(['AV', 'OM', 'OO'], ['view']) })
/** 기업담당자 계정: 잠금 해제·비밀번호 초기화는 총괄 이상 + 운영사(CS). 삭제 없음 */
const CMGR_L = g({ AM: ['view', 'create', 'account', 'download-pii'], AL: ['view', 'create', 'account', 'download-pii'], AS: ['view', 'create', 'download-pii'], AV: ['view'], OM: ['view', 'account'], OO: ['view', 'account'] })
const CMGR_D = g({ AM: ['view', 'create', 'update', 'account'], AL: ['view', 'create', 'update', 'account'], AS: ['view', 'create', 'update'], AV: ['view'], OM: ['view', 'account'], OO: ['view', 'account'] })
const VACCT = g({ ...each(['AM', 'AL', 'AS', 'OM', 'OO'], ['view', 'download-pii']), AV: ['view'] })
const CERT = g({ AM: ['view', 'create', 'bulk', 'download'], AL: ['view', 'create', 'bulk', 'download'], AS: ['view', 'create', 'download'], ...each(['AV', 'OM', 'OO'], ['view']) })
const BULK_REG = g({ AM: ['view', 'create', 'bulk'], AL: ['view', 'create', 'bulk'], AS: ['view'] })
const BULK_CANCEL = g({ AM: ['view', 'status', 'bulk'], AL: ['view'] })
const BLOCK_L = (dl: Action) => g({ AM: ['view', 'create', 'update', 'status', dl], AL: ['view', 'create', 'update', 'status', dl], AS: ['view', 'create', 'update', dl], ...each(['AV', 'OM', 'OO'], ['view']) })
const BLOCK_D = g({ AM: ['view', 'create', 'update', 'status'], AL: ['view', 'create', 'update', 'status'], AS: ['view', 'create', 'update'], ...each(['AV', 'OM', 'OO'], ['view']) })

/** 조회 + 개인정보 다운로드(AV 제외) — 포인트·이용·환불 내역 */
const LEDGER_PII = g({ ...each(['AM', 'AL', 'AS', 'OM', 'OO'], ['view', 'download-pii']), AV: ['view'] })
const LEDGER = g(each(ADMIN, ['view', 'download']))
const DETAIL_VIEW = g(each(ADMIN, ['view']))
/** 전자청구서: 운영사가 작성, 지원기관 총괄 이상이 승인(작성·승인 조직 분리) */
const BILL_L = g({ AM: ['view', 'approve', 'money', 'download'], AL: ['view', 'approve', 'money', 'download'], AS: ['view', 'download'], AV: ['view'], OM: ['view', 'create', 'update', 'send', 'download'], OO: ['view', 'create', 'update', 'send', 'download'] })
const BILL_D = g({ AM: ['view', 'approve', 'money', 'download', 'download-pii'], AL: ['view', 'approve', 'money', 'download', 'download-pii'], AS: ['view', 'download'], AV: ['view'], OM: ['view', 'update', 'download', 'download-pii'], OO: ['view', 'update', 'download', 'download-pii'] })
const BILL_ITEM_D = g({ ...each(['AM', 'AL', 'AS', 'OM', 'OO'], ['view', 'download', 'download-pii']), AV: ['view'] })

/** 문의·업무요청 답변: 지원기관·운영사 공통 */
const ANSWER = g({ ...each(['AM', 'AL', 'AS', 'OM', 'OO'], ['view', 'create', 'update', 'status']), AV: ['view'] })
const ANSWER_MAIL = g({ ...each(['AM', 'AL', 'AS', 'OM', 'OO'], ['view', 'create', 'status', 'send']), AV: ['view'] })
const FRAUD_L = g({ AM: ['view', 'status', 'download-pii'], AL: ['view', 'status', 'download-pii'], AS: ['view', 'status', 'download-pii'], AV: ['view'], OM: ['view', 'status'], OO: ['view', 'status'] })
const FRAUD_D = g({ AM: ['view', 'create', 'status', 'send'], AL: ['view', 'create', 'status', 'send'], AS: ['view', 'create', 'status', 'send'], AV: ['view'], OM: ['view', 'create', 'status', 'send'], OO: ['view', 'create', 'status', 'send'] })
const MONITOR_D = g({ AM: ['view', 'create', 'status'], AL: ['view', 'create', 'status'], AS: ['view', 'create', 'status'], AV: ['view'], OM: ['view', 'status'], OO: ['view', 'status'] })
/** 전용몰 상품·키워드: 운영사 소관, 지원기관은 조회 */
const SHOP = g({ ...each(['AM', 'AL', 'AS', 'AV'], ['view']), OM: ['view', 'status'], OO: ['view', 'status'] })
const SHOP_KW = g({ ...each(['AM', 'AL', 'AS', 'AV'], ['view']), OM: ['view', 'create', 'update', 'delete', 'config'], OO: ['view', 'create', 'update', 'delete'] })
/** 콘텐츠: 담당·운영자는 작성, 게시(전시) 설정은 지원기관 총괄 이상 · 운영사 마스터 */
const CONTENT = g({ AM: ['view', 'create', 'update', 'delete', 'config'], AL: ['view', 'create', 'update', 'delete', 'config'], AS: ['view', 'create', 'update'], AV: ['view'], OM: ['view', 'create', 'update', 'delete', 'config'], OO: ['view', 'create', 'update'] })

const DL_REASON = g(each(['AM', 'AL', 'AS', 'OM', 'OO'], ['view', 'create']))
/** 관리자 계정 화면: 마스터 전용(IA 권한 정책 — 일반 계정은 타 계정 관리 불가) */
const ACCOUNT = g(each(['AM', 'OM'], ['view', 'create', 'update', 'status', 'account']))
const AUDIT = g(each(['AM', 'OM'], ['view', 'download']))

export const DEFAULT_MATRIX: Record<string, Record<string, Action[]>> = {
  // 공통 · 시스템관리
  'SP-CMN-010P': SHELL, 'SP-CMN-020P': SHELL, 'SP-CMN-030P': SHELL, 'SP-CMN-040D': DL_REASON, 'SP-CMN-050P': SHELL,
  'SP-SYS-010L': ACCOUNT, 'SP-SYS-010D': ACCOUNT, 'SP-SYS-020P': AUDIT, 'SP-SYS-021P': AUDIT,
  // 사업관리
  'SP-BIZ-010L': BIZ_CONFIG, 'SP-BIZ-010D': BIZ_CONFIG, 'SP-BIZ-020L': BIZ_CONFIG, 'SP-BIZ-020D': BIZ_CONFIG,
  'SP-BIZ-030P': BIZ_CTRL, 'SP-BIZ-040L': PARTNER_L, 'SP-BIZ-040D': PARTNER_D,
  // 사업참여관리
  'SP-PRT-010L': REVIEW_L, 'SP-PRT-010D': APPLY_D, 'SP-PRT-020L': REVIEW_L, 'SP-PRT-020D': COMPANY_D,
  'SP-PRT-030L': WORKER_L, 'SP-PRT-030D': WORKER_D, 'SP-PRT-031L': HEAD_L, 'SP-PRT-031D': HEAD_D,
  'SP-PRT-040L': CMGR_L, 'SP-PRT-040D': CMGR_D, 'SP-PRT-050L': VACCT, 'SP-PRT-060P': CERT,
  'SP-PRT-070P': BULK_REG, 'SP-PRT-080P': BULK_CANCEL,
  'SP-PRT-090L': BLOCK_L('download'), 'SP-PRT-090D': BLOCK_D, 'SP-PRT-100L': BLOCK_L('download-pii'), 'SP-PRT-100D': BLOCK_D,
  // 노동자 포인트관리 · 정산
  'SP-PNT-010L': LEDGER_PII, 'SP-PNT-010D': DETAIL_VIEW, 'SP-PNT-020L': LEDGER_PII,
  'SP-STL-010L': BILL_L, 'SP-STL-010D': BILL_D, 'SP-STL-020L': LEDGER, 'SP-STL-020D': BILL_ITEM_D,
  'SP-STL-030L': LEDGER, 'SP-STL-030D': LEDGER, 'SP-STL-040L': LEDGER_PII, 'SP-STL-040D': DETAIL_VIEW, 'SP-STL-050P': STATS,
  // 운영지원
  'SP-OPS-010L': ANSWER, 'SP-OPS-010D': ANSWER, 'SP-OPS-020L': ANSWER_MAIL, 'SP-OPS-020D': ANSWER_MAIL,
  'SP-OPS-030L': CONTENT, 'SP-OPS-030D': CONTENT, 'SP-OPS-040L': CONTENT, 'SP-OPS-040D': CONTENT,
  'SP-OPS-050L': FRAUD_L, 'SP-OPS-050D': FRAUD_D, 'SP-OPS-060L': FRAUD_L, 'SP-OPS-060D': MONITOR_D,
  'SP-OPS-070P': SHOP, 'SP-OPS-071P': SHOP_KW,
  // 콘텐츠관리
  'SP-CNT-010L': CONTENT, 'SP-CNT-010D': CONTENT, 'SP-CNT-020L': CONTENT, 'SP-CNT-020D': CONTENT,
  'SP-CNT-030L': CONTENT, 'SP-CNT-030D': CONTENT,
  // 통계분석
  'SP-STA-010P': STATS, 'SP-STA-011P': STATS, 'SP-STA-020P': STATS, 'SP-STA-021P': STATS, 'SP-STA-030P': STATS,
  'SP-STA-031P': STATS, 'SP-STA-040P': STATS, 'SP-STA-041P': STATS, 'SP-STA-050P': STATS, 'SP-STA-060P': STATS,
  'SP-STA-070P': STATS,
}

/** 역할 기본값 기준 허용 여부. 계정별 조정은 이 위에 얹는다 */
export const allowed = (screen: string, role: string, action: Action) =>
  DEFAULT_MATRIX[screen]?.[role]?.includes(action) ?? false
