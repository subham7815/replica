// Tokens taken from dexai.app's shipped stylesheet so every client matches the brand exactly.
export const colors = {
  red: '#c7102c',
  redDark: '#a10d24',
  redDeep: '#7f0a1d',
  redSoft: '#fdeef0',
  redOnDark: '#ff8a9c',

  navy: '#23252e',
  navyDeep: '#17181e',
  navyInk: '#121317',
  navySoft: '#f2f2f4',
  onDark: '#b8bac4',

  ink: '#111218',
  text: '#4a4d57',
  muted: '#5a5d68',
  faint: '#9a9ca6',

  line: '#e6e6e9',
  lineSoft: '#ececef',
  lineStrong: '#d3d3d9',
  surface: '#f7f7f8',
  white: '#ffffff',

  green: '#15803d',
  greenSoft: '#e8f6ec',
  amber: '#9a4a00',
  amberSoft: '#fef3e2',
} as const;

export type ColorToken = keyof typeof colors;

export const shadows = {
  sm: '0 1px 2px #1112180f',
  md: '0 24px 48px -24px #11121840',
  lg: '0 40px 80px -32px #11121873',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const motion = {
  shimmerMs: 1600,
  pulseMs: 2000,
  spinMs: 900,
  progressMs: 1200,
  marqueeMs: 40000,
  driftMs: 18000,
} as const;

export const statusColors = {
  CONFIRMED: { fg: colors.green, bg: colors.greenSoft },
  WAITLISTED: { fg: colors.amber, bg: colors.amberSoft },
  CANCELLED: { fg: colors.muted, bg: colors.navySoft },
} as const;
