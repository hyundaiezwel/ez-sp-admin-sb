/**
 * SB 화면 명세 — **이 파일의 타입이 명세 JSON의 정본이다.**
 *
 * 위치: `src/specs/<CODE>.json` — 화면 하나당 파일 하나. 파일을 더하면 빌드가 알아서 읽는다(아래 glob).
 * 요구사항은 EARS 5패턴, 문장 주어는 "시스템은", 업무 용어는 「용어」. 모든 항목에 확인 수준(level)을 단다.
 */
import type { Action } from './roles'

export type Level = '확인' | '추정' | '미확인'
export type ScreenType = '목록' | '상세' | '등록' | '모달' | '대시보드' | '통계' | '액션' | '페이지'
export type Ears = '보편' | '상태' | '이벤트' | '선택' | '원치않는상황'

export interface Requirement { id: string; pattern: Ears; text: string; level: Level; source: string }
export interface FunctionDef { id: string; name: string; desc: string; rules: string[]; level: Level; source: string }
export interface Scenario { id: string; title: string; kind: '정상' | '예외' | '권한'; gherkin: string; level: Level }
export interface PermissionRow { role: string; actions: Action[]; note: string }
export interface DataUse { entity: string; fields: string[]; crud: string; owner: '직접' | '복지몰' | '결정필요'; note: string }
export interface StateChange { from: string; to: string; action: string; required: string[]; notify: string; reversible: boolean | null }
export interface Notification { trigger: string; channel: 'LMS' | 'SMS' | 'Email' | '시스템'; to: string; note: string }
export interface AsisRef { id: string; name: string; relation: '대응' | '통합' | '참고' | '없음' }
export interface ModalDef { code: string; name: string; purpose: string; fields: string[]; rules: string[] }
export interface OpenQuestion { id: string; q: string; why: string }
export interface Tokens { input: number; output: number; cacheRead: number; cacheWrite: number }
export interface StageEffort { minutes: number; tokens: Tokens }

export interface Spec {
  code: string
  name: string
  /** 1~3depth */
  menu: string[]
  type: ScreenType
  status: 'draft' | 'complete'
  /** 2~3문장 */
  summary: string
  iaRef: { row: number; cls: '신규' | '유사' | ''; link: 'O' | 'API' | '▲' | ''; memo: string }
  requirements: Requirement[]
  functions: FunctionDef[]
  scenarios: Scenario[]
  /** rows는 roles.ts의 ROLES 전부를 한 줄씩 */
  permissions: { note: string; rows: PermissionRow[] }
  /** entity는 ENTITIES 이름 그대로(예 'E05 참여 건') */
  data: DataUse[]
  /** from · to는 src/sp/codes.ts STATES 코드(110~840). 시작 상태가 없으면 '' */
  states: StateChange[]
  notifications: Notification[]
  notes: string[]
  constraints: string[]
  asis: AsisRef[]
  /** 모달 코드는 '<CODE>-M1'… 화면 파일에 `<SbCode code="…-M1" />`로 반드시 나온다 */
  modals: ModalDef[]
  openQuestions: OpenQuestion[]
  /** 비워 둔다 — 마스터가 나중에 채운다 */
  effort?: { spec?: StageEffort; build?: StageEffort; fix?: StageEffort } | null
}

/** 데이터 엔티티 — `data[].entity`에 이 문자열을 그대로 쓴다 */
export const ENTITIES = [
  'E01 사업', 'E02 발전모델', 'E03 추가모집 설정', 'E04 기업', 'E05 참여 건', 'E06 추가 인원 신청',
  'E07 기업 담당자 계정', 'E08 지원기관 관리자 계정', 'E09 참여 노동자', 'E10 제출 서류', 'E11 가상계좌·입금',
  'E12 포인트 배정', 'E13 포인트 사용 거래', 'E14 포인트 사용기한', 'E15 이용정지', 'E16 환불',
  'E17 전자청구서', 'E18 기업별 청구·잔여금', 'E19 참여불가 기업', 'E20 참여불가 회원', 'E21 부정행위 적발 건',
  'E22 부정행위 신고', 'E23 업무요청', 'E24 알림 발송', 'E25 개인정보 다운로드 이력', 'E26 대외 콘텐츠', 'E27 통계 집계',
] as const

const files = import.meta.glob<Spec>('/src/specs/*.json', { eager: true, import: 'default' })
const byCode = new Map(Object.values(files).map((s) => [s.code, s]))

export const getSpec = (code: string): Spec | undefined => byCode.get(code)
export const allSpecs = (): Spec[] => [...byCode.values()]

/** 확인 수준 → 뱃지 클래스 */
export const levelTone = (l: Level) => `ws-badge ws-badge--${l === '확인' ? 'success' : l === '추정' ? 'warning' : 'danger'}`
