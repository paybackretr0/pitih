import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { border as borderTokens, colors, layout, spacing } from "@/theme";
import { NeoText } from "./neo-text";

type Props = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  leading?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function NeoChip({
  label,
  onPress,
  selected = false,
  leading,
  bg,
  style,
  accessibilityLabel,
}: Props) {
  const [focused, setFocused] = useState(false);
  const offset = borderTokens.smallOffset;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (leading ? `${label}, ${leading}` : label)
      }
      accessibilityState={{ selected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={style}
    >
      {({ pressed }) => (
        <View style={{ paddingRight: offset, paddingBottom: offset }}>
          {!pressed && selected && (
            <View
              pointerEvents="none"
              style={[styles.shadow, { top: offset, left: offset }]}
            />
          )}
          <View
            style={[
              styles.chip,
              {
                backgroundColor: selected
                  ? (bg ?? colors.yellow)
                  : colors.white,
              },
              pressed && {
                transform: [{ translateX: offset }, { translateY: offset }],
              },
            ]}
          >
            {focused && <View pointerEvents="none" style={styles.focusRing} />}
            {leading ? <NeoText variant="body">{leading}</NeoText> : null}
            <NeoText variant="label" numberOfLines={1}>
              {label}
            </NeoText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: layout.minTapTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
  },
  shadow: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  focusRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: borderTokens.width,
    borderColor: colors.blue,
  },
});
