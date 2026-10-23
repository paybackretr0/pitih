import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoProgress } from "@/components/neo/neo-progress";
import { NeoScreen } from "@/components/neo/neo-screen";
import { NeoEmpty, NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoText } from "@/components/neo/neo-text";
import { PeriodNavigator } from "@/components/period-navigator";
import { ScreenHeader } from "@/components/screen-header";
import { listCheckins } from "@/db/checkins";
import { listGoals } from "@/db/goals";
import {
  getCategoryBudgets,
  getCategoryTotals,
  getPeriodSummary,
  getSpentOn,
  getTotalBudget,
  listTransactions,
  type TransactionListItem,
} from "@/db/queries";
import { goalProgressPercent } from "@/features/goals/goals";
import {
  currentStreak,
  isWeekStamped,
  stampsInCard,
  weekStartFor,
  STAMP_CARD_SIZE,
} from "@/features/tertib/tertib";
import { useDbQuery } from "@/hooks/use-db-query";
import { useToday } from "@/hooks/use-today";
import { categoryBudgetWarnings } from "@/lib/budget-warnings";
import { dayLabel, percentOf, rp } from "@/lib/format";
import {
  currentPeriod,
  daysLeft,
  isPeriodCurrent,
  periodAtIndex,
  shiftPeriod,
} from "@/lib/period";
import {
  budgetStatus,
  dailyAllowance,
  statusLabel,
  type StatusLevel,
} from "@/lib/status";
import { useAppStore } from "@/store/app-store";
import {
  border as borderTokens,
  categoryColor,
  colors,
  spacing,
} from "@/theme";

const statusColors: Record<StatusLevel, string> = {
  aman: colors.green,
  "hati-hati": colors.orange,
  boros: colors.red,
};

export default function BerandaScreen() {
  const today = useToday();
  const periodStart = useAppStore((state) => state.periodStart);
  const basePeriod = useMemo(
    () => (periodStart ? currentPeriod(periodStart, today) : null),
    [periodStart, today],
  );
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const period = useMemo(() => {
    if (!periodStart || !basePeriod) return null;
    return periodAtIndex(
      periodStart,
      Math.min(viewIndex ?? basePeriod.index, basePeriod.index),
    );
  }, [periodStart, basePeriod, viewIndex]);

  const dashboard = useDbQuery(async () => {
    if (!period) throw new Error("Tanggal mulai periode belum diatur.");
    const previousPeriod = shiftPeriod(period, -1);
    const [
      summary,
      budget,
      transactions,
      previous,
      todaySpent,
      categoryTotals,
      categoryBudgets,
      goals,
      checkins,
    ] = await Promise.all([
      getPeriodSummary(period),
      getTotalBudget(period.index),
      listTransactions(period),
      getPeriodSummary(previousPeriod),
      getSpentOn(today),
      getCategoryTotals(period),
      getCategoryBudgets(period.index),
      listGoals(),
      listCheckins(),
    ]);
    return {
      summary,
      budget,
      transactions,
      previous,
      todaySpent,
      categoryTotals,
      categoryBudgets,
      goals,
      checkins,
    };
  }, [period?.start, period?.end, period?.index, today]);

  if (!period) return <NeoLoading label="MENYIAPKAN PERIODE" />;
  if (dashboard.loading && !dashboard.data) return <NeoLoading />;
  if (dashboard.error || !dashboard.data) {
    return (
      <NeoScreen>
        <NeoError
          message={dashboard.error ?? "Data tidak tersedia."}
          onRetry={dashboard.retry}
        />
      </NeoScreen>
    );
  }

  const {
    summary,
    budget,
    transactions,
    previous,
    todaySpent,
    categoryTotals,
    categoryBudgets,
    goals,
    checkins,
  } = dashboard.data;
  const left = daysLeft(period, today);
  const current = isPeriodCurrent(period, today);
  const status = budgetStatus(summary.expense, budget, left);
  const allowance = dailyAllowance(budget, summary.expense, left);
  const recent = transactions.slice(0, 5);
  const wantPercent = percentOf(summary.want, summary.expense);
  const needPercent = percentOf(summary.need, summary.expense);
  const untagged = summary.expense - summary.need - summary.want;
  const overToday =
    current && allowance !== null && todaySpent > allowance
      ? todaySpent - allowance
      : 0;
  const previousDelta =
    previous.expense > 0
      ? Math.round(
          ((summary.expense - previous.expense) / previous.expense) * 100,
        )
      : null;
  const balance = summary.income - summary.expense;
  const warnings = categoryBudgetWarnings(
    categoryTotals.map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      total: Number(row.total),
    })),
    categoryBudgets,
  );
  const topCategories = categoryTotals.slice(0, 5);
  const weekStart = weekStartFor(today);
  const currentWeekStamped = isWeekStamped(checkins, weekStart);
  const stamps = stampsInCard(checkins.length);
  const streak = currentStreak(checkins, today);

  return (
    <NeoScreen>
      <ScreenHeader title="PITIH" subtitle="KAS PER 30 HARI" />
      <PeriodNavigator
        period={period}
        today={today}
        onShift={(delta) =>
          setViewIndex((current) => (current ?? basePeriod?.index ?? 0) + delta)
        }
      />

      <NeoCard innerStyle={styles.budgetCard}>
        <View style={styles.rowBetween}>
          <NeoText variant="label">TERPAKAI</NeoText>
          {status ? (
            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusColors[status.level] },
              ]}
            >
              <NeoText variant="label">{statusLabel[status.level]}</NeoText>
            </View>
          ) : null}
        </View>

        <NeoText
          variant="amountLarge"
          numberOfLines={1}
          style={styles.bigAmount}
        >
          {rp(summary.expense)}
        </NeoText>

        {budget ? (
          <>
            <NeoText variant="small">{`dari ${rp(budget)}`}</NeoText>
            <NeoProgress
              value={summary.expense / budget}
              color={status ? statusColors[status.level] : colors.ink}
              accessibilityLabel="Pemakaian budget periode"
            />
            <NeoText variant="label">
              {`${Math.round((summary.expense / budget) * 100)}% DARI BUDGET`}
            </NeoText>
            {status ? (
              <NeoText variant="small">
                {statusMessage(status.level, status.pace)}
              </NeoText>
            ) : null}
          </>
        ) : (
          <>
            <NeoText variant="small">
              Budget periode belum diatur, jadi status dan jatah harian belum
              bisa dihitung.
            </NeoText>
            <NeoButton
              label="ATUR BUDGET"
              compact
              onPress={() => router.push("/pengaturan")}
            />
          </>
        )}

        {previousDelta !== null ? (
          <NeoText variant="small" color="#11111199">
            {`Pengeluaran ${Math.abs(previousDelta)}% lebih ${previousDelta >= 0 ? "tinggi" : "rendah"} dari periode lalu.`}
          </NeoText>
        ) : null}
      </NeoCard>

      <NeoCard
        bg={balance < 0 ? colors.pink : colors.white}
        innerStyle={styles.balanceCard}
      >
        <View style={styles.rowBetween}>
          <NeoText variant="label">SALDO PERIODE</NeoText>
          <NeoText variant="label" color="#11111199">
            MASUK - KELUAR
          </NeoText>
        </View>
        <NeoText variant="amount" numberOfLines={1}>
          {rp(balance)}
        </NeoText>
        <NeoText variant="small">{`Masuk ${rp(summary.income)}, keluar ${rp(summary.expense)}.`}</NeoText>
      </NeoCard>

      {overToday > 0 ? (
        <View style={styles.warning}>
          <NeoText variant="label" color={colors.ink}>
            {`HARI INI LEWAT JATAH ${rp(overToday)}`}
          </NeoText>
        </View>
      ) : null}

      {warnings.length > 0 ? (
        <View style={styles.warningList}>
          {warnings.map((warning) => (
            <View
              key={warning.categoryId}
              style={[
                styles.warning,
                {
                  backgroundColor:
                    warning.level === "over" ? colors.red : colors.orange,
                },
              ]}
            >
              <NeoText variant="label" numberOfLines={1}>
                {warning.level === "over"
                  ? `${warning.name} LEWAT BUDGET`
                  : `${warning.name} ${warning.percent}% DARI BUDGET`}
              </NeoText>
              <NeoText variant="small">
                {`${rp(warning.spent)} dari ${rp(warning.budget)}. Sisa ${left} hari.`}
              </NeoText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.twoColumns}>
        <NeoCard
          bg={colors.green}
          style={styles.column}
          innerStyle={styles.tile}
        >
          <NeoText variant="label">MASUK</NeoText>
          <NeoText variant="mono" numberOfLines={1} style={styles.tileAmount}>
            {rp(summary.income)}
          </NeoText>
        </NeoCard>
        <NeoCard
          bg={colors.pink}
          style={styles.column}
          innerStyle={styles.tile}
        >
          <NeoText variant="label">KELUAR</NeoText>
          <NeoText variant="mono" numberOfLines={1} style={styles.tileAmount}>
            {rp(summary.expense)}
          </NeoText>
        </NeoCard>
      </View>

      {allowance !== null && current ? (
        <NeoCard innerStyle={styles.allowance}>
          <NeoText variant="label">JATAH HARIAN</NeoText>
          <NeoText variant="amount" numberOfLines={1}>
            {rp(allowance)}
          </NeoText>
          <NeoText variant="small">{`Sisa ${left} hari. Angka ini turun tiap kali kamu mencatat pengeluaran.`}</NeoText>
        </NeoCard>
      ) : null}

      {summary.expense > 0 && wantPercent !== null ? (
        <NeoCard innerStyle={styles.wantCard}>
          <View style={styles.rowBetween}>
            <NeoText variant="label">KEINGINAN</NeoText>
            <NeoText variant="label">{`${wantPercent}%`}</NeoText>
          </View>
          <NeoText variant="subtitle">
            {wantPercent > 0
              ? `${wantPercent}% uangmu habis buat KEINGINAN.`
              : "Belum ada uang yang habis buat KEINGINAN."}
          </NeoText>
          <View style={styles.splitBar}>
            {summary.need > 0 ? (
              <View
                style={[
                  styles.splitPart,
                  { flex: summary.need, backgroundColor: colors.green },
                ]}
              />
            ) : null}
            {summary.want > 0 ? (
              <View
                style={[
                  styles.splitPart,
                  { flex: summary.want, backgroundColor: colors.pink },
                ]}
              />
            ) : null}
            {untagged > 0 ? (
              <View
                style={[
                  styles.splitPart,
                  { flex: untagged, backgroundColor: colors.yellow },
                ]}
              />
            ) : null}
          </View>
          <View style={styles.legend}>
            <NeoText variant="small">{`BUTUH ${needPercent ?? 0}%`}</NeoText>
            <NeoText variant="small">{`MAU ${wantPercent}%`}</NeoText>
          </View>
        </NeoCard>
      ) : null}

      {summary.expense > 0 && topCategories.length > 0 ? (
        <NeoCard innerStyle={styles.categoryChart}>
          <View style={styles.rowBetween}>
            <NeoText variant="label">KE MANA UANGNYA</NeoText>
            <NeoButton
              label="DETAIL"
              compact
              offset={3}
              onPress={() => router.push("/statistik")}
              accessibilityLabel="Lihat statistik lengkap"
            />
          </View>
          {topCategories.map((row) => {
            const total = Number(row.total);
            const share = percentOf(total, summary.expense) ?? 0;
            return (
              <View key={row.categoryId} style={styles.categoryRow}>
                <View style={styles.categoryLine}>
                  <Text style={styles.categoryEmoji}>{row.icon ?? "•"}</Text>
                  <NeoText
                    variant="body"
                    numberOfLines={1}
                    style={styles.categoryName}
                  >
                    {row.name}
                  </NeoText>
                  <NeoText variant="mono" numberOfLines={1}>
                    {rp(total)}
                  </NeoText>
                </View>
                <NeoProgress
                  value={total / summary.expense}
                  color={categoryColor(row.color)}
                  height={10}
                  accessibilityLabel={`Porsi ${row.name}`}
                />
                <NeoText variant="small" color="#11111199">
                  {`${share}% dari pengeluaran`}
                </NeoText>
              </View>
            );
          })}
        </NeoCard>
      ) : null}

      {goals.length > 0 ? (
        <NeoCard innerStyle={styles.goalCard}>
          <View style={styles.rowBetween}>
            <NeoText variant="label">TARGET TABUNGAN</NeoText>
            <NeoButton
              label="SEMUA"
              compact
              offset={3}
              onPress={() => router.push("/target")}
              accessibilityLabel="Lihat semua target tabungan"
            />
          </View>
          {goals.slice(0, 2).map((goal) => {
            const percent = goalProgressPercent(
              goal.savedAmount,
              goal.targetAmount,
            );
            return (
              <View key={goal.id} style={styles.goalRow}>
                <View style={styles.rowBetween}>
                  <NeoText
                    variant="body"
                    numberOfLines={1}
                    style={styles.goalName}
                  >
                    {goal.name}
                  </NeoText>
                  <NeoText variant="label">{`${percent}%`}</NeoText>
                </View>
                <NeoProgress
                  value={goal.savedAmount / goal.targetAmount}
                  color={categoryColor(goal.color)}
                  height={10}
                  accessibilityLabel={`Progres ${goal.name}`}
                />
                <NeoText variant="small" color="#11111199">
                  {`${rp(goal.savedAmount)} dari ${rp(goal.targetAmount)}`}
                </NeoText>
              </View>
            );
          })}
        </NeoCard>
      ) : null}

      <NeoCard innerStyle={styles.tertibCard}>
        <View style={styles.rowBetween}>
          <NeoText variant="label">TERTIB</NeoText>
          <NeoButton
            label={currentWeekStamped ? "LIHAT" : "STEMPEL"}
            compact
            offset={3}
            onPress={() => router.push("/tertib")}
            accessibilityLabel={
              currentWeekStamped
                ? "Lihat stempel minggu ini"
                : "Tutup minggu ini"
            }
          />
        </View>
        <View style={styles.tertibBody}>
          <View style={styles.tertibText}>
            <NeoText variant="subtitle">
              {streak > 0
                ? `${streak} MINGGU`
                : checkins.length > 0
                  ? "MULAI"
                  : "BELUM ADA"}
            </NeoText>
            <NeoText variant="small">
              {streak > 0
                ? "BERUNTUN"
                : checkins.length > 0
                  ? "LAGI"
                  : "STEMPEL"}
            </NeoText>
          </View>
          <View style={styles.stampRow}>
            {Array.from({ length: STAMP_CARD_SIZE }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.miniStamp,
                  index < stamps && styles.miniStampFilled,
                ]}>
                {index < stamps ? (
                  <NeoText variant="label">✓</NeoText>
                ) : null}
              </View>
            ))}
          </View>
        </View>
        <NeoText variant="small" color="#11111199">
          {currentWeekStamped
            ? "Minggu ini sudah ditutup."
            : "Tutup minggu ini untuk menambah stempel."}
        </NeoText>
      </NeoCard>

      <View style={styles.sectionHeader}>
        <NeoText variant="label">TRANSAKSI TERAKHIR</NeoText>
        <NeoButton
          label="SEMUA"
          compact
          offset={3}
          onPress={() => router.push("/transaksi")}
          accessibilityLabel="Lihat semua transaksi"
        />
      </View>

      {recent.length === 0 ? (
        <NeoEmpty
          title="BELUM ADA CATATAN"
          message="Periode ini masih kosong. Catat pengeluaran pertama supaya angka di atas punya arti."
          actionLabel="CATAT TRANSAKSI"
          onAction={() => router.push("/tambah")}
        />
      ) : (
        <NeoCard padded={false}>
          {recent.map((item, index) => (
            <RecentRow
              key={item.id}
              item={item}
              divider={index > 0}
              onPress={() =>
                router.push({
                  pathname: "/tambah",
                  params: { id: String(item.id) },
                })
              }
            />
          ))}
        </NeoCard>
      )}
    </NeoScreen>
  );
}

function statusMessage(level: StatusLevel, pace: number): string {
  if (level === "boros") return "Budget periode ini sudah lewat.";
  if (level === "hati-hati")
    return "Belanja lebih cepat dari hari yang berjalan.";
  if (pace > 1) return "Belanja hampir sama cepat dengan hari yang berjalan.";
  return "Belanja lebih lambat dari hari yang berjalan.";
}

function RecentRow({
  item,
  divider,
  onPress,
}: {
  item: TransactionListItem;
  divider: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.categoryName}, ${rp(item.amount)}, ${dayLabel(item.date)}`}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.recentRow,
        divider && styles.divider,
        pressed && styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.recentIcon,
          { backgroundColor: categoryColor(item.categoryColor) },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.recentEmoji}>{item.categoryIcon ?? "•"}</Text>
      </View>
      <View style={styles.recentBody}>
        <NeoText variant="body" numberOfLines={1}>
          {item.note ?? item.categoryName}
        </NeoText>
        <NeoText variant="label" color="#11111199">
          {item.type === "income" ? "MASUK" : "KELUAR"}
        </NeoText>
      </View>
      <NeoText variant="mono" numberOfLines={1}>
        {`${item.type === "income" ? "+" : "-"}${rp(item.amount).replace("Rp ", "")}`}
      </NeoText>
      {focused ? (
        <View pointerEvents="none" style={styles.rowFocusRing} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  budgetCard: { gap: spacing.sm },
  balanceCard: { gap: spacing.xs },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  statusPill: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  bigAmount: { fontSize: 32, lineHeight: 38 },
  warning: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    padding: spacing.md,
    gap: 2,
  },
  warningList: { gap: spacing.sm },
  twoColumns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1 },
  tile: { gap: spacing.xs, padding: spacing.md },
  tileAmount: { fontSize: 15 },
  allowance: { gap: spacing.xs },
  wantCard: { gap: spacing.sm },
  splitBar: {
    flexDirection: "row",
    height: 20,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  splitPart: { height: "100%" },
  legend: { flexDirection: "row", justifyContent: "space-between" },
  categoryChart: { gap: spacing.md },
  goalCard: { gap: spacing.md },
  goalRow: { gap: spacing.xs },
  goalName: { flex: 1 },
  categoryRow: { gap: spacing.xs },
  categoryLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  categoryEmoji: { fontSize: 16 },
  categoryName: { flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  divider: { borderTopWidth: 2, borderTopColor: colors.ink },
  rowPressed: { backgroundColor: "#FFF0C9" },
  rowFocusRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: borderTokens.width,
    borderColor: colors.blue,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  recentEmoji: { fontSize: 18 },
  recentBody: { flex: 1, gap: 2 },
  tertibCard: { gap: spacing.sm },
  tertibBody: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tertibText: { flex: 1, gap: 2 },
  stampRow: { flexDirection: "row", gap: 4 },
  miniStamp: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStampFilled: { backgroundColor: colors.green },
});
