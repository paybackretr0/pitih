import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { DateField } from "@/components/date-field";
import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoInput } from "@/components/neo/neo-input";
import { NeoScreen } from "@/components/neo/neo-screen";
import { NeoSegmented } from "@/components/neo/neo-segmented";
import { NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoText } from "@/components/neo/neo-text";
import { ScreenHeader } from "@/components/screen-header";
import { TimeField } from "@/components/time-field";
import { replaceBackupPayload } from "@/db/backup";
import {
  getBudgets,
  listCategories,
  resetAllData,
  setCategoryBudget,
  setTotalBudget,
  type BudgetSet,
} from "@/db/queries";
import type { Category } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import {
  deleteSetting,
  getPeriodStart,
  getSetting,
  setSetting,
  SETTING_KEYS,
} from "@/db/settings";
import type { ParsedBackup } from "@/features/backup/backup-format";
import {
  exportBackupJson,
  exportTransactionsCsv,
  pickBackupJson,
} from "@/features/backup/backup-service";
import { clearReceipts } from "@/features/receipts/receipts";
import {
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
  parseReminderTime,
} from "@/features/reminder/reminder";
import {
  cancelReminder,
  scheduleDailyReminder,
} from "@/features/reminder/reminder-service";
import { useDbQuery } from "@/hooks/use-db-query";
import { useToday } from "@/hooks/use-today";
import { dayLabelFull, rp, shortDateWithYear, todayISO } from "@/lib/format";
import {
  currentPeriod,
  daysLeft,
  periodAtIndex,
  type Period,
} from "@/lib/period";
import { bumpData, useAppStore } from "@/store/app-store";
import { border as borderTokens, colors, spacing } from "@/theme";

function onlyDigits(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 12);
}

type BudgetMode = "default" | "period";

const BUDGET_MODES: { value: BudgetMode; label: string; bg?: string }[] = [
  { value: "default", label: "SEMUA PERIODE", bg: colors.yellow },
  { value: "period", label: "PERIODE INI", bg: colors.blue },
];

function budgetInputs(
  categories: Category[],
  values: Record<number, number>,
): Record<number, string> {
  const next: Record<number, string> = {};
  for (const category of categories) {
    const value = values[category.id];
    next[category.id] = value ? String(value) : "";
  }
  return next;
}

type SettingsData = {
  categories: Category[];
  budgetDefaults: BudgetSet;
  budgetOverrides: BudgetSet;
  reminder: {
    time: string;
    enabled: boolean;
    notificationId: string | null;
  };
};

export default function PengaturanScreen() {
  const today = useToday();
  const periodStart = useAppStore((state) => state.periodStart);

  const period = useMemo(() => {
    if (!periodStart) return null;
    const base = currentPeriod(periodStart, today);
    return periodAtIndex(periodStart, base.index);
  }, [periodStart, today]);

  const settingsQ = useDbQuery(async () => {
    if (!period) throw new Error("Tanggal mulai periode belum diatur.");
    const [
      categories,
      budgetDefaults,
      budgetOverrides,
      reminderTime,
      reminderEnabled,
      notificationId,
    ] = await Promise.all([
      listCategories("expense"),
      getBudgets(null),
      getBudgets(period.index),
      getSetting(SETTING_KEYS.reminderTime),
      getSetting(SETTING_KEYS.reminderEnabled),
      getSetting(SETTING_KEYS.reminderNotificationId),
    ]);
    const clock = parseReminderTime(reminderTime);
    return {
      categories,
      budgetDefaults,
      budgetOverrides,
      reminder: {
        time: clock ? formatReminderTime(clock) : DEFAULT_REMINDER_TIME,
        enabled: reminderEnabled === "true",
        notificationId,
      },
    };
  }, [period?.index]);

  if (!period) return <NeoLoading label="MENYIAPKAN PERIODE" />;
  if (settingsQ.loading && !settingsQ.data) return <NeoLoading />;
  if (settingsQ.error || !settingsQ.data) {
    return (
      <NeoScreen>
        <ScreenHeader title="PENGATURAN" />
        <NeoError
          message={settingsQ.error ?? "Data tidak tersedia."}
          onRetry={settingsQ.retry}
        />
      </NeoScreen>
    );
  }

  return (
    <SettingsContent data={settingsQ.data} period={period} today={today} />
  );
}

function SettingsContent({
  data,
  period,
  today,
}: {
  data: SettingsData;
  period: Period;
  today: string;
}) {
  const setPeriodStart = useAppStore((state) => state.setPeriodStart);

  const [budgetMode, setBudgetMode] = useState<BudgetMode>("default");
  const [budgetInput, setBudgetInput] = useState(
    data.budgetDefaults.total ? String(data.budgetDefaults.total) : "",
  );
  const [categoryInputs, setCategoryInputs] = useState<Record<number, string>>(
    () => budgetInputs(data.categories, data.budgetDefaults.categories),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState(data.reminder.time);
  const [reminderEnabled, setReminderEnabled] = useState(data.reminder.enabled);
  const [reminderId, setReminderId] = useState(data.reminder.notificationId);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState<
    "json" | "csv" | "restore" | null
  >(null);

  const saveBudget = async () => {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const periodIndex = budgetMode === "period" ? period.index : null;
      const total = Number(budgetInput || 0);
      await setTotalBudget(total > 0 ? total : null, periodIndex);
      for (const category of data.categories) {
        const value = Number(categoryInputs[category.id] || 0);
        await setCategoryBudget(
          category.id,
          value > 0 ? value : null,
          periodIndex,
        );
      }
      bumpData();
      setNotice(
        budgetMode === "period"
          ? "Budget periode ini disimpan."
          : "Budget default disimpan.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan budget.",
      );
    } finally {
      setSaving(false);
    }
  };

  const switchBudgetMode = (next: BudgetMode) => {
    setBudgetMode(next);
    const source =
      next === "default" ? data.budgetDefaults : data.budgetOverrides;
    setBudgetInput(source.total ? String(source.total) : "");
    setCategoryInputs(budgetInputs(data.categories, source.categories));
    setError(null);
    setNotice(null);
  };

  const applyStartDate = async (iso: string) => {
    try {
      await setSetting(SETTING_KEYS.periodStart, iso);
      setPeriodStart(iso);
      setNotice("Tanggal mulai periode diperbarui.");
      bumpData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Gagal mengubah tanggal mulai.",
      );
    }
  };

  const changeStartDate = (iso: string) => {
    if (iso === period.startDate) return;
    Alert.alert(
      "Ubah tanggal mulai?",
      "Semua periode dihitung ulang dari tanggal ini. Riwayat transaksi ikut bergeser ke periode baru.",
      [
        { text: "BATAL", style: "cancel" },
        { text: "UBAH", onPress: () => void applyStartDate(iso) },
      ],
    );
  };

  const reminderClock = parseReminderTime(reminderTime) ?? {
    hour: 20,
    minute: 0,
  };

  const changeReminderTime = async (hour: number, minute: number) => {
    const value = formatReminderTime({ hour, minute });
    setReminderTime(value);
    setReminderError(null);
    setReminderNotice(null);
    try {
      await setSetting(SETTING_KEYS.reminderTime, value);
      if (reminderEnabled) {
        await cancelReminder(reminderId);
        const id = await scheduleDailyReminder(hour, minute);
        if (!id) {
          await setSetting(SETTING_KEYS.reminderEnabled, "false");
          await deleteSetting(SETTING_KEYS.reminderNotificationId);
          setReminderEnabled(false);
          setReminderId(null);
          setReminderError("Izin notifikasi ditolak. Pengingat dimatikan.");
        } else {
          await setSetting(SETTING_KEYS.reminderNotificationId, id);
          setReminderId(id);
          setReminderNotice(`Pengingat pindah ke jam ${value}.`);
        }
      } else {
        setReminderNotice(`Jam pengingat disimpan: ${value}.`);
      }
      bumpData();
    } catch (caught) {
      setReminderError(
        caught instanceof Error
          ? caught.message
          : "Gagal mengubah jam pengingat.",
      );
    }
  };

  const toggleReminder = async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderError(null);
    setReminderNotice(null);
    try {
      if (reminderEnabled) {
        await cancelReminder(reminderId);
        await setSetting(SETTING_KEYS.reminderEnabled, "false");
        await deleteSetting(SETTING_KEYS.reminderNotificationId);
        setReminderEnabled(false);
        setReminderId(null);
        setReminderNotice("Pengingat harian dimatikan.");
      } else {
        const id = await scheduleDailyReminder(
          reminderClock.hour,
          reminderClock.minute,
        );
        if (!id) {
          setReminderError(
            "Izin notifikasi ditolak. Aktifkan lewat pengaturan sistem.",
          );
          return;
        }
        await setSetting(SETTING_KEYS.reminderTime, reminderTime);
        await setSetting(SETTING_KEYS.reminderEnabled, "true");
        await setSetting(SETTING_KEYS.reminderNotificationId, id);
        setReminderEnabled(true);
        setReminderId(id);
        setReminderNotice(`Pengingat aktif tiap hari jam ${reminderTime}.`);
      }
      bumpData();
    } catch (caught) {
      await setSetting(SETTING_KEYS.reminderEnabled, "false").catch(
        () => undefined,
      );
      setReminderEnabled(false);
      setReminderId(null);
      setReminderError(
        caught instanceof Error ? caught.message : "Gagal mengatur pengingat.",
      );
    } finally {
      setReminderBusy(false);
    }
  };

  const backupJson = async () => {
    if (backupBusy) return;
    setBackupBusy("json");
    setError(null);
    setNotice(null);
    try {
      await exportBackupJson();
      setNotice(
        "File backup dibuat. Simpan ke Google Drive atau kirim ke diri sendiri.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal membuat backup.",
      );
    } finally {
      setBackupBusy(null);
    }
  };

  const exportCsv = async () => {
    if (backupBusy) return;
    setBackupBusy("csv");
    setError(null);
    setNotice(null);
    try {
      await exportTransactionsCsv();
      setNotice("File CSV dibuat. Bisa dibuka di Excel atau Google Sheets.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat CSV.");
    } finally {
      setBackupBusy(null);
    }
  };

  const applyRestore = async (picked: ParsedBackup) => {
    setBackupBusy("restore");
    try {
      await cancelReminder(reminderId);
      await replaceBackupPayload(picked.payload);
      await seedDatabase();

      const restored = new Map(
        picked.payload.settings.map((item) => [item.key, item.value]),
      );
      const clock = parseReminderTime(
        restored.get(SETTING_KEYS.reminderTime) ?? null,
      ) ?? {
        hour: 20,
        minute: 0,
      };
      let nextReminderId: string | null = null;
      let nextReminderEnabled = false;
      if (restored.get(SETTING_KEYS.reminderEnabled) === "true") {
        nextReminderId = await scheduleDailyReminder(
          clock.hour,
          clock.minute,
        ).catch(() => null);
        nextReminderEnabled = nextReminderId !== null;
        if (nextReminderId) {
          await setSetting(SETTING_KEYS.reminderNotificationId, nextReminderId);
        } else {
          await setSetting(SETTING_KEYS.reminderEnabled, "false");
          await deleteSetting(SETTING_KEYS.reminderNotificationId);
        }
      }

      const totalBudget = picked.payload.budgets.find(
        (budget) => budget.categoryId === null && budget.periodIndex === null,
      );
      const nextBudgets: Record<number, string> = {};
      for (const category of picked.payload.categories) {
        if (category.type !== "expense" || category.isArchived) continue;
        const budget = picked.payload.budgets.find(
          (row) => row.categoryId === category.id && row.periodIndex === null,
        );
        nextBudgets[category.id] = budget ? String(budget.amount) : "";
      }

      setReminderTime(formatReminderTime(clock));
      setReminderEnabled(nextReminderEnabled);
      setReminderId(nextReminderId);
      setBudgetMode("default");
      setBudgetInput(totalBudget ? String(totalBudget.amount) : "");
      setCategoryInputs(nextBudgets);
      setNotice(
        "Backup dipulihkan. Semua angka di layar ini ikut dimuat ulang.",
      );

      const start = await getPeriodStart();
      setPeriodStart(start ?? todayISO());
      bumpData();
      Alert.alert(
        "Data dipulihkan",
        `${picked.counts.transactions} transaksi dan ${picked.counts.checkins} stempel dimuat. Periode dihitung ulang dari tanggal mulai di backup.`,
      );
    } catch (caught) {
      Alert.alert(
        "Gagal memulihkan",
        caught instanceof Error ? caught.message : "Coba lagi sebentar.",
      );
    } finally {
      setBackupBusy(null);
    }
  };

  const restore = async () => {
    if (backupBusy) return;
    setBackupBusy("restore");
    setError(null);
    setNotice(null);
    try {
      const picked = await pickBackupJson();
      if (!picked) return;
      Alert.alert(
        "Pulihkan dari backup?",
        `${picked.counts.transactions} transaksi, ${picked.counts.categories} kategori, ${picked.counts.recurring} jadwal berulang, ${picked.counts.goals} target, dan ${picked.counts.checkins} stempel akan mengganti semua data sekarang.`,

        [
          { text: "BATAL", style: "cancel" },
          {
            text: "PULIHKAN",
            style: "destructive",
            onPress: () => void applyRestore(picked),
          },
        ],
      );
    } catch (caught) {
      Alert.alert(
        "File tidak bisa dipakai",
        caught instanceof Error ? caught.message : "Backup tidak dikenali.",
      );
    } finally {
      setBackupBusy(null);
    }
  };

  const wipe = () => {
    Alert.alert(
      "Hapus semua data?",
      "Semua transaksi, budget, kategori, target, jadwal, dan stempel tertib akan dihapus permanen. Data tidak bisa dikembalikan.",
      [
        { text: "BATAL", style: "cancel" },
        {
          text: "HAPUS SEMUA",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await resetAllData();
                clearReceipts();
                await seedDatabase();
                const start = await getPeriodStart();
                setPeriodStart(start ?? todayISO());
                setBudgetMode("default");
                setBudgetInput("");
                setCategoryInputs({});
                bumpData();
                Alert.alert(
                  "Data dihapus",
                  "Aplikasi kembali ke kondisi awal.",
                );
              } catch (caught) {
                Alert.alert(
                  "Gagal menghapus",
                  caught instanceof Error
                    ? caught.message
                    : "Coba lagi sebentar.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const left = daysLeft(period, today);

  return (
    <NeoScreen>
      <ScreenHeader title="PENGATURAN" subtitle="SEMUA DATA DI HP INI" />

      <NeoCard innerStyle={styles.stack}>
        <NeoText variant="label">PERIODE 30 HARI</NeoText>
        <View style={styles.rowBetween}>
          <NeoText variant="subtitle">
            {`${shortDateWithYear(period.start)} - ${shortDateWithYear(period.end)}`}
          </NeoText>
          <NeoText variant="label">{`SISA ${left} HARI`}</NeoText>
        </View>
        <DateField
          label="TANGGAL MULAI"
          value={period.startDate}
          displayValue={dayLabelFull(period.startDate)}
          onChange={changeStartDate}
          maximumDate={new Date()}
        />
        <NeoText variant="small">
          Tanggal mulai menentukan siklus 30 hari. Mengubahnya akan menggeser
          riwayat periode.
        </NeoText>
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <NeoText variant="label">BUDGET PERIODE</NeoText>
        <NeoSegmented
          options={BUDGET_MODES}
          value={budgetMode}
          onChange={switchBudgetMode}
          accessibilityLabel="Budget berlaku untuk"
        />
        <NeoText variant="small">
          {budgetMode === "default"
            ? "Budget default dipakai di semua periode yang tidak punya budget khusus."
            : `Budget khusus ${shortDateWithYear(period.start)} - ${shortDateWithYear(period.end)}. Kosongkan input untuk ikut budget default.`}
        </NeoText>
        <NeoText variant="small">
          Budget total dipakai untuk status dan jatah harian. Budget kategori
          hanya mengingatkan pemakaian per kategori.
        </NeoText>
        <NeoInput
          label="BUDGET TOTAL (RUPIAH)"
          value={budgetInput}
          onChangeText={(value) => setBudgetInput(onlyDigits(value))}
          keyboardType="number-pad"
          placeholder={
            budgetMode === "period" && data.budgetDefaults.total
              ? `Ikut default: ${rp(data.budgetDefaults.total)}`
              : "0"
          }
        />
        <NeoText variant="small" color="#11111199">
          {budgetInput
            ? rp(Number(budgetInput))
            : budgetMode === "period" && data.budgetDefaults.total
              ? `Ikut default: ${rp(data.budgetDefaults.total)}`
              : "Belum diatur"}
        </NeoText>

        <NeoText variant="label">BUDGET PER KATEGORI</NeoText>
        {data.categories.map((category) => (
          <NeoInput
            key={category.id}
            label={`${category.icon ?? ""} ${category.name}`.trim()}
            value={categoryInputs[category.id] ?? ""}
            onChangeText={(value) =>
              setCategoryInputs((current) => ({
                ...current,
                [category.id]: onlyDigits(value),
              }))
            }
            keyboardType="number-pad"
            placeholder={
              budgetMode === "period" &&
              data.budgetDefaults.categories[category.id]
                ? `Ikut default: ${rp(data.budgetDefaults.categories[category.id])}`
                : "Tanpa budget"
            }
          />
        ))}

        {error ? (
          <View style={styles.errorBox}>
            <NeoText variant="small">{error}</NeoText>
          </View>
        ) : null}
        {notice ? (
          <View style={styles.noticeBox}>
            <NeoText variant="small">{notice}</NeoText>
          </View>
        ) : null}

        <NeoButton
          label={saving ? "MENYIMPAN..." : "SIMPAN BUDGET"}
          onPress={saveBudget}
          disabled={saving}
        />
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <NeoText variant="label">KATEGORI</NeoText>
        <NeoText variant="small">
          Tambah, ubah nama, ganti ikon dan warna, atau arsipkan kategori.
        </NeoText>
        <NeoButton
          label="KELOLA KATEGORI"
          onPress={() => router.push("/kategori")}
        />
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <NeoText variant="label">OTOMATIS & TARGET</NeoText>
        <NeoText variant="small">
          Catat langganan dan cicilan tanpa input ulang, lalu sisihkan dana
          untuk target yang mau dikejar.
        </NeoText>
        <NeoButton
          label="TRANSAKSI BERULANG"
          onPress={() => router.push("/berulang")}
        />
        <NeoButton
          label="TARGET TABUNGAN"
          bg={colors.purple}
          onPress={() => router.push("/target")}
        />
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <View style={styles.rowBetween}>
          <NeoText variant="label">PENGINGAT HARIAN</NeoText>
          <View
            style={[
              styles.statePill,
              {
                backgroundColor: reminderEnabled ? colors.green : colors.white,
              },
            ]}
          >
            <NeoText variant="label">
              {reminderEnabled ? "AKTIF" : "MATI"}
            </NeoText>
          </View>
        </View>
        <NeoText variant="small">
          Satu notifikasi lokal tiap hari. Tidak butuh internet dan tidak
          dikirim ke mana pun.
        </NeoText>
        <TimeField
          label="JAM PENGINGAT"
          hour={reminderClock.hour}
          minute={reminderClock.minute}
          onChange={(hour, minute) => void changeReminderTime(hour, minute)}
        />
        <NeoButton
          label={
            reminderBusy
              ? "MENYIAPKAN..."
              : reminderEnabled
                ? "MATIKAN PENGINGAT"
                : "AKTIFKAN PENGINGAT"
          }
          bg={reminderEnabled ? colors.red : colors.yellow}
          disabled={reminderBusy}
          onPress={() => void toggleReminder()}
        />
        {reminderError ? (
          <View style={styles.errorBox}>
            <NeoText variant="small">{reminderError}</NeoText>
          </View>
        ) : null}
        {reminderNotice ? (
          <View style={styles.noticeBox}>
            <NeoText variant="small">{reminderNotice}</NeoText>
          </View>
        ) : null}
        <NeoText variant="small">
          Di Android 13 ke atas, izin notifikasi muncul saat pengingat pertama
          kali diaktifkan.
        </NeoText>
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <NeoText variant="label">BACKUP</NeoText>
        <NeoText variant="small">
          Data cuma ada di HP ini. Simpan file JSON ke Google Drive atau kirim
          ke diri sendiri supaya tidak hilang saat ganti HP.
        </NeoText>
        <NeoButton
          label={backupBusy === "json" ? "MENYIAPKAN..." : "BACKUP JSON"}
          disabled={backupBusy !== null}
          onPress={() => void backupJson()}
        />
        <NeoButton
          label={backupBusy === "csv" ? "MENYIAPKAN..." : "EXPORT CSV"}
          bg={colors.blue}
          disabled={backupBusy !== null}
          onPress={() => void exportCsv()}
        />
        <NeoButton
          label={
            backupBusy === "restore" ? "MEMBACA FILE..." : "PULIHKAN DARI JSON"
          }
          bg={colors.white}
          disabled={backupBusy !== null}
          onPress={() => void restore()}
        />
        <NeoText variant="small">
          Memulihkan backup mengganti semua transaksi, kategori, budget, jadwal
          berulang, target, stempel tertib, dan pengaturan yang ada sekarang.
          Foto struk tidak ikut file JSON, jadi simpan fotonya terpisah.
        </NeoText>
      </NeoCard>

      <NeoCard innerStyle={styles.stack}>
        <NeoText variant="label">DATA</NeoText>
        <NeoText variant="small">
          Data hanya tersimpan di HP ini. Tidak ada akun, tidak ada server, dan
          tidak ada sinkronisasi otomatis.
        </NeoText>
        <NeoButton label="HAPUS SEMUA DATA" bg={colors.red} onPress={wipe} />
      </NeoCard>

      <NeoText variant="small" color="#11111199">
        PITIH, kas per 30 hari.
      </NeoText>
    </NeoScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
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
    backgroundColor: colors.green,
    padding: spacing.md,
  },
  statePill: {
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
