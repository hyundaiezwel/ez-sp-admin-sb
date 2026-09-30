import type { InjectionKey } from 'vue'

/**
 * SbFrame이 화면 코드와 명세 열기를 내려준다. PageHead · SbCan · SbPending이 받는다.
 * 따로 둔 이유 — PageHead는 모든 화면이 쓴다. context.ts를 물면 명세 JSON 전부가 공용 청크로 끌려온다.
 */
export const SB_FRAME: InjectionKey<{ code: string; openSpec: () => void }> = Symbol('sb-frame')
