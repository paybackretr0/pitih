import { StyleSheet, View } from "react-native";

import { border as borderTokens, colors } from "@/theme";

type Props = {
  value: number;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
};

export function NeoProgress({
  value,
  color = colors.ink,
  height = 22,
  accessibilityLabel,
}: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { height }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  fill: { height: "100%" },
});
