import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { parseISO } from "date-fns";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { isoDay } from "@/lib/format";
import { border as borderTokens, colors, layout, spacing } from "@/theme";
import { NeoText } from "./neo/neo-text";

type Props = {
  label: string;
  value: string;
  displayValue: string;
  onChange: (iso: string) => void;
  maximumDate?: Date;
  accessibilityHint?: string;
};

export function DateField({
  label,
  value,
  displayValue,
  onChange,
  maximumDate,
  accessibilityHint = "Buka pemilih tanggal",
}: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === "set" && selected) onChange(isoDay(selected));
  };

  return (
    <View style={styles.wrap}>
      <NeoText variant="label">{label}</NeoText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayValue}`}
        accessibilityHint={accessibilityHint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          focused && styles.focused,
          pressed && styles.pressed,
        ]}
      >
        <NeoText variant="body" numberOfLines={1}>
          {displayValue}
        </NeoText>
        <NeoText variant="label">UBAH</NeoText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={parseISO(value)}
          mode="date"
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  field: {
    minHeight: layout.minTapTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: "#FFF0C9" },
  focused: { borderColor: colors.blue },
});
