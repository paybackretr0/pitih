import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

import { colors, fonts, fontSizes } from "@/theme";

export type NeoTextVariant =
  | "display"
  | "title"
  | "subtitle"
  | "body"
  | "small"
  | "label"
  | "mono"
  | "amount"
  | "amountLarge";

type Props = TextProps & {
  variant?: NeoTextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
};

const variants: Record<NeoTextVariant, TextStyle> = {
  display: {
    fontFamily: fonts.display,
    fontSize: fontSizes.display,
    lineHeight: 34,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSizes.title,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: fonts.display,
    fontSize: fontSizes.subtitle,
    lineHeight: 22,
  },
  body: { fontFamily: fonts.body, fontSize: fontSizes.body, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: fontSizes.small, lineHeight: 18 },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.label,
    lineHeight: 15,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  mono: { fontFamily: fonts.mono, fontSize: fontSizes.body, lineHeight: 20 },
  amount: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.amount,
    lineHeight: 32,
  },
  amountLarge: {
    fontFamily: fonts.monoBold,
    fontSize: fontSizes.amountLarge,
    lineHeight: 46,
  },
};

export function NeoText({
  variant = "body",
  color = colors.ink,
  style,
  ...rest
}: Props) {
  return <Text {...rest} style={[variants[variant], { color }, style]} />;
}
