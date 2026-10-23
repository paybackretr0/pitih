/**
 * Space Grotesk carries the blunt, geometric voice of the headings;
 * Space Mono keeps rupiah figures in fixed-width columns so amounts line up.
 */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  body: 'SpaceGrotesk_400Regular',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const fontSizes = {
  display: 30,
  title: 22,
  subtitle: 17,
  body: 15,
  small: 13,
  label: 11,
  amount: 26,
  amountLarge: 40,
} as const;
