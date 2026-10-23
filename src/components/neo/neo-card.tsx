import type { StyleProp, ViewStyle } from "react-native";

import { spacing } from "@/theme";
import { NeoSurface } from "./neo-surface";

type Props = {
  children: React.ReactNode;
  bg?: string;
  offset?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function NeoCard({
  children,
  bg,
  offset,
  style,
  innerStyle,
  padded = true,
}: Props) {
  return (
    <NeoSurface
      bg={bg}
      offset={offset}
      style={style}
      innerStyle={[{ padding: padded ? spacing.lg : 0 }, innerStyle]}
    >
      {children}
    </NeoSurface>
  );
}
