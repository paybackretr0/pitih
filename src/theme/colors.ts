/**
 * Palette from the product brief. Every bright fill is paired with ink text,
 * never white: white on yellow or pink fails WCAG AA at body sizes.
 */
export const colors = {
  bg: "#FFF4E0",
  ink: "#111111",
  white: "#FFFFFF",
  yellow: "#FFD93D",
  pink: "#FF6B9D",
  green: "#6BCB77",
  blue: "#4D96FF",
  orange: "#FF9F45",
  red: "#FF4D4D",
  purple: "#B983FF",
} as const;

export type ColorToken = keyof typeof colors;

export const categoryPalette: ColorToken[] = [
  "yellow",
  "pink",
  "green",
  "blue",
  "orange",
  "purple",
  "red",
];

export const categoryColors = categoryPalette.map((token) => colors[token]);

export function categoryColor(value: string | null | undefined): string {
  return value && (categoryColors as string[]).includes(value)
    ? value
    : colors.yellow;
}
