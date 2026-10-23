import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NeoText } from './neo/neo-text';
import { formatReminderTime } from '@/features/reminder/reminder';
import { border as borderTokens, colors, layout, spacing } from '@/theme';

type Props = {
  label: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
};

export function TimeField({ label, hour, minute, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const display = formatReminderTime({ hour, minute });
  const value = useMemo(() => new Date(2000, 0, 1, hour, minute), [hour, minute]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(selected.getHours(), selected.getMinutes());
  };

  return (
    <View style={styles.wrap}>
      <NeoText variant="label">{label}</NeoText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        accessibilityHint="Buka pemilih jam"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, focused && styles.focused, pressed && styles.pressed]}>
        <NeoText variant="mono" numberOfLines={1}>
          {display}
        </NeoText>
        <NeoText variant="label">UBAH</NeoText>
      </Pressable>
      {open ? (
        <DateTimePicker value={value} mode="time" is24Hour onChange={handleChange} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  field: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: '#FFF0C9' },
  focused: { borderColor: colors.blue },
});
