/**
 * 실제 로그인 모드 — `VITE_API_BASE`가 있는 빌드에서만 켠다(docs/dev/login.md 2.1).
 * 없으면(GitHub Pages) 지금 목업 그대로다. 빌드 때 상수로 박혀 목업 빌드에서는 `src/auth`가 통째로 빠진다 —
 * 그래서 이 파일은 아무것도 import하지 않는다(axios · pinia 스토어를 첫 로드에 끌고 오지 않게).
 */
export const REAL = !!import.meta.env.VITE_API_BASE
