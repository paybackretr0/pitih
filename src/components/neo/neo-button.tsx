import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { border as borderTokens, colors, fonts, layout } from "@/theme";
import { NeoText, type NeoTextVariant } from "./neo-text";

type Props = {
  label: string;
  onPress: () => void;
  bg?: string;
  color?: string;
  disabled?: boolean;
  compact?: boolean;
  offset?: number;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  labelVariant?: NeoTextVariant;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function NeoButton({
  label,
  onPress,
  bg = colors.yellow,
  color = colors.ink,
  disabled = false,
  compact = false,
  offset = borderTokens.offset,
  style,
  labelStyle,
  labelVariant = "label",
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={style}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.frame,
            { paddingRight: offset, paddingBottom: offset },
            disabled && styles.disabled,
          ]}
        >
          {!pressed && (
            <View
              pointerEvents="none"
              style={[styles.shadow, { top: offset, left: offset }]}
            />
          )}
          <View
            style={[
              styles.face,
              compact ? styles.faceCompact : styles.faceRegular,
              { backgroundColor: bg },
              pressed && {
                transform: [{ translateX: offset }, { translateY: offset }],
              },
            ]}
          >
            {focused && <View pointerEvents="none" style={styles.focusRing} />}
            <NeoText
              variant={labelVariant}
              color={color}
              numberOfLines={1}
              style={[styles.label, labelStyle]}
            >
              {label}
            </NeoText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {},
  disabled: { opacity: 0.45 },
  shadow: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
  },
  face: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    minHeight: layout.minTapTarget,
  },
  faceRegular: { paddingVertical: 13, paddingHorizontal: 18 },
  faceCompact: { paddingVertical: 9, paddingHorizontal: 12 },
  label: { fontFamily: fonts.monoBold, textAlign: "center" },
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
