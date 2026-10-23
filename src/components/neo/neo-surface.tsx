import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { border as borderTokens, colors } from "@/theme";

type Props = {
  children: React.ReactNode;
  bg?: string;
  offset?: number;
  borderWidth?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
};

/**
 * React Native shadows always blur, so the hard shadow is a second View
 * shifted down and right behind the surface. The container reserves that
 * offset as padding, otherwise the shadow would be clipped by siblings.
 */
export function NeoSurface({
  children,
  bg = colors.white,
  offset = borderTokens.offset,
  borderWidth = borderTokens.width,
  borderColor = colors.ink,
  style,
  innerStyle,
}: Props) {
  return (
    <View style={[{ paddingRight: offset, paddingBottom: offset }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          { top: offset, left: offset, backgroundColor: colors.ink },
        ]}
      />
      <View
        style={[{ backgroundColor: bg, borderWidth, borderColor }, innerStyle]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
});
