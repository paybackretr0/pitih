import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoScreen } from "@/components/neo/neo-screen";
import { NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoSurface } from "@/components/neo/neo-surface";
import { NeoText } from "@/components/neo/neo-text";
import { ScreenHeader } from "@/components/screen-header";
import { createCheckin, listCheckins } from "@/db/checkins";
import { listGoals } from "@/db/goals";
import { getLoggedDays, getPeriodSummary, getTotalBudget } from "@/db/queries";
import type { CheckinStatus } from "@/db/schema";
import { isGoalReached } from "@/features/goals/goals";
import {
  cardNumber,
  currentStreak,
  isWeekStamped,
  stampsInCard,
  tertibBadges,
  weekEndFor,
  weekStartFor,
  STAMP_CARD_SIZE,
  type TertibBadge,
} from "@/features/tertib/tertib";
import { useDbQuery } from "@/hooks/use-db-query";
import { useToday } from "@/hooks/use-today";
import { rp, shortDate } from "@/lib/format";
import { currentPeriod, daysLeft } from "@/lib/period";
import { budgetStatus, statusLabel } from "@/lib/status";
import { bumpData, useAppStore } from "@/store/app-store";
import {
  border as borderTokens,
  colors,
  layout,
  spacing,
} from "@/theme";

const statusColors: Record<CheckinStatus, string> = {
  aman: colors.green,
  "hati-hati": colors.orange,
  boros: colors.red,
};

function badgeColor(badge: TertibBadge): string {
  if (!badge.earned) return "#F2EADA";
  if (badge.key === "first") return colors.green;
  if (badge.key === "four") return colors.yellow;
  return colors.pink;
}

export default function TertibScreen() {
  const today = useToday();
  const periodStart = useAppStore((state) => state.periodStart);
  const weekStart = weekStartFor(today);
  const weekEnd = weekEndFor(weekStart);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useDbQuery(
    async () => {
      if (!periodStart) throw new Error("Tanggal mulai periode belum diatur.");
      const period = currentPeriod(periodStart, today);
      const [checkins, goals, week, daysLogged, periodSummary, budget] =
        await Promise.all([
          listCheckins(),
          listGoals(),
          getPeriodSummary({ start: weekStart, end: weekEnd }),
          getLoggedDays({ start: weekStart, end: weekEnd }),
          getPeriodSummary(period),
          getTotalBudget(period.index),
        ]);
      const status = budgetStatus(
        periodSummary.expense,
        budget,
        daysLeft(period, today),
      );
      return { checkins, goals, week, daysLogged, status };
    },
    [periodStart, today, weekStart, weekEnd],
  );

  const stamp = async () => {
    if (!query.data || saving || isWeekStamped(query.data.checkins, weekStart)) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createCheckin({
        weekStart,
        expense: query.data.week.expense,
        income: query.data.week.income,
        daysLogged: query.data.daysLogged,
        status: query.data.status?.level ?? null,
      });
      bumpData();
      setNotice("Stempel minggu ini tersimpan.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan stempel.",
      );
    } finally {
      setSaving(false);
    }
  };

  const close = (
    <NeoButton
      label="X"
      compact
      offset={3}
      onPress={() => router.back()}
      accessibilityLabel="Tutup layar tertib"
    />
  );

  if (query.loading && !query.data) {
    return (
      <NeoScreen>
        <ScreenHeader title="TERTIB" right={close} />
        <NeoLoading label="MENYIAPKAN STEMPEL" />
      </NeoScreen>
    );
  }

  if (query.error || !query.data) {
    return (
      <NeoScreen>
        <ScreenHeader title="TERTIB" right={close} />
        <NeoError
          message={query.error ?? "Data tertib tidak tersedia."}
          onRetry={query.retry}
        />
      </NeoScreen>
    );
  }

  const { checkins, goals, week, daysLogged, status } = query.data;
  const stamped = isWeekStamped(checkins, weekStart);
  const saved = checkins.find((checkin) => checkin.weekStart === weekStart);
  const expense = saved?.expense ?? week.expense;
  const income = saved?.income ?? week.income;
  const loggedDays = saved?.daysLogged ?? daysLogged;
  const level = saved?.status ?? status?.level ?? null;
  const total = checkins.length;
  const stamps = stampsInCard(total);
  const card = cardNumber(total);
  const streak = currentStreak(checkins, today);
  const goalReached = goals.some((goal) =>
    isGoalReached(goal.savedAmount, goal.targetAmount),
  );
  const badges = tertibBadges(total, goalReached);

  const streakTitle =
    streak > 0
      ? `${streak} MINGGU BERUNTUN`
      : total > 0
        ? "MULAI LAGI"
        : "BELUM ADA STEMPEL";
  const streakBody =
    streak > 0
      ? `Total ${total} minggu tercatat.`
      : total > 0
        ? "Tutup minggu ini untuk mulai beruntun lagi."
        : "Stempel pertama menunggu minggu ini.";

  return (
    <NeoScreen>
      <ScreenHeader
        title="TERTIB"
        subtitle="SATU MINGGU SATU STEMPEL"
        right={close}
      />

      <NeoText variant="small">
        Tutup minggu dengan melihat angkanya, lalu cap satu stempel. Minggu
        dihitung Senin sampai Minggu. Stempel tidak mengubah transaksi.
      </NeoText>

      <NeoCard bg={colors.yellow} innerStyle={styles.stampCard}>
        <View style={styles.rowBetween}>
          <NeoText variant="label">{`KARTU ${card}`}</NeoText>
          <NeoText variant="label">{`${stamps}/${STAMP_CARD_SIZE} STEMPEL`}</NeoText>
        </View>
        <View style={styles.stampRow}>
          {Array.from({ length: STAMP_CARD_SIZE }, (_, index) => {
            const filled = index < stamps;
            return (
              <View
                key={index}
                accessible
                accessibilityLabel={`Stempel ${index + 1}${filled ? " terisi" : " kosong"}`}
                style={[styles.stamp, filled && styles.stampFilled]}>
                {filled ? (
                  <NeoText variant="title" style={styles.stampMark}>
                    ✓
                  </NeoText>
                ) : null}
              </View>
            );
          })}
        </View>
        <NeoText variant="subtitle">{streakTitle}</NeoText>
        <NeoText variant="small">{streakBody}</NeoText>
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <View style={styles.rowBetween}>
          <NeoText variant="label">MINGGU INI</NeoText>
          <NeoText variant="label" color="#11111199">
            {`${shortDate(weekStart)} - ${shortDate(weekEnd)}`}
          </NeoText>
        </View>

        <View style={styles.amounts}>
          <AmountLine label="KELUAR" value={rp(expense)} />
          <AmountLine label="MASUK" value={rp(income)} />
        </View>

        <View style={[styles.rowBetween, styles.wrap]}>
          <NeoText variant="label">{`${loggedDays}/7 HARI TERCATAT`}</NeoText>
          {level ? (
            <View
              style={[styles.statusChip, { backgroundColor: statusColors[level] }]}>
              <NeoText variant="label">{`BUDGET ${statusLabel[level]}`}</NeoText>
            </View>
          ) : (
            <NeoText variant="small" color="#11111199">
              BUDGET BELUM DIATUR
            </NeoText>
          )}
        </View>

        {week.expense === 0 && week.income === 0 ? (
          <NeoText variant="small">
            Belum ada transaksi minggu ini. Kalau memang tidak ada, minggu tetap
            bisa ditutup.
          </NeoText>
        ) : null}

        {stamped ? (
          <View style={styles.doneBox}>
            <NeoText variant="label">SUDAH DISTEMPEL MINGGU INI</NeoText>
            <NeoText variant="small">
              Angka di atas adalah rekaman saat stempel dibuat.
            </NeoText>
          </View>
        ) : (
          <NeoButton
            label={saving ? "MENYIMPAN..." : "STEMPEL MINGGU INI"}
            disabled={saving}
            onPress={() => void stamp()}
          />
        )}

        {error ? (
          <View style={styles.errorBox}>
            <NeoText variant="small">{error}</NeoText>
          </View>
        ) : null}
        {notice && !stamped ? (
          <View style={styles.noticeBox}>
            <NeoText variant="small">{notice}</NeoText>
          </View>
        ) : null}
      </NeoCard>

      <View style={styles.section}>
        <NeoText variant="label">BADGE</NeoText>
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <NeoSurface
              key={badge.key}
              offset={3}
              bg={badgeColor(badge)}
              style={styles.badgeColumn}
              innerStyle={styles.badge}>
              <NeoText variant="title">{badge.mark}</NeoText>
              <NeoText variant="label" style={styles.badgeLabel}>
                {badge.label}
              </NeoText>
              <NeoText variant="small" color="#11111199">
                {badge.earned ? "TERBUKA" : badge.detail}
              </NeoText>
            </NeoSurface>
          ))}
        </View>
      </View>
    </NeoScreen>
  );
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
  stampCard: { gap: spacing.sm },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  wrap: { flexWrap: "wrap" },
  stampRow: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.xs },
  stamp: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stampFilled: { backgroundColor: colors.green },
  stampMark: { lineHeight: 28 },
  stack: { gap: spacing.sm },
  amounts: { flexDirection: "row", gap: spacing.lg },
  amountLine: { flex: 1, gap: 2 },
  statusChip: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  doneBox: {
    gap: spacing.xs,
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.green,
    padding: spacing.md,
  },
  errorBox: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    padding: spacing.md,
  },
  noticeBox: {
    borderWidth: borderTokens.width,
    borderColor: colors.ink,
    backgroundColor: colors.blue,
    padding: spacing.md,
  },
  section: { gap: spacing.sm },
  badgeRow: { flexDirection: "row", gap: spacing.sm },
  badgeColumn: { flex: 1, minWidth: 0 },
  badge: {
    minHeight: layout.minTapTarget + 64,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  badgeLabel: { textAlign: "center", lineHeight: 14 },
});
