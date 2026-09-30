import type { StageEffort, Tokens } from './spec'

/**
 * 소요 집계 — `src/sb/effort.json`(마스터가 마지막에 만든다). 파일이 없으면 null → 화면에 '집계 전'.
 */
export interface Effort {
  generatedAt: string
  stages: { id: string; label: string; minutes: number; tokens: Tokens; agents: number }[]
  screens: Record<string, { spec: StageEffort; build: StageEffort; fix?: StageEffort }>
  method: string
}

const f = import.meta.glob<Effort>('/src/sb/effort.json', { eager: true, import: 'default' })
export const EFFORT: Effort | null = Object.values(f)[0] ?? null

export const tokenSum = (t: Tokens) => t.input + t.output + t.cacheRead + t.cacheWrite
