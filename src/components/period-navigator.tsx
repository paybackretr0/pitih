import { StyleSheet, View } from 'react-native';

import { NeoButton } from './neo/neo-button';
import { NeoText } from './neo/neo-text';
import { shortDate, shortDateWithYear } from '@/lib/format';
import { daysLeft, isPeriodCurrent, type Period } from '@/lib/period';
import { colors, spacing } from '@/theme';

type Props = {
  period: Period;
  today: string;
  onShift: (delta: number) => void;
};

export function PeriodNavigator({ period, today, onShift }: Props) {
  const left = daysLeft(period, today);
  const current = isPeriodCurrent(period, today);
  const state = current ? `SISA ${left} HARI` : left > 0 ? 'BELUM MULAI' : 'SELESAI';

  return (
    <View style={styles.row}>
      <NeoButton
        label="<"
        onPress={() => onShift(-1)}
        compact
        offset={3}
        accessibilityLabel="Periode sebelumnya"
      />
      <View style={styles.center}>
        <NeoText variant="label" numberOfLines={1}>
          {`${shortDate(period.start)} - ${shortDateWithYear(period.end)}`}
        </NeoText>
        <NeoText variant="label" color={current ? colors.ink : '#11111199'}>
          {state}
        </NeoText>
      </View>
      <NeoButton
        label=">"
        onPress={() => onShift(1)}
        compact
        offset={3}
        disabled={current}
        accessibilityLabel="Periode berikutnya"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', gap: 2 },
});
