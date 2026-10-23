/**
 * Design read: local finance tracker for Android, NeoBrutalism language,
 * ENERGY 3 / RHYTHM 2 / MOTION 1. Loud type and color, repeated hard shadow,
 * motion only as the press-sink, no gradients or glow.
 */
export { colors, categoryColors, categoryColor, categoryPalette } from './colors';
export type { ColorToken } from './colors';
export { fonts, fontSizes } from './fonts';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Thick ink border and hard, blur-free offset are the app's identity motif. */
export const border = {
  width: 3,
  offset: 4,
  smallOffset: 2,
} as const;

export const layout = {
  screenPadding: 20,
  minTapTarget: 44,
} as const;
