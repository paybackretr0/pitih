import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DateField } from "@/components/date-field";
import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard } from "@/components/neo/neo-card";
import { NeoChip } from "@/components/neo/neo-chip";
import { NeoInput } from "@/components/neo/neo-input";
import { NeoSegmented } from "@/components/neo/neo-segmented";
import { NeoEmpty, NeoError, NeoLoading } from "@/components/neo/neo-states";
import { NeoSurface } from "@/components/neo/neo-surface";
import { NeoText } from "@/components/neo/neo-text";
import { listCategories } from "@/db/queries";
import {
  createRecurringRule,
  deleteRecurringRule,
  listRecurringRules,
  processRecurring,
  setRecurringActive,
  updateRecurringRule,
  type RecurringListItem,
} from "@/db/recurring";
import type { NeedWant, TransactionType } from "@/db/schema";
import {
  nextRecurringDate,
  recurringDayLabel,
} from "@/features/recurring/recurring";
import { useDbQuery } from "@/hooks/use-db-query";
import { useToday } from "@/hooks/use-today";
import { dayLabel, dayLabelFull, rp, todayISO } from "@/lib/format";
import { bumpData } from "@/store/app-store";
import {
  border as borderTokens,
  categoryColor,
  colors,
  layout,
  spacing,
} from "@/theme";

const TYPE_OPTIONS: { value: TransactionType; label: string; bg: string }[] = [
  { value: "expense", label: "PENGELUARAN", bg: colors.pink },
  { value: "income", label: "PEMASUKAN", bg: colors.green },
];

const NEED_WANT_OPTIONS: { value: NeedWant; label: string; bg: string }[] = [
  { value: "need", label: "KEBUTUHAN", bg: colors.green },
  { value: "want", label: "KEINGINAN", bg: colors.pink },
];

function onlyDigits(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 12);
}

export default function BerulangScreen() {
  const today = useToday();
  const query = useDbQuery(async () => {
    const [categories, rules] = await Promise.all([
      listCategories(undefined, false),
      listRecurringRules(),
    ]);
    return { categories, rules };
  }, []);

  const [type, setType] = useState<TransactionType>("expense");
  const [amountInput, setAmountInput] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [needWant, setNeedWant] = useState<NeedWant>("need");
  const [dayInput, setDayInput] = useState("1");
  const [startDate, setStartDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<RecurringListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resetForm = () => {
    setEditing(null);
    setAmountInput("");
    setCategoryId(null);
    setNeedWant("need");
    setDayInput("1");
    setStartDate(todayISO());
    setNote("");
    setError(null);
  };

  const beginEdit = (rule: RecurringListItem) => {
    setEditing(rule);
    setType(rule.type);
    setAmountInput(String(rule.amount));
    setCategoryId(rule.categoryId);
    setNeedWant(rule.needWant ?? "need");
    setDayInput(String(rule.dayOfMonth));
    setStartDate(rule.startDate);
    setNote(rule.note ?? "");
    setError(null);
    setNotice(null);
  };

  const categories = query.data?.categories ?? [];
  const rules = query.data?.rules ?? [];
  const categoryOptions = categories.filter(
    (category) =>
      category.type === type &&
      (!category.isArchived || category.id === categoryId),
  );
  const activeRules = rules.filter((rule) => rule.isActive);
  const pausedRules = rules.filter((rule) => !rule.isActive);

  const save = async () => {
    const amount = Number(amountInput || 0);
    const dayOfMonth = Number(dayInput || 0);
    if (amount <= 0) {
      setError("Nominal belum diisi.");
      return;
    }
    if (!categoryId) {
      setError("Pilih kategori dulu.");
      return;
    }
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      setError("Tanggal harus antara 1 dan 31.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        type,
        amount,
        categoryId,
        note: note.trim() ? note.trim() : null,
        needWant: type === "expense" ? needWant : null,
        dayOfMonth,
        startDate,
      };
      if (editing) {
        await updateRecurringRule(editing.id, payload, todayISO());
        setNotice("Jadwal diperbarui.");
      } else {
        await createRecurringRule(payload);
        await processRecurring(todayISO());
        setNotice("Jadwal dibuat. Transaksi muncul saat tanggalnya tiba.");
      }
      bumpData();
      resetForm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan jadwal.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: RecurringListItem) => {
    try {
      await setRecurringActive(rule.id, !rule.isActive, todayISO());
      if (!rule.isActive) await processRecurring(todayISO());
      bumpData();
      setNotice(rule.isActive ? "Jadwal dijeda." : "Jadwal aktif lagi.");
    } catch (caught) {
      Alert.alert(
        "Gagal mengubah jadwal",
        caught instanceof Error ? caught.message : "Coba lagi sebentar.",
      );
    }
  };

  const remove = (rule: RecurringListItem) => {
    Alert.alert(
      "Hapus jadwal?",
      "Transaksi yang sudah tercatat tetap ada. Jadwal berhenti membuat transaksi baru.",
      [
        { text: "BATAL", style: "cancel" },
        {
          text: "HAPUS",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteRecurringRule(rule.id);
                bumpData();
                if (editing?.id === rule.id) resetForm();
                setNotice("Jadwal dihapus.");
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

  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
    setNeedWant("need");
    setError(null);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <NeoText variant="display">BERULANG</NeoText>
          <NeoButton
            label="X"
            compact
            offset={3}
            onPress={() => router.back()}
            accessibilityLabel="Tutup transaksi berulang"
          />
        </View>

        <NeoCard innerStyle={styles.form}>
          <NeoText variant="label">
            {editing ? "UBAH JADWAL" : "JADWAL BARU"}
          </NeoText>
          <NeoText variant="small">
            Transaksi dibuat otomatis tiap bulan, termasuk yang terlewat saat
            aplikasi lama tidak dibuka.
          </NeoText>

          <NeoSegmented
            options={TYPE_OPTIONS}
            value={type}
            onChange={changeType}
            accessibilityLabel="Jenis transaksi berulang"
          />

          <NeoInput
            label="NOMINAL (RUPIAH)"
            value={amountInput}
            onChangeText={(value) => setAmountInput(onlyDigits(value))}
            keyboardType="number-pad"
            placeholder="0"
          />
          <NeoText variant="small" color="#11111199">
            {amountInput ? rp(Number(amountInput)) : "Belum diisi"}
          </NeoText>

          <View style={styles.section}>
            <NeoText variant="label">KATEGORI</NeoText>
            {categoryOptions.length === 0 ? (
              <NeoText variant="small">
                Belum ada kategori untuk jenis ini. Tambah dulu lewat
                Pengaturan.
              </NeoText>
            ) : (
              <View style={styles.chips}>
                {categoryOptions.map((category) => (
                  <NeoChip
                    key={category.id}
                    label={category.name}
                    leading={category.icon ?? undefined}
                    bg={categoryColor(category.color)}
                    selected={categoryId === category.id}
                    onPress={() => {
                      setCategoryId(category.id);
                      setError(null);
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {type === "expense" ? (
            <View style={styles.section}>
              <NeoText variant="label">UNTUK</NeoText>
              <NeoSegmented
                options={NEED_WANT_OPTIONS}
                value={needWant}
                onChange={setNeedWant}
                accessibilityLabel="Tag kebutuhan atau keinginan"
              />
            </View>
          ) : null}

          <NeoInput
            label="TANGGAL TIAP BULAN"
            value={dayInput}
            onChangeText={(value) => setDayInput(onlyDigits(value).slice(0, 2))}
            keyboardType="number-pad"
            placeholder="1 sampai 31"
          />
          <NeoText variant="small">
            Kalau tanggalnya tidak ada di bulan itu, dipakai hari terakhir
            bulan.
          </NeoText>

          <DateField
            label="MULAI DARI"
            value={startDate}
            displayValue={dayLabelFull(startDate)}
            onChange={setStartDate}
            accessibilityHint="Buka pemilih tanggal mulai"
          />

          <NeoInput
            label="CATATAN (OPSIONAL)"
            value={note}
            onChangeText={setNote}
            placeholder="Misal: Netflix"
            maxLength={120}
          />

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
            label={
              saving
                ? "MENYIMPAN..."
                : editing
                  ? "SIMPAN PERUBAHAN"
                  : "BUAT JADWAL"
            }
            onPress={() => void save()}
            disabled={saving}
          />

          {editing ? (
            <View style={styles.editActions}>
              <NeoButton label="BATAL" compact onPress={resetForm} />
              <NeoButton
                label="HAPUS JADWAL"
                compact
                bg={colors.red}
                onPress={() => remove(editing)}
              />
            </View>
          ) : null}
        </NeoCard>

        {query.loading && !query.data ? <NeoLoading /> : null}
        {query.error ? (
          <NeoError message={query.error} onRetry={query.retry} />
        ) : null}

        {query.data && rules.length === 0 ? (
          <NeoEmpty
            title="BELUM ADA JADWAL"
            message="Langganan dan cicilan bisa dicatat sekali di sini, lalu muncul sendiri tiap bulan."
          />
        ) : null}

        {activeRules.length > 0 ? (
          <View style={styles.section}>
            <NeoText variant="label">JADWAL AKTIF</NeoText>
            {activeRules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                today={today}
                onEdit={beginEdit}
                onToggle={() => void toggle(rule)}
              />
            ))}
          </View>
        ) : null}

        {pausedRules.length > 0 ? (
          <View style={styles.section}>
            <NeoText variant="label">DIJEDA</NeoText>
            {pausedRules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                today={today}
                onEdit={beginEdit}
                onToggle={() => void toggle(rule)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function RuleRow({
  rule,
  today,
  onEdit,
  onToggle,
}: {
  rule: RecurringListItem;
  today: string;
  onEdit: (rule: RecurringListItem) => void;
  onToggle: () => void;
}) {
  const next = nextRecurringDate(rule, today);

  return (
    <NeoSurface
      innerStyle={styles.rule}
      bg={rule.isActive ? colors.white : "#F2EADA"}
    >
      <View style={styles.ruleTop}>
        <View
          style={[
            styles.ruleIcon,
            { backgroundColor: categoryColor(rule.categoryColor) },
          ]}
        >
          <Text style={styles.ruleEmoji}>{rule.categoryIcon ?? "•"}</Text>
        </View>
        <View style={styles.ruleBody}>
          <NeoText variant="body" numberOfLines={1}>
            {rule.note ?? rule.categoryName}
          </NeoText>
          <NeoText variant="label">
            {`${rp(rule.amount)} - ${recurringDayLabel(rule.dayOfMonth)}`}
          </NeoText>
          <NeoText variant="small" color="#11111199">
            {next ? `BERIKUTNYA ${dayLabel(next)}` : "DIJEDA"}
          </NeoText>
        </View>
      </View>
      <View style={styles.ruleActions}>
        <NeoButton
          label="UBAH"
          compact
          offset={2}
          onPress={() => onEdit(rule)}
          accessibilityLabel={`Ubah jadwal ${rule.note ?? rule.categoryName}`}
        />
        <NeoButton
          label={rule.isActive ? "MATIKAN" : "AKTIFKAN"}
          compact
          offset={2}
          bg={rule.isActive ? colors.white : colors.green}
          onPress={onToggle}
          accessibilityLabel={`${rule.isActive ? "Matikan" : "Aktifkan"} jadwal ${rule.note ?? rule.categoryName}`}
        />
      </View>
    </NeoSurface>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  form: { gap: spacing.md },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rule: { gap: spacing.sm, padding: spacing.md },
  ruleTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ruleIcon: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleEmoji: { fontSize: 20 },
  ruleBody: { flex: 1, gap: 2 },
  ruleActions: { flexDirection: "row", gap: spacing.sm },
});
