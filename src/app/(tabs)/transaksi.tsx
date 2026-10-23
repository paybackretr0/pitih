import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { NeoChip } from '@/components/neo/neo-chip';
import { NeoScreen } from '@/components/neo/neo-screen';
import { NeoEmpty, NeoError, NeoLoading } from '@/components/neo/neo-states';
import { NeoText } from '@/components/neo/neo-text';
import { PeriodNavigator } from '@/components/period-navigator';
import { ScreenHeader } from '@/components/screen-header';
import { TransactionRow } from '@/components/transaction-row';
import { deleteTransaction, listTransactions, type TransactionListItem } from '@/db/queries';
import { deleteReceipt } from '@/features/receipts/receipts';
import type { TransactionType } from '@/db/schema';
import { useDbQuery } from '@/hooks/use-db-query';
import { useToday } from '@/hooks/use-today';
import { dayLabel, rp } from '@/lib/format';
import { currentPeriod, periodAtIndex } from '@/lib/period';
import { bumpData, useAppStore } from '@/store/app-store';
import { spacing } from '@/theme';

type Filter = 'all' | TransactionType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'SEMUA' },
  { value: 'income', label: 'MASUK' },
  { value: 'expense', label: 'KELUAR' },
];

export default function TransaksiScreen() {
  const today = useToday();
  const periodStart = useAppStore((state) => state.periodStart);
  const [filter, setFilter] = useState<Filter>('all');
  const basePeriod = useMemo(
    () => (periodStart ? currentPeriod(periodStart, today) : null),
    [periodStart, today],
  );
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const period = useMemo(() => {
    if (!periodStart || !basePeriod) return null;
    return periodAtIndex(periodStart, Math.min(viewIndex ?? basePeriod.index, basePeriod.index));
  }, [periodStart, basePeriod, viewIndex]);

  const list = useDbQuery(
    async () => {
      if (!period) throw new Error('Tanggal mulai periode belum diatur.');
      return listTransactions(period, filter === 'all' ? undefined : filter);
    },
    [period?.start, period?.end, filter],
  );

  const groups = useMemo(() => groupByDate(list.data ?? []), [list.data]);

  const confirmDelete = (item: TransactionListItem) => {
    Alert.alert(
      'Hapus transaksi?',
      `${item.categoryName} ${rp(item.amount)} pada ${dayLabel(item.date)}.`,
      [
        { text: 'BATAL', style: 'cancel' },
        {
          text: 'HAPUS',
          style: 'destructive',
          onPress: () => {
            deleteTransaction(item.id)
              .then(() => deleteReceipt(item.receiptUri))
              .then(bumpData)
              .catch((error: unknown) =>
                Alert.alert(
                  'Gagal menghapus',
                  error instanceof Error ? error.message : 'Coba lagi sebentar.',
                ),
              );
          },
        },
      ],
    );
  };

  if (!period) return <NeoLoading label="MENYIAPKAN PERIODE" />;

  const total = list.data?.length ?? 0;

  return (
    <NeoScreen>
      <ScreenHeader title="TRANSAKSI" subtitle={total > 0 ? `${total} CATATAN DI PERIODE INI` : undefined} />
      <PeriodNavigator
        period={period}
        today={today}
        onShift={(delta) =>
          setViewIndex((current) => (current ?? basePeriod?.index ?? 0) + delta)
        }
      />

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <NeoChip
            key={item.value}
            label={item.label}
            selected={filter === item.value}
            onPress={() => setFilter(item.value)}
          />
        ))}
      </View>

      {list.loading && !list.data ? <NeoLoading /> : null}

      {list.error ? <NeoError message={list.error} onRetry={list.retry} /> : null}

      {list.data && groups.length === 0 ? (
        <NeoEmpty
          title="TIDAK ADA CATATAN"
          message={
            filter === 'all'
              ? 'Belum ada transaksi di periode ini.'
              : `Belum ada transaksi ${filter === 'income' ? 'masuk' : 'keluar'} di periode ini.`
          }
          actionLabel="CATAT TRANSAKSI"
          onAction={() => router.push('/tambah')}
        />
      ) : null}

      {groups.map(([date, items]) => {
        const net = items.reduce(
          (sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount),
          0,
        );
        return (
          <View key={date} style={styles.group}>
            <View style={styles.groupHeader}>
              <NeoText variant="label">{dayLabel(date)}</NeoText>
              <NeoText variant="mono" style={styles.groupTotal}>
                {net === 0 ? 'Rp 0' : `${net > 0 ? '+' : '-'}${rp(Math.abs(net))}`}
              </NeoText>
            </View>
            <View style={styles.groupRows}>
              {items.map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  onPress={() => router.push({ pathname: '/tambah', params: { id: String(item.id) } })}
                  onLongPress={() => confirmDelete(item)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </NeoScreen>
  );
}

function groupByDate(items: TransactionListItem[]): [string, TransactionListItem[]][] {
  const groups = new Map<string, TransactionListItem[]>();
  for (const item of items) {
    const existing = groups.get(item.date);
    if (existing) existing.push(item);
    else groups.set(item.date, [item]);
  }
  return Array.from(groups.entries());
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  groupTotal: { fontSize: 14 },
  groupRows: { gap: spacing.sm },
});
