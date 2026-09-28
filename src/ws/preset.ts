import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'

/**
 * PrimeVue 4 프리셋 — 값은 전부 우리 토큰을 가리킨다.
 *
 * **색을 여기서 정하지 않는다.** 전부 `var(--ws-*)`로 넘긴다. 그러면 다크 전환은
 * tokens.css의 `[data-theme='dark']` 블록 하나가 맡고, PrimeVue 쪽 라이트·다크 두 벌은
 * 같은 매핑을 가리킨다. 대비 검사도 tokens.css 한 곳만 보면 된다.
 *
 * **높이 32를 여기서 맞춘다.** Aura 기본값은 같은 크기 이름끼리도 입력 38 · 선택 42 ·
 * 버튼 39로 흩어진다(DS3 선택지 D1 실측). 높이 = 테두리 2 + 안쪽 위아래 + 줄 높이다.
 * 줄 높이는 CSS(`primevue.css`)에서 20으로 박고, 여기서 안쪽 위아래를 5로 준다 — 2 + 10 + 20 = 32.
 *
 * 버튼 뜻은 원본 규칙을 따른다.
 *   primary(기본)  = 조회 · 팝업 확인 — 초록     원본 .shbox .btn_cm.pri
 *   contrast       = 저장 · 등록 — 진회색        원본 .btn_cm.pri
 *   secondary      = 보조 — 회색                 원본 .btn_cm.sec
 *   secondary outlined = 기본 흰 버튼            원본 .btn_cm
 *   danger outlined    = 위험(원본에 없다)
 */

const primaryRamp = {
  50: '#e6f4f2', 100: '#c2e4de', 200: '#99d2c8', 300: '#6dbfb1', 400: '#3fa899',
  500: '#008472', 600: '#007466', 700: '#006358', 800: '#00524a', 900: '#003f39', 950: '#002a26',
}

/** 라이트·다크가 같은 매핑을 쓴다 — 값이 바뀌는 건 CSS 변수 쪽이다 */
const scheme = {
  primary: {
    color: 'var(--ws-action-search)',
    contrastColor: 'var(--ws-text-inverse)',
    hoverColor: 'var(--ws-action-search-hover)',
    activeColor: 'var(--ws-action-search-hover)',
  },
  highlight: {
    background: 'var(--ws-surface-selected)',
    focusBackground: 'var(--ws-surface-selected)',
    color: 'var(--ws-text-brand)',
    focusColor: 'var(--ws-text-brand)',
  },
  mask: { background: 'rgb(0 0 0 / 0.4)', color: 'var(--ws-text)' },
  formField: {
    background: 'var(--ws-field-bg)',
    disabledBackground: 'var(--ws-surface-alt)',
    filledBackground: 'var(--ws-surface-alt)',
    filledHoverBackground: 'var(--ws-surface-alt)',
    filledFocusBackground: 'var(--ws-surface)',
    borderColor: 'var(--ws-field-border)',
    hoverBorderColor: 'var(--ws-text-muted)',
    focusBorderColor: 'var(--ws-field-border-focus)',
    invalidBorderColor: 'var(--ws-text-danger)',
    color: 'var(--ws-text)',
    disabledColor: 'var(--ws-text-disabled)',
    placeholderColor: 'var(--ws-text-muted)',
    invalidPlaceholderColor: 'var(--ws-text-danger)',
    floatLabelColor: 'var(--ws-text-muted)',
    floatLabelFocusColor: 'var(--ws-text-brand)',
    floatLabelActiveColor: 'var(--ws-text-muted)',
    floatLabelInvalidColor: 'var(--ws-text-danger)',
    iconColor: 'var(--ws-text-muted)',
    shadow: 'var(--ws-field-inset)',
  },
  text: {
    color: 'var(--ws-text)',
    hoverColor: 'var(--ws-text)',
    mutedColor: 'var(--ws-text-muted)',
    hoverMutedColor: 'var(--ws-text-sub)',
  },
  content: {
    background: 'var(--ws-surface)',
    hoverBackground: 'var(--ws-surface-hover)',
    borderColor: 'var(--ws-border)',
    color: 'var(--ws-text)',
    hoverColor: 'var(--ws-text)',
  },
  overlay: {
    select: { background: 'var(--ws-surface)', borderColor: 'var(--ws-field-border)', color: 'var(--ws-text)' },
    popover: { background: 'var(--ws-surface)', borderColor: 'var(--ws-border)', color: 'var(--ws-text)' },
    modal: { background: 'var(--ws-surface)', borderColor: 'var(--ws-border-lighter)', color: 'var(--ws-text)' },
  },
  list: {
    option: {
      focusBackground: 'var(--ws-surface-hover)',
      selectedBackground: 'var(--ws-surface-selected)',
      selectedFocusBackground: 'var(--ws-surface-selected)',
      color: 'var(--ws-text)',
      focusColor: 'var(--ws-text)',
      selectedColor: 'var(--ws-text-brand)',
      selectedFocusColor: 'var(--ws-text-brand)',
      icon: { color: 'var(--ws-text-muted)', focusColor: 'var(--ws-text-sub)' },
    },
    optionGroup: { background: 'transparent', color: 'var(--ws-text-muted)' },
  },
  navigation: {
    item: {
      focusBackground: 'var(--ws-surface-hover)',
      activeBackground: 'var(--ws-surface-selected)',
      color: 'var(--ws-text)',
      focusColor: 'var(--ws-text)',
      activeColor: 'var(--ws-text-brand)',
      icon: { color: 'var(--ws-text-muted)', focusColor: 'var(--ws-text-sub)', activeColor: 'var(--ws-text-brand)' },
    },
  },
}

const button = {
  root: {
    primary: {
      background: 'var(--ws-action-search)', hoverBackground: 'var(--ws-action-search-hover)', activeBackground: 'var(--ws-action-search-hover)',
      borderColor: 'var(--ws-action-search)', hoverBorderColor: 'var(--ws-action-search-hover)', activeBorderColor: 'var(--ws-action-search-hover)',
      color: 'var(--ws-text-inverse)', hoverColor: 'var(--ws-text-inverse)', activeColor: 'var(--ws-text-inverse)',
      focusRing: { color: 'var(--ws-field-border-focus)', shadow: 'none' },
    },
    contrast: {
      background: 'var(--ws-action-primary)', hoverBackground: 'var(--ws-action-primary-hover)', activeBackground: 'var(--ws-action-primary-hover)',
      borderColor: 'var(--ws-action-primary)', hoverBorderColor: 'var(--ws-action-primary-hover)', activeBorderColor: 'var(--ws-action-primary-hover)',
      color: 'var(--ws-action-primary-fg)', hoverColor: 'var(--ws-action-primary-fg)', activeColor: 'var(--ws-action-primary-fg)',
      focusRing: { color: 'var(--ws-field-border-focus)', shadow: 'none' },
    },
    danger: {
      background: 'var(--ws-action-danger)', hoverBackground: 'var(--ws-action-danger-hover)', activeBackground: 'var(--ws-action-danger-hover)',
      borderColor: 'var(--ws-action-danger)', hoverBorderColor: 'var(--ws-action-danger-hover)', activeBorderColor: 'var(--ws-action-danger-hover)',
      color: 'var(--ws-text-inverse)', hoverColor: 'var(--ws-text-inverse)', activeColor: 'var(--ws-text-inverse)',
      focusRing: { color: 'var(--ws-field-border-focus)', shadow: 'none' },
    },
    secondary: {
      background: 'var(--ws-action-sub)', hoverBackground: 'var(--ws-action-sub-hover)', activeBackground: 'var(--ws-action-sub-hover)',
      borderColor: 'var(--ws-action-sub)', hoverBorderColor: 'var(--ws-action-sub-hover)', activeBorderColor: 'var(--ws-action-sub-hover)',
      color: 'var(--ws-text-inverse)', hoverColor: 'var(--ws-text-inverse)', activeColor: 'var(--ws-text-inverse)',
      focusRing: { color: 'var(--ws-field-border-focus)', shadow: 'none' },
    },
  },
  outlined: {
    secondary: {
      hoverBackground: 'var(--ws-surface-hover)', activeBackground: 'var(--ws-surface-alt)',
      borderColor: 'var(--ws-action-default-border)', color: 'var(--ws-action-default-fg)',
    },
    danger: {
      hoverBackground: 'var(--ws-surface-danger-hover)', activeBackground: 'var(--ws-surface-danger)',
      borderColor: 'var(--ws-text-danger)', color: 'var(--ws-text-danger)',
    },
    primary: {
      hoverBackground: 'var(--ws-surface-selected)', activeBackground: 'var(--ws-surface-selected)',
      borderColor: 'var(--ws-action-search)', color: 'var(--ws-text-brand)',
    },
  },
  text: {
    secondary: { hoverBackground: 'var(--ws-surface-hover)', activeBackground: 'var(--ws-surface-alt)', color: 'var(--ws-text-sub)' },
    primary: { hoverBackground: 'var(--ws-surface-selected)', activeBackground: 'var(--ws-surface-selected)', color: 'var(--ws-text-brand)' },
  },
}

const toggle = {
  root: {
    background: 'var(--ws-surface)', hoverBackground: 'var(--ws-surface-hover)', checkedBackground: 'var(--ws-action-primary)',
    borderColor: 'var(--ws-field-border)', checkedBorderColor: 'var(--ws-action-primary)',
    color: 'var(--ws-text-sub)', hoverColor: 'var(--ws-text)', checkedColor: 'var(--ws-action-primary-fg)',
  },
  content: { checkedBackground: 'var(--ws-action-primary)' },
  icon: { color: 'var(--ws-text-sub)', hoverColor: 'var(--ws-text)', checkedColor: 'var(--ws-action-primary-fg)' },
}

const pager = {
  navButton: {
    background: 'transparent', hoverBackground: 'var(--ws-surface-hover)', selectedBackground: 'var(--ws-action-primary)',
    color: 'var(--ws-text-sub)', hoverColor: 'var(--ws-text)', selectedColor: 'var(--ws-action-primary-fg)',
  },
  currentPageReport: { color: 'var(--ws-text-sub)' },
}

const toggleSwitch = {
  root: {
    background: 'var(--ws-text-muted)', hoverBackground: 'var(--ws-text-sub)', disabledBackground: 'var(--ws-surface-alt)',
    checkedBackground: 'var(--ws-action-search)', checkedHoverBackground: 'var(--ws-action-search-hover)',
  },
  handle: {
    background: 'var(--ws-surface)', hoverBackground: 'var(--ws-surface)', disabledBackground: 'var(--ws-text-disabled)',
    checkedBackground: 'var(--ws-surface)', checkedHoverBackground: 'var(--ws-surface)',
    color: 'var(--ws-text-muted)', hoverColor: 'var(--ws-text-muted)', checkedColor: 'var(--ws-action-search)', checkedHoverColor: 'var(--ws-action-search)',
  },
}

export const WsPreset = definePreset(Aura, {
  semantic: {
    primary: primaryRamp,
    borderRadius: { none: '0', xs: '2px', sm: '3px', md: '6px', lg: '8px', xl: '10px' },
    formField: {
      paddingX: '8px',
      paddingY: '5px',
      borderRadius: 'var(--ws-radius)',
      sm: { fontSize: '12px', paddingX: '8px', paddingY: '1px' },   // 2 + 2 + 20 = 24 — 원본 짧은 버튼
      lg: { fontSize: '15px', paddingX: '12px', paddingY: '9px' },  // 2 + 18 + 20 = 40 — 로그인
      focusRing: { width: '0', style: 'none', color: 'transparent', offset: '0', shadow: 'none' },
    },
    colorScheme: { light: scheme, dark: scheme },
  },
  components: {
    button: {
      // 원본 버튼 안쪽은 0 16px — 입력칸(8px)보다 넓다
      root: {
        paddingX: '16px', paddingY: '5px', roundedBorderRadius: 'var(--ws-radius-pill)', iconOnlyWidth: '32px',
        sm: { fontSize: '12px', paddingX: '12px', paddingY: '1px', iconOnlyWidth: '24px' },
        label: { fontWeight: '600' },
      },
      colorScheme: { light: button, dark: button },
    },
    // 원본 .ws-seg(DS2) — 테두리 한 줄 안에 칸을 잇고, 고른 칸은 저장 버튼 색으로 채운다.
    // Aura 기본은 회색 판 위 흰 칸이라 고른 칸이 판과 1.1:1 — 상태가 색으로 안 읽힌다
    togglebutton: {
      root: { padding: '0', borderRadius: 'var(--ws-radius)', fontWeight: '400' },
      content: { padding: '5px 12px', borderRadius: '0', checkedShadow: 'none' },   // 2 + 10 + 20 = 32
      colorScheme: { light: toggle, dark: toggle },
    },
    // 원본 페이징 — 32 정사각, 현재 쪽은 저장 버튼 색. Aura 기본은 40px 원이다
    paginator: {
      root: { padding: '0', gap: '4px', background: 'transparent' },
      navButton: { width: '32px', height: '32px', borderRadius: 'var(--ws-radius)' },
      colorScheme: { light: pager, dark: pager },
    },
    // 끈 상태 트랙이 Aura 기본(slate-300)이면 흰 바탕과 1.5:1 — 켜졌는지 꺼졌는지가 안 읽힌다
    toggleswitch: {
      colorScheme: { light: toggleSwitch, dark: toggleSwitch },
    },
    dialog: { root: { borderRadius: 'var(--ws-radius-lg)' }, header: { padding: '12px 48px 12px 32px' }, content: { padding: '20px 32px' }, footer: { padding: '0 32px 24px', gap: '6px' } },
    tabs: {
      tablist: { borderWidth: '0 0 1px 0', background: 'transparent', borderColor: 'var(--ws-border)' },
      tab: { padding: '0 20px', fontWeight: '400', activeBorderColor: 'transparent', color: 'var(--ws-text-sub)', hoverColor: 'var(--ws-text)', activeColor: 'var(--ws-text)' },
      activeBar: { height: '0' },
    },
  },
})
