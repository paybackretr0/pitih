import { ActivityIndicator, StyleSheet, View } from "react-native";

import { border as borderTokens, colors, spacing } from "@/theme";
import { NeoButton } from "./neo-button";
import { NeoCard } from "./neo-card";
import { NeoText } from "./neo-text";

export function NeoLoading({ label = "MEMUAT DATA" }: { label?: string }) {
  return (
    <View
      style={styles.loading}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={colors.ink} />
      <NeoText variant="label">{label}</NeoText>
    </View>
  );
}

export function NeoError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <NeoCard>
      <View style={styles.errorFlag}>
        <NeoText variant="label">GAGAL MEMUAT</NeoText>
      </View>
      <NeoText variant="body" style={styles.message}>
        {message}
      </NeoText>
      <NeoButton label="COBA LAGI" onPress={onRetry} style={styles.action} />
    </NeoCard>
  );
}

export function NeoEmpty({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <NeoText variant="subtitle">{title}</NeoText>
      <NeoText variant="small" style={styles.message}>
        {message}
      </NeoText>
      {actionLabel && onAction ? (
        <NeoButton
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  empty: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    borderStyle: "dashed",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  message: { marginTop: spacing.xs },
  action: { marginTop: spacing.sm },
  errorFlag: {
    alignSelf: "flex-start",
    backgroundColor: colors.red,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
