import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { colors, layout, spacing } from "@/theme";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
};

export function NeoScreen({
  children,
  scroll = true,
  contentStyle,
  style,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      edges={["top"]}
      style={[{ flex: 1, backgroundColor: colors.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            {
              paddingHorizontal: layout.screenPadding,
              paddingTop: spacing.md,
              paddingBottom: spacing.xxl,
              gap: spacing.lg,
            },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            {
              flex: 1,
              paddingHorizontal: layout.screenPadding,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              gap: spacing.lg,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
      {footer ? (
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            backgroundColor: colors.bg,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = { scroll: { flex: 1 } };
