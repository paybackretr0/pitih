import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  border as borderTokens,
  colors,
  fonts,
  layout,
  spacing,
} from "@/theme";
import { NeoText } from "./neo-text";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function NeoInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  maxLength,
  autoFocus,
  error,
  style,
  accessibilityLabel,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <NeoText variant="label">{label}</NeoText>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#11111199"
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardAppearance="light"
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.invalid : null,
        ]}
      />
      {error ? (
        <View style={styles.errorFlag}>
          <NeoText variant="small">{error}</NeoText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: layout.minTapTarget,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  focused: { borderColor: colors.blue },
  invalid: { borderColor: colors.red },
  errorFlag: {
    alignSelf: "flex-start",
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
