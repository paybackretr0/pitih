import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TransactionListItem } from "@/db/queries";
import { rp } from "@/lib/format";
import {
  border as borderTokens,
  categoryColor,
  colors,
  fonts,
  spacing,
} from "@/theme";
import { NeoSurface } from "./neo/neo-surface";
import { NeoText } from "./neo/neo-text";

type Props = {
  item: TransactionListItem;
  onPress: () => void;
  onLongPress: () => void;
};

export function TransactionRow({ item, onPress, onLongPress }: Props) {
  const [focused, setFocused] = useState(false);
  const isIncome = item.type === "income";
  const tag =
    item.needWant === "need"
      ? "BUTUH"
      : item.needWant === "want"
        ? "MAU"
        : null;
  const label = `${item.categoryName}, ${isIncome ? "masuk" : "keluar"} ${rp(item.amount)}${
    item.note ? `, ${item.note}` : ""
  }`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Ketuk untuk ubah, tekan lama untuk hapus"
      onPress={onPress}
      onLongPress={onLongPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      delayLongPress={450}
    >
      {({ pressed }) => (
        <NeoSurface
          offset={3}
          bg={pressed ? "#FFF0C9" : colors.white}
          innerStyle={styles.inner}
        >
          <View
            style={[
              styles.icon,
              { backgroundColor: categoryColor(item.categoryColor) },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.emoji}>{item.categoryIcon ?? "•"}</Text>
          </View>

          <View style={styles.body}>
            <NeoText variant="body" numberOfLines={1}>
              {item.categoryName}
            </NeoText>
            {item.note ? (
              <NeoText variant="small" numberOfLines={1} color="#11111199">
                {item.note}
              </NeoText>
            ) : null}
            {tag ? (
              <View style={styles.meta}>
                <NeoText variant="label">{tag}</NeoText>
              </View>
            ) : null}
          </View>

          <NeoText variant="mono" style={styles.amount} numberOfLines={1}>
            {isIncome ? "+" : "-"}
            {rp(item.amount).replace("Rp ", "")}
          </NeoText>
          {focused ? (
            <View pointerEvents="none" style={styles.focusRing} />
          ) : null}
        </NeoSurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  amount: { fontFamily: fonts.monoBold, flexShrink: 0 },
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
