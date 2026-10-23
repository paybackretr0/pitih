import { addDays, parseISO } from "date-fns";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoProgress } from "@/components/neo/neo-progress";
import { NeoScreen } from "@/components/neo/neo-screen";
import { NeoEmpty, NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoText } from "@/components/neo/neo-text";
import { PeriodNavigator } from "@/components/period-navigator";
import { ScreenHeader } from "@/components/screen-header";
import { listGoals } from "@/db/goals";
import {
  getCategoryBudgets,
  getCategoryTotals,
  getDailyExpenses,
  getPeriodSummary,
  getTopExpenses,
  getTotalBudget,
} from "@/db/queries";
import type { Goal } from "@/db/schema";
import {
  goalDaysLeft,
  goalRemaining,
  goalTotals,
  isGoalReached,
  type GoalTotals,
} from "@/features/goals/goals";
import { useDbQuery } from "@/hooks/use-db-query";
import { useToday } from "@/hooks/use-today";
import { dayLabel, isoDay, percentOf, rp, shortDate } from "@/lib/format";
import {
  currentPeriod,
  daysLeft,
  isPeriodCurrent,
  periodAtIndex,
  shiftPeriod,
} from "@/lib/period";
import { dailyAllowance } from "@/lib/status";
import { useAppStore } from "@/store/app-store";
import {
  border as borderTokens,
  categoryColor,
  colors,
  spacing,
} from "@/theme";

export default function StatistikScreen() {
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

  const stats = useDbQuery(async () => {
    if (!period) throw new Error("Tanggal mulai periode belum diatur.");
    const previousPeriod = shiftPeriod(period, -1);
    const [
      summary,
      categoryTotals,
      daily,
      budgets,
      top,
      previous,
      totalBudget,
      goals,
    ] = await Promise.all([
      getPeriodSummary(period),
      getCategoryTotals(period),
      getDailyExpenses(period),
      getCategoryBudgets(period.index),
      getTopExpenses(period),
      getPeriodSummary(previousPeriod),
      getTotalBudget(period.index),
      listGoals(),
    ]);
    return {
      summary,
      categoryTotals,
      daily,
      budgets,
      top,
      previous,
      totalBudget,
      goals,
    };
  }, [period?.start, period?.end, period?.index]);

  if (!period) return <NeoLoading label="MENYIAPKAN PERIODE" />;
  if (stats.loading && !stats.data) return <NeoLoading />;
  if (stats.error || !stats.data) {
    return (
      <NeoScreen>
        <ScreenHeader title="STATISTIK" />
        <NeoError
          message={stats.error ?? "Data tidak tersedia."}
          onRetry={stats.retry}
        />
      </NeoScreen>
    );
  }

  const {
    summary,
    categoryTotals,
    daily,
    budgets,
    top,
    previous,
    totalBudget,
    goals,
  } = stats.data;
  const left = daysLeft(period, today);
  const allowance = isPeriodCurrent(period, today)
    ? dailyAllowance(totalBudget, summary.expense, left)
    : null;
  const dailyMap = new Map(daily.map((row) => [row.date, Number(row.total)]));
  const days = Array.from({ length: 30 }, (_, index) =>
    isoDay(addDays(parseISO(period.start), index)),
  );
  const peak = Math.max(...daily.map((row) => Number(row.total)), 0);
  const maxDay = Math.max(peak, allowance ?? 0, 1);
  const previousDelta =
    previous.expense > 0
      ? Math.round(
          ((summary.expense - previous.expense) / previous.expense) * 100,
        )
      : null;
  const wantPercent = percentOf(summary.want, summary.expense);
  const needPercent = percentOf(summary.need, summary.expense);
  const untagged = summary.expense - summary.need - summary.want;
  const totals = goalTotals(goals);
  const nextDeadline = nextGoalDeadline(goals, today);

  return (
    <NeoScreen>
      <ScreenHeader
        title="STATISTIK"
        subtitle={`${shortDate(period.start)} - ${shortDate(period.end)}`}
      />
      <PeriodNavigator
        period={period}
        today={today}
        onShift={(delta) =>
          setViewIndex((current) => (current ?? basePeriod?.index ?? 0) + delta)
        }
      />

      {summary.expense === 0 ? (
        <NeoEmpty
          title="BELUM ADA PENGELUARAN"
          message="Statistik muncul setelah ada pengeluaran yang dicatat di periode ini."
          actionLabel="CATAT PENGELUARAN"
          onAction={() => router.push("/tambah")}
        />
      ) : (
        <>
          <NeoCard innerStyle={styles.stack}>
            <View style={styles.rowBetween}>
              <NeoText variant="label">KEBUTUHAN VS KEINGINAN</NeoText>
              <NeoText variant="label">{`${wantPercent ?? 0}% MAU`}</NeoText>
            </View>
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
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.green }]} />
                <NeoText variant="small">{`BUTUH ${needPercent ?? 0}%`}</NeoText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.pink }]} />
                <NeoText variant="small">{`MAU ${wantPercent ?? 0}%`}</NeoText>
              </View>
            </View>
            <View style={styles.amountsGrid}>
              <AmountLine label="BUTUH" value={rp(summary.need)} />
              <AmountLine label="MAU" value={rp(summary.want)} />
            </View>
          </NeoCard>

          <NeoCard innerStyle={styles.stack}>
            <NeoText variant="label">PENGELUARAN PER KATEGORI</NeoText>
            {categoryTotals.map((row) => {
              const total = Number(row.total);
              const share = percentOf(total, summary.expense) ?? 0;
              const categoryBudget = budgets[row.categoryId];
              const budgetUsed = categoryBudget
                ? Math.round((total / categoryBudget) * 100)
                : null;
              return (
                <View key={row.categoryId} style={styles.categoryRow}>
                  <View style={styles.categoryTop}>
                    <View style={styles.categoryName}>
                      <Text style={styles.emoji}>{row.icon ?? "•"}</Text>
                      <NeoText
                        variant="body"
                        numberOfLines={1}
                        style={styles.flex}
                      >
                        {row.name}
                      </NeoText>
                    </View>
                    <NeoText variant="mono" numberOfLines={1}>
                      {rp(total)}
                    </NeoText>
                  </View>
                  <NeoProgress
                    value={total / summary.expense}
                    color={categoryColor(row.color)}
                    height={12}
                    accessibilityLabel={`Porsi ${row.name}`}
                  />
                  <View style={styles.categoryMeta}>
                    <NeoText variant="small" color="#11111199">
                      {`${share}% dari pengeluaran`}
                    </NeoText>
                    {budgetUsed !== null ? (
                      budgetUsed >= 80 ? (
                        <View
                          style={[
                            styles.budgetFlag,
                            {
                              backgroundColor:
                                budgetUsed >= 100 ? colors.red : colors.orange,
                            },
                          ]}
                        >
                          <NeoText variant="small">{`${budgetUsed}% DARI BUDGET`}</NeoText>
                        </View>
                      ) : (
                        <NeoText variant="small" color="#11111199">
                          {`${budgetUsed}% dari budget`}
                        </NeoText>
                      )
                    ) : null}
                  </View>
                </View>
              );
            })}
          </NeoCard>

          <NeoCard innerStyle={styles.stack}>
            <View style={styles.rowBetween}>
              <NeoText variant="label">PENGELUARAN HARIAN</NeoText>
              <NeoText variant="label" color="#11111199">
                {`TERTINGGI ${rp(peak)}`}
              </NeoText>
            </View>
            <View style={styles.chartFrame}>
              <View style={styles.chartBars}>
                {days.map((day) => {
                  const total = dailyMap.get(day) ?? 0;
                  const ratio = total / maxDay;
                  const over = allowance !== null && total > allowance;
                  return (
                    <View
                      key={day}
                      accessible
                      accessibilityLabel={`${dayLabel(day)}, ${rp(total)}`}
                      style={styles.barColumn}
                    >
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(ratio * 100, total > 0 ? 3 : 0)}%`,
                            backgroundColor: over ? colors.red : colors.blue,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              {allowance !== null && allowance > 0 ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.allowanceLine,
                    { bottom: `${(allowance / maxDay) * 100}%` },
                  ]}
                >
                  <NeoText variant="label">JATAH HARIAN</NeoText>
                </View>
              ) : null}
            </View>
            <View style={styles.chartAxis}>
              <NeoText variant="small">{shortDate(period.start)}</NeoText>
              <NeoText variant="small">{shortDate(period.end)}</NeoText>
            </View>
          </NeoCard>

          <NeoCard innerStyle={styles.stack}>
            <NeoText variant="label">PERBANDINGAN PERIODE LALU</NeoText>
            {previousDelta === null ? (
              <NeoText variant="small">
                Belum ada pengeluaran di periode sebelumnya, jadi perbandingan
                belum bisa dihitung.
              </NeoText>
            ) : (
              <>
                <NeoText variant="subtitle">
                  {`Pengeluaran ${Math.abs(previousDelta)}% lebih ${previousDelta >= 0 ? "tinggi" : "rendah"} dari periode lalu.`}
                </NeoText>
                <View style={styles.compareRow}>
                  <AmountLine
                    label="PERIODE LALU"
                    value={rp(previous.expense)}
                  />
                  <AmountLine label="PERIODE INI" value={rp(summary.expense)} />
                </View>
              </>
            )}
          </NeoCard>

          <NeoCard innerStyle={styles.stack}>
            <NeoText variant="label">TOP 5 PENGELUARAN</NeoText>
            {top.map((row, index) => (
              <View key={row.id} style={styles.topRow}>
                <View style={styles.rank}>
                  <NeoText variant="label">{index + 1}</NeoText>
                </View>
                <View style={styles.flex}>
                  <NeoText variant="body" numberOfLines={1}>
                    {row.note ?? row.categoryName}
                  </NeoText>
                  <NeoText variant="small" color="#11111199">
                    {`${row.categoryName}, ${dayLabel(row.date)}`}
                  </NeoText>
                </View>
                <NeoText variant="mono" numberOfLines={1}>
                  {rp(row.amount)}
                </NeoText>
              </View>
            ))}
          </NeoCard>
        </>
      )}

      <NeoCard innerStyle={styles.stack}>
        <View style={styles.rowBetween}>
          <NeoText variant="label">TARGET TABUNGAN</NeoText>
          <NeoButton
            label={goals.length > 0 ? "KELOLA" : "BUAT"}
            compact
            offset={3}
            onPress={() => router.push("/target")}
            accessibilityLabel={
              goals.length > 0
                ? "Kelola target tabungan"
                : "Buat target tabungan"
            }
          />
        </View>

        {goals.length === 0 ? (
          <>
            <NeoText variant="subtitle">BELUM ADA TARGET</NeoText>
            <NeoText variant="small">
              Mulai satu target, misalnya dana darurat. Uang yang disisihkan di
              target tidak mengubah saldo transaksi.
            </NeoText>
          </>
        ) : (
          <>
            <NeoText variant="amount" numberOfLines={1}>
              {rp(totals.totalSaved)}
            </NeoText>
            <NeoText variant="small">{`dari ${rp(totals.totalTarget)}`}</NeoText>
            <NeoProgress
              value={
                totals.totalTarget > 0
                  ? totals.totalSaved / totals.totalTarget
                  : 0
              }
              color={
                totals.reachedCount === totals.count
                  ? colors.green
                  : colors.purple
              }
              accessibilityLabel="Progres semua target tabungan"
            />
            <View style={styles.rowBetween}>
              <NeoText variant="label">{`${totals.percent}% TERKUMPUL`}</NeoText>
              {totals.totalRemaining > 0 ? (
                <NeoText variant="label" color="#11111199">
                  {`SISA ${rp(totals.totalRemaining)}`}
                </NeoText>
              ) : (
                <NeoText variant="label">SEMUA TERCAPAI</NeoText>
              )}
            </View>
            <NeoText variant="small">{goalCountText(totals)}</NeoText>
            {nextDeadline ? (
              <NeoText variant="small" color="#11111199">
                {`${deadlineCopy(nextDeadline.goal.name, nextDeadline.days)} Kurang ${rp(
                  goalRemaining(
                    nextDeadline.goal.savedAmount,
                    nextDeadline.goal.targetAmount,
                  ),
                )}.`}
              </NeoText>
            ) : null}
          </>
        )}
      </NeoCard>
    </NeoScreen>
  );
}

function goalCountText(totals: GoalTotals): string {
  if (totals.reachedCount === totals.count) {
    return `Semua ${totals.count} target sudah tercapai.`;
  }
  if (totals.reachedCount > 0) {
    return `${totals.count} target aktif, ${totals.reachedCount} sudah tercapai.`;
  }
  return `${totals.count} target aktif.`;
}

function nextGoalDeadline(
  goals: Goal[],
  today: string,
): { goal: Goal; days: number } | null {
  let next: { goal: Goal; days: number } | null = null;
  for (const goal of goals) {
    if (isGoalReached(goal.savedAmount, goal.targetAmount)) continue;
    const days = goalDaysLeft(goal.deadline, today);
    if (days === null) continue;
    if (!next || days < next.days) next = { goal, days };
  }
  return next;
}

function deadlineCopy(name: string, days: number): string {
  if (days < 0) return `Tenggara lewat: ${name}, ${Math.abs(days)} hari lalu.`;
  if (days === 0) return `Tenggara hari ini: ${name}.`;
  return `Tenggara terdekat: ${name}, ${days} hari lagi.`;
}

function AmountLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.amountLine}>
      <NeoText variant="label" color="#11111199">
        {label}
      </NeoText>
      <NeoText variant="mono" numberOfLines={1}>
        {value}
      </NeoText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  splitBar: {
    flexDirection: "row",
    height: 22,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  splitPart: { height: "100%" },
  legendRow: { flexDirection: "row", gap: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 12, height: 12, borderWidth: 2, borderColor: colors.ink },
  amountsGrid: { flexDirection: "row", gap: spacing.lg },
  amountLine: { flex: 1, gap: 2 },
  categoryRow: { gap: spacing.xs, marginTop: spacing.sm },
  categoryTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  categoryName: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  emoji: { fontSize: 16 },
  flex: { flex: 1 },
  categoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  budgetFlag: {
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.xs,
  },
  chartFrame: {
    height: 150,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  chartBars: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  barColumn: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%" },
  allowanceLine: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    alignItems: "flex-end",
  },
  chartAxis: { flexDirection: "row", justifyContent: "space-between" },
  compareRow: { flexDirection: "row", gap: spacing.lg },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rank: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
});
