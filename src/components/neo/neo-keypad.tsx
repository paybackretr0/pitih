import { StyleSheet, View } from "react-native";

import { fonts, spacing } from "@/theme";
import { NeoButton } from "./neo-button";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["000", "0", "⌫"],
];

type Props = {
  onKey: (key: string) => void;
};

export function NeoKeypad({ onKey }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((row) => (
        <View key={row.join("")} style={styles.row}>
          {row.map((key) => (
            <View key={key} style={styles.cell}>
              <NeoButton
                label={key}
                onPress={() => onKey(key)}
                offset={3}
                compact
                labelStyle={styles.keyLabel}
                accessibilityLabel={
                  key === "⌫" ? "Hapus digit" : `Angka ${key}`
                }
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  cell: { flex: 1 },
  keyLabel: { fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 26 },
});
