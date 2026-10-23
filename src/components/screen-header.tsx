import { StyleSheet, View } from "react-native";

import { spacing } from "@/theme";
import { NeoText } from "./neo/neo-text";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <NeoText variant="display">{title}</NeoText>
        {subtitle ? (
          <NeoText variant="label" color="#11111199">
            {subtitle}
          </NeoText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  text: { flex: 1, gap: 2 },
});
