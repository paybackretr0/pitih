import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { border as borderTokens, colors, layout } from "@/theme";
import { NeoText } from "./neo-text";

type Option<T extends string> = {
  value: T;
  label: string;
  bg?: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function NeoSegmented<T extends string>({
  options,
  value,
  onChange,
  style,
  accessibilityLabel,
}: Props<T>) {
  const [focusedValue, setFocusedValue] = useState<T | null>(null);

  return (
    <View accessibilityRole="tablist" style={[styles.group, style]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={`${accessibilityLabel ?? ""} ${option.label}`.trim()}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            onFocus={() => setFocusedValue(option.value)}
            onBlur={() => setFocusedValue(null)}
            style={[
              styles.option,
              index > 0 && styles.divider,
              {
                backgroundColor: selected
                  ? (option.bg ?? colors.yellow)
                  : colors.white,
              },
            ]}
          >
            {focusedValue === option.value && (
              <View pointerEvents="none" style={styles.focusRing} />
            )}
            <NeoText
              variant="label"
              numberOfLines={1}
              color={selected ? colors.ink : "#11111199"}
            >
              {option.label}
            </NeoText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  option: {
    flex: 1,
    minHeight: layout.minTapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  divider: { borderLeftWidth: borderTokens.width, borderLeftColor: colors.ink },
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
